document.addEventListener("DOMContentLoaded", () => {
  // Music autoplay with muted workaround for mobile browsers
  const music = document.getElementById("bg-music");
  music.volume = 0.2; // soft volume
  const playMusic = () => {
    music.play().catch(() => {
      // Autoplay prevented, wait for user interaction
      document.body.addEventListener("click", () => music.play());
    });
  };
  playMusic();

  // Background gradients/images array
  const backgrounds = [
    "linear-gradient(135deg, #0a1a3f, #0f0e17)",
    "linear-gradient(135deg, #7c3aed, #3ee8fa)",
    "linear-gradient(135deg, #120a54, #7c3aed)",
    "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80')",
    "url('https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1920&q=80')",
    "url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=80')"
  ];

  let bgIndex = 0;
  const container = document.querySelector(".container");
  const changeBgBtn = document.getElementById("change-bg-btn");

  // Change background function
  changeBgBtn.addEventListener("click", () => {
    bgIndex++;
    if (bgIndex >= backgrounds.length) bgIndex = 0;
    container.style.background = backgrounds[bgIndex];
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
    container.style.backgroundRepeat = 'no-repeat';
    if (backgrounds[bgIndex].startsWith("linear-gradient")) {
      container.style.backdropFilter = 'blur(16px) saturate(180%)';
      container.style.webkitBackdropFilter = 'blur(16px) saturate(180%)';
      container.style.backgroundColor = 'rgba(10, 26, 63, 0.35)';
    } else {
      container.style.backdropFilter = 'none';
      container.style.webkitBackdropFilter = 'none';
      container.style.backgroundColor = 'transparent';
    }
  });

  // Copy number feature with feedback
  const copyButtons = document.querySelectorAll(".copy-btn");

  copyButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const number = btn.getAttribute("data-number");
      navigator.clipboard.writeText(number).then(() => {
        const feedback = btn.nextElementSibling;
        feedback.textContent = "Copied!";
        feedback.style.opacity = "1";
        btn.classList.add("copied");

        setTimeout(() => {
          feedback.style.opacity = "0";
          btn.classList.remove("copied");
          feedback.textContent = "";
        }, 1500);
      }).catch(() => {
        alert("Gagal menyalin nomor. Silakan coba lagi.");
      });
    });
  });
});
