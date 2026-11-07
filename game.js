
"use strict";

// ======================================
// CHAOS SWITCH - MAIN GAME ENGINE
// ======================================

const $ = id => document.getElementById(id);

const tiles = [...document.querySelectorAll(".tile")];

const COLORS = ["CYAN", "PINK", "YELLOW", "PURPLE"];

const SHAPES = [
  "CIRCLE",
  "TRIANGLE",
  "SQUARE",
  "DIAMOND"
];

const SYMBOLS = ["●", "▲", "■", "◆"];

const CLASSES = [
  "cyan",
  "pink",
  "yellow",
  "purple"
];

// ======================================
// GAME STATE
// ======================================

let score = 0;
let streak = 0;

let best = Number(
  localStorage.getItem("chaosSwitchBest") || 0
);

let timeLimit = 10;
let remaining = 10;

let playing = false;
let paused = false;
let soundEnabled = true;

let currentAnswer = 0;
let currentRule = "color";

let animationFrame = null;
let previousTime = 0;
let audioContext = null;

// ======================================
// INITIAL DISPLAY
// ======================================

$("best").textContent = best;
$("bestline").textContent = "PERSONAL BEST: " + best;

// ======================================
// SOUND SYSTEM
// ======================================

function playSound(frequency = 500, duration = 0.08) {

  if (!soundEnabled) return;

  try {

    audioContext = audioContext ||
      new (window.AudioContext ||
      window.webkitAudioContext)();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(
      0.06,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + duration
    );

  } catch (error) {
    console.warn("Sound unavailable", error);
  }
}

// ======================================
// UPDATE SCORE DISPLAY
// ======================================

function updateDisplay() {

  $("score").textContent = score;

  $("best").textContent = best;

  $("streak").textContent = streak + "×";

  $("timer").textContent =
    remaining.toFixed(1) + " SEC";

  const percentage =
    Math.max(0, remaining / timeLimit * 100);

  $("progressBar").style.width =
    percentage + "%";

  const round = Math.floor(score / 5) + 1;

  $("level").textContent =
    "ROUND " + String(round).padStart(2, "0");
}

// ======================================
// RANDOM TILE ARRANGEMENT
// ======================================

function shuffleTiles() {

  const order = [0, 1, 2, 3];

  for (let i = order.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    [order[i], order[j]] =
      [order[j], order[i]];
  }

  tiles.forEach((tile, position) => {

    const id = order[position];

    tile.dataset.id = id;

    tile.className = "tile " + CLASSES[id];

    tile.querySelector(".symbol").textContent =
      SYMBOLS[id];

    tile.querySelector("small").textContent =
      COLORS[id];

    tile.setAttribute(
      "aria-label",
      COLORS[id] + " " + SHAPES[id]
    );
  });
}

// ======================================
// GENERATE NEW RULE
// ======================================

function generateRule() {

  currentRule =
    Math.random() < 0.5 ? "color" : "shape";

  currentAnswer =
    Math.floor(Math.random() * 4);

  if (currentRule === "color") {

    $("rule").innerHTML =
      'Tap the <span>' +
      COLORS[currentAnswer] +
      "</span> tile";

  } else {

    $("rule").innerHTML =
      'Tap the <span>' +
      SHAPES[currentAnswer] +
      "</span>";

  }

  shuffleTiles();
}

// ======================================
// START GAME
// ======================================

function startGame() {

  cancelAnimationFrame(animationFrame);

  score = 0;
  streak = 0;

  timeLimit = 10;
  remaining = 10;

  playing = true;
  paused = false;

  $("overlay").classList.add("hidden");

  $("startBtn").textContent = "RESTART";

  $("pauseBtn").disabled = false;
  $("pauseBtn").textContent = "Ⅱ PAUSE";

  generateRule();

  updateDisplay();

  previousTime = performance.now();

  animationFrame =
    requestAnimationFrame(gameLoop);

  playSound(650);
}

// ======================================
// GAME TIMER
// ======================================

function gameLoop(timestamp) {

  if (!playing || paused) return;

  const delta = Math.min(
    (timestamp - previousTime) / 1000,
    0.1
  );

  previousTime = timestamp;

  remaining -= delta;

  if (remaining <= 0) {

    remaining = 0;

    updateDisplay();

    endGame();

    return;
  }

  updateDisplay();

  animationFrame =
    requestAnimationFrame(gameLoop);
}

// ======================================
// PLAYER SELECTS A TILE
// ======================================

function selectTile(id) {

  if (!playing || paused) return;

  const correct = id === currentAnswer;

  if (correct) {

    score++;

    streak++;

    playSound(
      600 + Math.min(streak * 25, 500)
    );

    // Small time bonus
    remaining = Math.min(
      timeLimit,
      remaining + 0.22
    );

    const selectedTile = tiles.find(
      tile => Number(tile.dataset.id) === id
    );

    selectedTile.classList.remove("flash");

    void selectedTile.offsetWidth;

    selectedTile.classList.add("flash");

    // Increase difficulty every 5 points
    if (score % 5 === 0) {

      timeLimit = Math.max(
        3.2,
        timeLimit - 0.8
      );

      remaining = Math.min(
        remaining,
        timeLimit
      );
    }

    generateRule();

  } else {

    streak = 0;

    playSound(120, 0.16);

    const arena = $("arena");

    arena.classList.remove("shake");

    void arena.offsetWidth;

    arena.classList.add("shake");

    // Wrong answer costs time
    remaining -= 1.25;

    if (remaining <= 0) {

      remaining = 0;

      updateDisplay();

      endGame();

      return;
    }
  }

  updateDisplay();
}

// ======================================
// END GAME
// ======================================

function endGame() {

  playing = false;
  paused = false;

  cancelAnimationFrame(animationFrame);

  $("pauseBtn").disabled = true;

  playSound(160, 0.25);

  const previousBest = best;

  if (score > best) {

    best = score;

    localStorage.setItem(
      "chaosSwitchBest",
      String(best)
    );
  }

  $("best").textContent = best;

  $("bestline").textContent =
    "PERSONAL BEST: " + best;

  $("overlayTitle").innerHTML =
    score > previousBest
      ? "NEW PERSONAL<br>BEST!"
      : "RUN<br>OVER!";

  $("overlayText").textContent =
    "You scored " + score +
    " points. Your best streak was " +
    streak +
    ". Try again and beat your record!";

  $("overlayBtn").textContent =
    "PLAY AGAIN";

  $("overlay").classList.remove("hidden");
}

// ======================================
// PAUSE AND RESUME
// ======================================

function togglePause() {

  if (!playing) return;

  paused = !paused;

  if (paused) {

    cancelAnimationFrame(animationFrame);

    $("pauseBtn").textContent =
      "▶ RESUME";

  } else {

    previousTime = performance.now();

    $("pauseBtn").textContent =
      "Ⅱ PAUSE";

    animationFrame =
      requestAnimationFrame(gameLoop);
  }
}

// ======================================
// SOUND BUTTON
// ======================================

function toggleSound() {

  soundEnabled = !soundEnabled;

  $("soundBtn").textContent =
    soundEnabled
      ? "🔊 SOUND ON"
      : "🔇 SOUND OFF";

  if (soundEnabled) {
    playSound(500);
  }
}

// ======================================
// TOUCH CONTROLS
// ======================================

tiles.forEach(tile => {

  tile.addEventListener("click", () => {

    selectTile(Number(tile.dataset.id));

  });

});

// ======================================
// KEYBOARD CONTROLS
// ======================================

document.addEventListener("keydown", event => {

  if (event.repeat) return;

  if (["1", "2", "3", "4"].includes(event.key)) {

    selectTile(Number(event.key) - 1);
  }

  if (event.code === "Space") {

    event.preventDefault();

    if (!playing) {
      startGame();
    } else {
      togglePause();
    }
  }

});

// ======================================
// BUTTON EVENTS
// ======================================

$("startBtn").addEventListener(
  "click",
  startGame
);

$("overlayBtn").addEventListener(
  "click",
  startGame
);

$("pauseBtn").addEventListener(
  "click",
  togglePause
);

$("soundBtn").addEventListener(
  "click",
  toggleSound
);

// ======================================
// INITIALIZE
// ======================================

updateDisplay();
