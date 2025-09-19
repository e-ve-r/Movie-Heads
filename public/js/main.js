// Ensure images fallback quickly if they fail or take too long
document.querySelectorAll('.party-card img').forEach(img => {
  img.addEventListener('error', () => {
    img.src = '/Assets/default_movie.jpg';
  });

  // Timeout fallback (5 sec)
  const timeout = setTimeout(() => {
    if (!img.complete || img.naturalWidth === 0) {
      img.src = '/Assets/default_movie.jpg';
    }
  }, 5000);

  img.addEventListener('load', () => clearTimeout(timeout));
});

// Modal logic
const modal = document.getElementById('hostPartyModal');
const openModalBtn = document.getElementById('openHostModal');
const closeModalBtn = modal.querySelector('.close-btn');

openModalBtn.addEventListener('click', () => {
  modal.style.display = 'block';
});

closeModalBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});
