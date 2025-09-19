require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const Party = require("./models/party");
const moment = require("moment");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "supersecret";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// static files
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// connect to mongo
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("Mongo connection error:", err.message);
    process.exit(1);
  });

// ===== Automatic Cleanup (removes past parties) =====
async function removeExpiredParties() {
  const now = new Date();
  await Party.deleteMany({ dateTime: { $lt: now } });
  console.log("✅ Expired parties removed");
}

// run once at startup and again every hour
removeExpiredParties();
setInterval(removeExpiredParties, 60 * 60 * 1000);

// ===== Routes =====

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

// Predefined genres
const GENRES = [
  "Marvel",
  "DC",
  "Anime",
  "Action",
  "Horror",
  "Comedy",
  "Thriller",
  "Romance",
  "Science Fiction",
  "Fantasy",
  "Adventure",
  "Drama",
  "Crime",
  "Documentary",
  "Sitcom",
];

// Homepage
app.get("/", async (req, res) => {
  try {
    const now = new Date();
    const upcoming = await Party.find({ dateTime: { $gte: now } })
      .sort({ dateTime: 1 })
      .limit(6)
      .lean();

    upcoming.forEach((p) => {
      p.displayDate = moment(p.dateTime).format("MMM D, YYYY · h:mm A");
    });

    res.render("index", { genres: GENRES, upcoming });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Genre page
app.get("/genre/:name", async (req, res) => {
  try {
    const genre = req.params.name;
    if (!GENRES.includes(genre)) return res.status(404).send("Genre not found");

    const now = new Date();
    const parties = await Party.find({ genre, dateTime: { $gte: now } })
      .sort({ dateTime: 1 })
      .lean();

    parties.forEach((p) => {
      p.displayDate = moment(p.dateTime).format("MMM D, YYYY · h:mm A");
    });

    res.render("genre", { genre, parties, genres: GENRES });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Host a party
app.post("/host", async (req, res) => {
  try {
    const { title, genre, room, seatsInfo, dateTime, snacks } = req.body;

    if (!title || !genre || !room || !dateTime) {
      return res.status(400).send("Missing required fields");
    }
    if (!GENRES.includes(genre)) {
      return res.status(400).send("Invalid genre");
    }

    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).send("Invalid date/time");
    }

    // Fetch poster from OMDb
    let posterUrl = "/posters/default.jpg";
    if (process.env.OMDB_API_KEY) {
      try {
        const omdbRes = await axios.get(
          `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${
            process.env.OMDB_API_KEY
          }`
        );
        if (
          omdbRes.data &&
          omdbRes.data.Poster &&
          omdbRes.data.Poster !== "N/A"
        ) {
          posterUrl = omdbRes.data.Poster;
        }
      } catch (err) {
        console.error("Poster fetch failed:", err.message);
      }
    }

    const party = new Party({
      title,
      genre,
      room,
      seatsInfo: seatsInfo || "",
      snacks: snacks || "",
      dateTime: parsedDate,
      poster: posterUrl,
      expiresAt: parsedDate,
    });

    await party.save();
    res.redirect("/genre/" + encodeURIComponent(genre));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// API endpoint for AJAX
app.get("/api/upcoming", async (req, res) => {
  try {
    const now = new Date();
    const parties = await Party.find({ dateTime: { $gte: now } })
      .sort({ dateTime: 1 })
      .lean();
    res.json(parties);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ===== Admin Routes =====
function checkAdmin(req, res, next) {
  if (req.query.key === ADMIN_SECRET) next();
  else res.status(401).json({ error: "Unauthorized" });
}

// Serve admin page securely
app.get("/admin", checkAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// API: Get all parties
app.get("/api/admin/parties", checkAdmin, async (req, res) => {
  const parties = await Party.find().sort({ dateTime: 1 });
  res.json(parties);
});

// API: Delete a party
app.delete("/api/admin/parties/:id", checkAdmin, async (req, res) => {
  await Party.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// API: Update a party
app.put("/api/admin/parties/:id", checkAdmin, async (req, res) => {
  const updated = await Party.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
