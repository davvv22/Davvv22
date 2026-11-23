'use strict';

/* ================= PERSONALIZE HERE =================
   Change the recipient name and message lines below.
   You can also edit them from the website's settings panel.
====================================================== */
const CONFIG = {
  recipientName: 'someone special',
  messages: [
    "you're my favorite part of every universe.",
    "if the world gave me another chance, i'd still be glad to know you.",
    "you are someone i'll always be grateful to have met."
  ],
  photoPath: './public/assets/photo.jpg',
  // Optional: put a music file at ./public/assets/music.mp3 and set this to that path.
  musicPath: ''
};

const $ = (selector) => document.querySelector(selector);
const intro = $('#intro');
const reveal = $('#reveal');
const ending = $('#ending');
const particleCanvas = $('#particleCanvas');
const particleCtx = particleCanvas.getContext('2d', { alpha: true });
const endingPhoto = $('#endingPhoto');
const progressBar = $('#progressBar');
const progressText = $('#progressText');
const stageHint = $('#stageHint');
const missingPhoto = $('#missingPhoto');
const settingsPanel = $('#settingsPanel');
const music = $('#backgroundMusic');

let sourceImage = new Image();
let customPhotoUrl = '';
let customMusicUrl = '';
let particles = [];
let animationFrame = 0;
let animationStartedAt = 0;
let animationDuration = 7200;
let animationRunning = false;
let revealTimeouts = [];
let ambientFrame = 0;
let ambientStars = [];
let soundEnabled = false;
let activeScene = 'intro';
let sceneResizeObserver;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function showScene(sceneName) {
  activeScene = sceneName;
  [intro, reveal, ending].forEach((scene) => {
    const isActive = scene.id === sceneName;
    scene.classList.toggle('active', isActive);
    scene.setAttribute('aria-hidden', String(!isActive));
  });
}

function setPhotoSource(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      sourceImage = image;
      endingPhoto.src = src;
      missingPhoto.hidden = true;
      resolve(image);
    };
    image.onerror = reject;
    image.src = src;
  });
}

function fitImageToCanvas(image, canvas, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: Math.max(1, Math.round(image.width * ratio)), height: Math.max(1, Math.round(image.height * ratio)) };
}

function getCanvasSize() {
  const rect = particleCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  particleCanvas.width = Math.round(width * dpr);
  particleCanvas.height = Math.round(height * dpr);
  particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height, dpr };
}

function makeHeartPath(ctx, x, y, size) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(x, y + s * .35);
  ctx.bezierCurveTo(x - s * .8, y - s * .1, x - s * .55, y - s * .75, x, y - s * .3);
  ctx.bezierCurveTo(x + s * .55, y - s * .75, x + s * .8, y - s * .1, x, y + s * .35);
  ctx.closePath();
}

function buildParticles() {
  const { width, height } = getCanvasSize();
  if (!sourceImage.complete || !sourceImage.naturalWidth) return false;
  const isSmall = width < 620;
  const maxPhotoWidth = Math.min(width * .95, isSmall ? 540 : 850);
  const maxPhotoHeight = height * .96;
  const fitted = fitImageToCanvas(sourceImage, particleCanvas, maxPhotoWidth, maxPhotoHeight);
  const offsetX = (width - fitted.width) / 2;
  const offsetY = (height - fitted.height) / 2;

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = fitted.width;
  sampleCanvas.height = fitted.height;
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  sampleCtx.drawImage(sourceImage, 0, 0, fitted.width, fitted.height);
  const pixels = sampleCtx.getImageData(0, 0, fitted.width, fitted.height).data;
  const step = isSmall ? 3 : 2.5;
  const next = [];

  for (let y = 0; y < fitted.height; y += step) {
    for (let x = 0; x < fitted.width; x += step) {
      const px = Math.floor(x);
      const py = Math.floor(y);
      const index = (py * fitted.width + px) * 4;
      const alpha = pixels[index + 3] / 255;
      if (alpha < .12) continue;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const brightness = (red + green + blue) / 3;
      const color = `rgba(${red},${green},${blue},${Math.max(.45, alpha)})`;
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.max(width, height) * (.45 + Math.random() * .72);
      const startX = width / 2 + Math.cos(angle) * distance + (Math.random() - .5) * width * .7;
      const startY = height / 2 + Math.sin(angle) * distance + (Math.random() - .5) * height * .7;
      next.push({
        x: startX, y: startY,
        startX, startY,
        targetX: offsetX + x,
        targetY: offsetY + y,
        color,
        size: (isSmall ? .72 : .9) + Math.random() * (isSmall ? .5 : .75),
        delay: Math.random() * .34,
        drift: (Math.random() - .5) * 16,
        phase: Math.random() * Math.PI * 2,
        brightness
      });
    }
  }

  // Keep the canvas responsive while retaining enough samples for facial detail.
  const particleLimit = isSmall ? 11500 : 19000;
  if (next.length > particleLimit) {
    const stride = next.length / particleLimit;
    particles = Array.from({ length: particleLimit }, (_, i) => next[Math.floor(i * stride)]);
  } else {
    particles = next;
  }
  return particles.length > 0;
}

function drawParticles(progress, time) {
  const rect = particleCanvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  particleCtx.clearRect(0, 0, width, height);
  particleCtx.save();
  particleCtx.globalCompositeOperation = 'lighter';

  let formed = 0;
  for (const p of particles) {
    const local = clamp((progress - p.delay) / (1 - p.delay), 0, 1);
    if (local > .995) formed++;
    if (local <= 0) continue;
    const eased = easeOutCubic(local);
    const settle = 1 - eased;
    const wobble = Math.sin(time * .0015 + p.phase) * 1.6 * settle;
    const x = p.startX + (p.targetX - p.startX) * eased + p.drift * Math.sin(local * Math.PI) + wobble;
    const y = p.startY + (p.targetY - p.startY) * eased + p.drift * .45 * Math.sin(local * Math.PI) + Math.cos(time * .0014 + p.phase) * settle;
    const alpha = clamp(local * 1.8, 0, 1);
    const size = p.size * (.72 + eased * .28);
    particleCtx.globalAlpha = alpha;
    particleCtx.fillStyle = p.color;
    makeHeartPath(particleCtx, x, y, size);
    particleCtx.fill();
    if (local < .78 && size > 1.1) {
      particleCtx.globalAlpha = alpha * .14;
      particleCtx.fillStyle = '#f5a8c2';
      makeHeartPath(particleCtx, x - (p.targetX - p.startX) * .018, y - (p.targetY - p.startY) * .018, size * 1.9);
      particleCtx.fill();
    }
  }
  particleCtx.restore();
  const percent = Math.round(clamp(progress, 0, 1) * 100);
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
  return formed;
}

function clearRevealTimeouts() {
  revealTimeouts.forEach(window.clearTimeout);
  revealTimeouts = [];
}

function scheduleEnding() {
  revealTimeouts.push(window.setTimeout(() => {
    cancelAnimationFrame(animationFrame);
    animationRunning = false;
    showScene('ending');
    runEndingSequence();
  }, 1450));
}

function runParticleAnimation() {
  clearRevealTimeouts();
  $('#photoStage').classList.remove('lift-away');
  showScene('reveal');
  stageHint.textContent = 'putting the pieces together...';
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
  if (!buildParticles()) {
    stageHint.textContent = 'photo could not be loaded. add a photo in settings.';
    missingPhoto.hidden = false;
    return;
  }
  animationRunning = true;
  animationStartedAt = performance.now();
  const frame = (now) => {
    if (!animationRunning) return;
    const elapsed = now - animationStartedAt;
    const progress = clamp(elapsed / animationDuration, 0, 1);
    const formed = drawParticles(progress, now);
    if (progress >= 1) {
      stageHint.textContent = 'and there you are.';
      progressBar.style.width = '100%';
      progressText.textContent = '100%';
      window.setTimeout(() => $('#photoStage').classList.add('lift-away'), 220);
      scheduleEnding();
      return;
    }
    if (formed > particles.length * .75) stageHint.textContent = 'almost all the pieces are home...';
    animationFrame = requestAnimationFrame(frame);
  };
  animationFrame = requestAnimationFrame(frame);
}

function renderName(name) {
  const target = $('#recipientName');
  target.textContent = '';
  const chars = Array.from(name || 'someone special');
  chars.forEach((char, index) => {
    const span = document.createElement('span');
    span.className = 'letter';
    span.textContent = char === ' ' ? '\u00a0' : char;
    span.style.animationDelay = `${index * 95}ms`;
    target.appendChild(span);
  });
  return chars.length * 95 + 650;
}

function runEndingSequence() {
  clearRevealTimeouts();
  $('#messageList').replaceChildren();
  $('#recipientName').replaceChildren();
  $('.ending-actions').classList.remove('visible');
  const nameDuration = renderName(CONFIG.recipientName);
  let delay = 1700 + nameDuration;
  CONFIG.messages.filter(Boolean).forEach((message, index) => {
    revealTimeouts.push(window.setTimeout(() => {
      const line = document.createElement('p');
      line.className = 'message-line';
      line.textContent = message;
      $('#messageList').appendChild(line);
    }, delay + index * 1450));
  });
  delay += Math.max(0, CONFIG.messages.filter(Boolean).length - 1) * 1450 + 1650;
  revealTimeouts.push(window.setTimeout(() => $('.ending-actions').classList.add('visible'), delay));
}

function openSettings() {
  $('#nameInput').value = CONFIG.recipientName;
  $('#messageInput').value = CONFIG.messages.join('\n');
  settingsPanel.classList.add('open');
  settingsPanel.setAttribute('aria-hidden', 'false');
  $('#settingsClose').focus();
}
function closeSettings() {
  settingsPanel.classList.remove('open');
  settingsPanel.setAttribute('aria-hidden', 'true');
}

async function saveSettings() {
  const name = $('#nameInput').value.trim();
  const messages = $('#messageInput').value.split('\n').map((line) => line.trim()).filter(Boolean);
  CONFIG.recipientName = name || 'someone special';
  CONFIG.messages = messages.length ? messages : ['you make ordinary moments feel special.'];

  const photoFile = $('#photoInput').files[0];
  if (photoFile) {
    if (customPhotoUrl) URL.revokeObjectURL(customPhotoUrl);
    customPhotoUrl = URL.createObjectURL(photoFile);
    try {
      await setPhotoSource(customPhotoUrl);
    } catch (error) {
      console.error('Could not load selected photo:', error);
      alert('That photo could not be opened. Try a JPG, PNG, or WEBP image.');
    }
  }

  const musicFile = $('#musicInput').files[0];
  if (musicFile) {
    if (customMusicUrl) URL.revokeObjectURL(customMusicUrl);
    customMusicUrl = URL.createObjectURL(musicFile);
    music.src = customMusicUrl;
    soundEnabled = false;
    music.pause();
    updateSoundButton();
  }
  closeSettings();
  if (activeScene === 'ending') runEndingSequence();
}

function updateSoundButton() {
  const button = $('#soundButton');
  button.textContent = soundEnabled ? 'sound on' : 'sound off';
  button.setAttribute('aria-pressed', String(soundEnabled));
}

async function toggleSound() {
  if (!music.src) {
    alert('Add an audio file in Personalize to use background music.');
    return;
  }
  if (soundEnabled) {
    music.pause();
    soundEnabled = false;
  } else {
    try {
      await music.play();
      soundEnabled = true;
    } catch (error) {
      console.error('Audio playback was blocked:', error);
      soundEnabled = false;
    }
  }
  updateSoundButton();
}

function initAmbient() {
  const canvas = $('#ambient');
  const ctx = canvas.getContext('2d');
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ambientStars = Array.from({ length: Math.min(105, Math.floor(window.innerWidth * window.innerHeight / 9500)) }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: .25 + Math.random() * 1.15,
      alpha: .15 + Math.random() * .48,
      speed: .08 + Math.random() * .2,
      phase: Math.random() * Math.PI * 2
    }));
  };
  const draw = (time) => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const star of ambientStars) {
      const twinkle = .7 + Math.sin(time * .0006 + star.phase) * .3;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = '#f3c5d5';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      star.y -= star.speed * .17;
      if (star.y < -2) { star.y = window.innerHeight + 2; star.x = Math.random() * window.innerWidth; }
    }
    ctx.globalAlpha = 1;
    ambientFrame = requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  ambientFrame = requestAnimationFrame(draw);
}

function handleReplay() {
  clearRevealTimeouts();
  cancelAnimationFrame(animationFrame);
  animationRunning = false;
  ending.classList.remove('active');
  // Force a fresh animation state even if the same scene is selected quickly.
  $('#photoStage').classList.remove('lift-away');
  showScene('intro');
  window.setTimeout(() => runParticleAnimation(), 500);
}

$('#openButton').addEventListener('click', () => {
  // Audio intentionally never starts automatically. Playback requires its own user action.
  runParticleAnimation();
});
$('#replayButton').addEventListener('click', handleReplay);
$('#soundButton').addEventListener('click', toggleSound);
$('#settingsOpen').addEventListener('click', openSettings);
$('#endingSettings').addEventListener('click', openSettings);
$('#settingsClose').addEventListener('click', closeSettings);
$('#settingsBackdrop').addEventListener('click', closeSettings);
$('#settingsSave').addEventListener('click', saveSettings);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSettings(); });

(async function init() {
  $('#nameInput').value = CONFIG.recipientName;
  $('#messageInput').value = CONFIG.messages.join('\n');
  if (CONFIG.musicPath) music.src = CONFIG.musicPath;
  initAmbient();
  try {
    await setPhotoSource(CONFIG.photoPath);
  } catch (error) {
    console.warn('Default photo was not found. Add public/assets/photo.jpg or upload a photo in settings.', error);
    missingPhoto.hidden = false;
  }
  // Keep the intro as the first scene; canvas is sized only when the user starts.
})();

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(animationFrame);
  cancelAnimationFrame(ambientFrame);
  clearRevealTimeouts();
  if (customPhotoUrl) URL.revokeObjectURL(customPhotoUrl);
  if (customMusicUrl) URL.revokeObjectURL(customMusicUrl);
});
