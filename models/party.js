const mongoose = require("mongoose");

const PartySchema = new mongoose.Schema({
  title: { type: String, required: true },
  genre: { type: String, required: true },
  room: { type: String, required: true },
  seatsInfo: { type: String },
  snacks: { type: String },
  dateTime: { type: Date, required: true },
  poster: { type: String }, // poster URL (optional)
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

PartySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Party", PartySchema);
