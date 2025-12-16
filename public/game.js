const MAX_LIVES = 3;
const MAX_ROUNDS = 8;
const STARTING_LEVEL = 1;
let player_name = "";
// set first visit flag
let firstVisit = localStorage.getItem("firstVisit");
if (firstVisit && localStorage.getItem("playerName")) {
  player_name = localStorage.getItem("playerName");
  instructions_overlay.classList.add("hidden");
}

// Show user badge name if player name exists
if (localStorage.getItem("playerName")) {
  player_name = localStorage.getItem("playerName");

  // Desktop badge name
  const userBadge = document.getElementById("user_badge");
  const usernameDisplay = document.getElementById("username_display");
  if (userBadge && usernameDisplay) {
    usernameDisplay.textContent = `User Name: ${player_name}`;
    userBadge.classList.remove("hidden");
  }

  // Mobile badge name
  const userBadgeMobile = document.getElementById("user_badge_mobile");
  const usernameDisplayMobile = document.getElementById(
    "username_display_mobile"
  );
  if (userBadgeMobile && usernameDisplayMobile) {
    usernameDisplayMobile.textContent = `User: ${player_name}`;
    userBadgeMobile.classList.remove("hidden");
  }
}
const LEVEL_SPEEDS = [725, 650, 600, 550, 500, 450, 400, 350];

const COLORS = [
  { rgb: "rgb(255, 0, 0)", name: "RED" },
  { rgb: "rgb(0, 0, 255)", name: "BLUE" },
  { rgb: "rgb(224, 101, 1)", name: "ORANGE" },
  { rgb: "rgb(0, 128, 0)", name: "GREEN" },
  { rgb: "rgb(248, 245, 34)", name: "YELLOW" },
  { rgb: "rgb(128, 0, 128)", name: "PURPLE" },
];

const scoreDisplay = scores.querySelector("tbody");
const mobileScoreDisplay = modal_scores.querySelector("tbody");
const heartIcons = lives.querySelectorAll("span");

const BUTTON_INACTIVE = getComputedStyle(document.documentElement)
  .getPropertyValue("--button-inactive")
  .trim();

let gameState = {
  currentLevel: STARTING_LEVEL,
  remainingLives: MAX_LIVES,
  isGameRunning: false,
  nextColorIndex: 0,
  targetColorIndex: Math.floor(Math.random() * COLORS.length),
  time: null,
  startTime: null,
  timerInterval: null,
  colorChangeInterval: null,
  activeMessage: null,
};

const audioSystem = {
  backgroundMusic: createAudio("sound/looper.mp3", true),
  roundWin: createAudio("sound/opening.mp3"),
  roundLose: createAudio("sound/round_loss.mp3"),
  gameOver: createAudio("sound/game_lose.mp3"),
  victory: createAudio("sound/winner.mp3"),

  playSound(audioElement, resetTime = true) {
    if (resetTime) {
      audioElement.currentTime = 0;
    }
    audioElement.play();
  },

  stopMusic() {
    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
  },

  setVolume(volume) {
    this.backgroundMusic.volume = volume;
    this.roundWin.volume = volume;
    this.roundLose.volume = volume;
    this.gameOver.volume = volume;
    this.victory.volume = volume;
  },
};

function createAudio(src, loop = false) {
  const audio = new Audio(src);
  audio.loop = loop;
  return audio;
}

function toggle(element, shouldShow) {
  element.classList.toggle("toggle_display", !shouldShow);
}

function updateLivesDisplay(lives) {
  heartIcons.forEach((icon, i) => toggle(icon, i < lives));
}

function showMessage(text, color) {
  if (gameState.activeMessage) gameState.activeMessage.remove();
  const msg = document.createElement("div");
  msg.className = "game-message";
  msg.textContent = text;
  msg.style.color = color;
  document.body.appendChild(msg);
  gameState.activeMessage = msg;
}

function showNameError(message) {
  const existingError = user_form.querySelector(".name-error");
  if (existingError) existingError.remove();

  const errorMsg = document.createElement("div");
  errorMsg.className = "name-error";
  errorMsg.textContent = message;
  user_form.appendChild(errorMsg);
}

function triggerLifeLossFeedback() {
  document.body.classList.add("life-lost");

  setTimeout(() => {
    document.body.classList.remove("life-lost");
  }, 400);
}

function triggerGameOverFeedback() {
  document.body.classList.add("game-over");

  setTimeout(() => {
    document.body.classList.remove("game-over");
  }, 1510);
}

function updateTimerDisplay() {
  const ms = Date.now() - gameState.startTime;
  timer.style.color = "var(--cyan-bright)";
  timer_label.style.color = "var(--cyan-bright)";
  console.log(ms);
  if (ms > 34999) {
    timer.style.color = "red";
    timer_label.style.color = "red";
  }

  if (ms >= 45010) {
    toggleColorCycle(false);
    toggleTimer("stop");
    audioSystem.stopMusic();
    audioSystem.playSound(audioSystem.gameOver, false);
    triggerGameOverFeedback();
    updateUI("gameOver");
    gameState.currentLevel = STARTING_LEVEL;
    gameState.remainingLives = MAX_LIVES;
    gameState.isGameRunning = false;
    return;
  }

  const sec = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  timer.textContent = `${String(sec).padStart(2, "0")}:${String(cs).padStart(
    2,
    "0"
  )}`;
}

function updateTargetColorDisplay() {
  const color = COLORS[gameState.targetColorIndex];
  target_color.style.backgroundColor = color.rgb;
  target_color.textContent = color.name;
}

function cycleButtonColor() {
  main_game_button.className = `game-color-${gameState.nextColorIndex}`;
  gameState.nextColorIndex = (gameState.nextColorIndex + 1) % COLORS.length;
}

function getCurrentColorIndex() {
  for (let i = 0; i < COLORS.length; i++) {
    if (main_game_button.classList.contains(`game-color-${i}`)) return i;
  }
  return -1;
}

function toggleTimer(action) {
  if (action === "start") {
    timer_container.classList.add("visible");
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(updateTimerDisplay, 10);
  } else if (action === "stop") {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  } else if (action === "hide") {
    timer_container.classList.remove("visible");
  }
}

function toggleColorCycle(start) {
  if (start) {
    cycleButtonColor();
    const speed = LEVEL_SPEEDS[gameState.currentLevel - 1];
    gameState.colorChangeInterval = setInterval(cycleButtonColor, speed);
  } else {
    clearInterval(gameState.colorChangeInterval);
    gameState.colorChangeInterval = null;
  }
}

function updateUI(state) {
  if (state === "start") {
    if (gameState.activeMessage) gameState.activeMessage.remove();
    [level_title, lives, title].forEach((el) => toggle(el, true));
    button_text.textContent = "STOP";
    level_title.textContent = `ROUND ${gameState.currentLevel}`;
    updateLivesDisplay(gameState.remainingLives);
    toggle(restart, true);
    toggle(mobile_leaderboard_btn, false);
    audioSystem.playSound(audioSystem.backgroundMusic, false);
  } else if (state === "pause") {
    button_text.textContent = "RESUME";
  } else if (state === "win") {
    [level_title, lives, title, restart].forEach((el) => toggle(el, false));
    button_text.textContent = "PRESS TO PLAY AGAIN";
    updateLivesDisplay(0);
    toggle(mobile_leaderboard_btn, true);
    showMessage("MISSION SUCCESS", "green");
  } else if (state === "gameOver") {
    [title, level_title, lives, restart].forEach((el) => toggle(el, false));
    button_text.textContent = "PRESS TO TRY AGAIN";
    setTimeout(() => showMessage("MISSION FAILED", "red"), 1500);

    // Disable button during shake animation
    main_game_button.disabled = true;
    setTimeout(() => {
      main_game_button.disabled = false;
    }, 1600);
  }
}

function resetGameState() {
  toggleColorCycle(false);
  toggleTimer("stop");
  toggleTimer("hide");
  audioSystem.stopMusic();

  gameState.currentLevel = STARTING_LEVEL;
  gameState.remainingLives = MAX_LIVES;
  gameState.targetColorIndex = Math.floor(Math.random() * COLORS.length);
  gameState.isGameRunning = false;

  updateTargetColorDisplay();
  button_text.textContent = "START";
  level_title.textContent = `ROUND ${gameState.currentLevel}`;
  updateLivesDisplay(gameState.remainingLives);

  main_game_button.className = "";
  main_game_button.style.backgroundColor = BUTTON_INACTIVE;
  main_game_button.classList.add("pulse");
  toggle(restart, false);
  toggle(mobile_leaderboard_btn, true);
}

function startGame() {
  const isFirstStart =
    gameState.remainingLives === MAX_LIVES &&
    gameState.currentLevel === STARTING_LEVEL;

  if (isFirstStart) {
    main_game_button.classList.remove("pulse");
    toggleTimer("start");
  }

  toggleColorCycle(true);
  gameState.isGameRunning = true;
  updateUI("start");
}

function stopGame() {
  toggleColorCycle(false);
  gameState.isGameRunning = false;
  updateUI("pause");
  const colorIndex = getCurrentColorIndex();
  main_game_button.style.backgroundColor =
    getComputedStyle(main_game_button).backgroundColor;
  return colorIndex;
}

async function handleGameButtonClick() {
  if (!gameState.isGameRunning) {
    startGame();
  } else {
    const colorIndex = stopGame();

    if (colorIndex === gameState.targetColorIndex) {
      if (gameState.currentLevel < MAX_ROUNDS)
        audioSystem.playSound(audioSystem.roundWin);
      gameState.currentLevel++;
      gameState.targetColorIndex = Math.floor(Math.random() * COLORS.length);
      updateTargetColorDisplay();

      if (gameState.currentLevel > MAX_ROUNDS) {
        toggleTimer("stop");
        gameState.time = (Date.now() - gameState.startTime) / 1000;
        updateUI("win");
        audioSystem.stopMusic();
        audioSystem.playSound(audioSystem.victory, false);
        gameState.currentLevel = STARTING_LEVEL;
        gameState.remainingLives = MAX_LIVES;
        await sendScore();
        await getScores();
      }
    } else {
      if (gameState.remainingLives > 1)
        audioSystem.playSound(audioSystem.roundLose);
      gameState.remainingLives--;
      toggle(heartIcons[gameState.remainingLives], false);

      if (gameState.remainingLives === 0) {
        triggerGameOverFeedback();
        toggleTimer("stop");
        toggleTimer("hide");
        audioSystem.stopMusic();
        audioSystem.playSound(audioSystem.gameOver, false);
        updateUI("gameOver");
        gameState.currentLevel = STARTING_LEVEL;
        gameState.remainingLives = MAX_LIVES;
      } else {
        triggerLifeLossFeedback();
      }
    }
  }
}

function updateVolume() {
  const vol = volume_slider.value / 100;
  audioSystem.setVolume(vol);
  volume_display.src =
    vol == 0 ? "images/vol_icon_muted.png" : "images/vol_icon.png";
}

function toggleMute() {
  volume_slider.value = volume_slider.value > 0 ? 0 : 30;
  updateVolume();
}

function toggleLeaderboard() {
  leaderboard.classList.toggle("hidden");
  toggle_leaderboard_btn.textContent = leaderboard.classList.contains("hidden")
    ? "Show High Scores"
    : "Hide High Scores";
}

updateTargetColorDisplay();
main_game_button.className = "";
main_game_button.style.backgroundColor = BUTTON_INACTIVE;
main_game_button.classList.add("pulse");
updateVolume();

main_game_button.addEventListener("mousedown", handleGameButtonClick);
restart.addEventListener("click", resetGameState);
volume_slider.addEventListener("input", updateVolume);
mute_volume.addEventListener("click", toggleMute);
toggle_leaderboard_btn.addEventListener("click", toggleLeaderboard);
mobile_leaderboard_btn.addEventListener("click", () =>
  leaderboard_modal.classList.remove("hidden")
);
close_leaderboard_modal.addEventListener("click", () =>
  leaderboard_modal.classList.add("hidden")
);
leaderboard_modal.addEventListener("click", (e) => {
  if (e.target === leaderboard_modal) leaderboard_modal.classList.add("hidden");
});

// Change name button handler - show warning modal
const changeNameBtns = [
  document.getElementById("change_name_btn"),
  document.getElementById("change_name_btn_mobile"),
];
const changeNameModal = document.getElementById("change_name_modal");
const confirmChangeBtn = document.getElementById("confirm_change_name");
const cancelChangeBtn = document.getElementById("cancel_change_name");

changeNameBtns.forEach((btn) => {
  if (btn) {
    btn.addEventListener("click", () => {
      changeNameModal.classList.remove("hidden");
    });
  }
});

// Confirm change name button
if (confirmChangeBtn) {
  confirmChangeBtn.addEventListener("click", () => {
    localStorage.removeItem("playerName");
    localStorage.removeItem("firstVisit");
    location.reload();
  });
}

// Cancel change name button
if (cancelChangeBtn) {
  cancelChangeBtn.addEventListener("click", () => {
    changeNameModal.classList.add("hidden");
  });
}

user_form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nameInput = player_name_input.value.trim().toLowerCase();

  if (!nameInput) {
    showNameError("Please enter a name");
    return;
  }

  const validNamePattern = /^(?![0-9]+$)[a-z0-9]{2,12}$/;
  if (!validNamePattern.test(nameInput)) {
    showNameError(
      "Name must include a letter and contain only letters/numbers"
    );
    return;
  }

  try {
    const response = await fetch("/api/check-name", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: nameInput }),
    });

    const data = await response.json();

    if (!data.available) {
      showNameError(data.message);
      return;
    }

    player_name = nameInput;
    localStorage.setItem("playerName", player_name);
    localStorage.setItem("firstVisit", false);

    // close modal and default to normal scroll (mobile glitch fix)
    instructions_overlay.classList.add("hidden");
    window.scrollTo(0, 0);

    // Show desktop badge
    const userBadge = document.getElementById("user_badge");
    const usernameDisplay = document.getElementById("username_display");
    if (userBadge && usernameDisplay) {
      usernameDisplay.textContent = `User: ${player_name}`;
      userBadge.classList.remove("hidden");
    }

    // Show mobile badge
    const userBadgeMobile = document.getElementById("user_badge_mobile");
    const usernameDisplayMobile = document.getElementById(
      "username_display_mobile"
    );
    if (userBadgeMobile && usernameDisplayMobile) {
      usernameDisplayMobile.textContent = `Welcome, ${player_name}`;
      userBadgeMobile.classList.remove("hidden");
    }
  } catch (error) {
    showNameError("Error checking name. Please try again.");
    console.error("Name check error:", error);
  }
});

async function sendScore() {
  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: player_name, time: gameState.time }),
    });
    if (!response.ok) {
      console.error("Failed to save score");
    }
  } catch (error) {
    console.error("Error saving score:", error);
  }
}
async function getScores() {
  try {
    const response = await fetch("/api/scores");
    if (!response.ok) {
      console.error("Failed to fetch scores");
      return;
    }
    const data = await response.json();

    let counter = 1;
    scoreDisplay.innerHTML = "";
    for (let { name, time } of data) {
      scoreDisplay.innerHTML += `<tr><td>${counter++}</td><td>${name}</td><td>${time.toFixed(
        2
      )}</td></tr>`;
    }
    counter = 1;
    mobileScoreDisplay.innerHTML = "";
    for (let { name, time } of data) {
      mobileScoreDisplay.innerHTML += `<tr><td>${counter++}</td><td>${name}</td><td>${time.toFixed(
        2
      )}</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading scores:", error);
  }
}

getScores();
