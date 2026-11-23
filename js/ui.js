import { DIFFICULTIES, LEVELS } from "./config.js";
import { formatBestTime } from "./utils.js";

const THREAT_LABELS = ["DORMANT", "DISTANT", "STALKING", "CLOSE", "RIGHT BEHIND"];

const PATH_POINTS = [
  { x: 11, y: 76 },
  { x: 30, y: 62 },
  { x: 19, y: 38 },
  { x: 41, y: 21 },
  { x: 62, y: 32 },
  { x: 52, y: 59 },
  { x: 84, y: 72 }
];

function segmentPath(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx = (from.x + to.x) / 2 - dy * 0.13;
  const cy = (from.y + to.y) / 2 + dx * 0.13;
  return `M ${from.x} ${from.y} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${to.x} ${to.y}`;
}

export class UI {
  constructor(actions) {
    this.actions = actions;
    this.currentScreen = "home";
    this.screens = {};
    this.toastTimer = null;
    this.flashTimer = null;

    for (const element of document.querySelectorAll(".screen")) {
      this.screens[element.id.replace("screen-", "")] = element;
    }

    this.stage = document.getElementById("stage");
    this.hud = document.getElementById("hud");
    this.hudDifficulty = document.getElementById("hud-difficulty");
    this.hudLevel = document.getElementById("hud-level");
    this.hudTimer = document.getElementById("hud-timer");
    this.hudThreat = document.getElementById("hud-threat");
    this.threatLabel = document.getElementById("threat-label");
    this.countdown = document.getElementById("countdown");
    this.countdownValue = document.getElementById("countdown-value");
    this.countdownLabel = document.getElementById("countdown-label");
    this.toastElement = document.getElementById("toast");
    this.dangerVignette = document.getElementById("danger-vignette");
    this.flashElement = document.getElementById("flash");
    this.muteButton = document.getElementById("btn-mute");
    this.levelPath = document.getElementById("level-path");
    this.victoryPath = document.getElementById("victory-path");
    this.touchControls = document.getElementById("touch-controls");

    this.bind();
  }

  bind() {
    const on = (id, handler) => {
      const element = document.getElementById(id);
      if (element) element.addEventListener("click", handler);
    };

    on("btn-start", () => this.actions.openDifficulty());
    on("btn-howto", () => this.actions.openHowTo());
    on("btn-settings", () => this.actions.openSettings());
    on("btn-howto-back", () => this.actions.goHome());
    on("btn-settings-back", () => this.actions.goHome());
    on("btn-difficulty-back", () => this.actions.goHome());
    on("btn-levels-back", () => this.actions.backToDifficulty());
    on("btn-intro-back", () => this.actions.backToLevels());
    on("btn-enter", () => this.actions.enterMaze());
    on("btn-resume", () => this.actions.resume());
    on("btn-restart", () => this.actions.restart());
    on("btn-pause-quit", () => this.actions.quitToMenu());
    on("btn-retry", () => this.actions.retry());
    on("btn-gameover-home", () => this.actions.quitToMenu());
    on("btn-next", () => this.actions.nextLevel());
    on("btn-victory-replay", () => this.actions.retry());
    on("btn-victory-home", () => this.actions.quitToMenu());
    on("btn-pause", () => this.actions.togglePause());
    on("btn-mute", () => this.actions.toggleMute());
    on("btn-reset-progress", () => {
      const confirmed = window.confirm(
        "Reset all level progress and best times? Settings will be kept."
      );
      if (confirmed) this.actions.resetProgress();
    });

    document.querySelectorAll("[data-difficulty]").forEach((card) => {
      card.addEventListener("click", () => {
        this.actions.selectDifficulty(Number(card.dataset.difficulty));
      });
    });

    document.getElementById("setting-volume").addEventListener("input", (event) => {
      this.actions.changeSettings({ volume: Number(event.target.value) / 100 });
    });
    document.getElementById("setting-mute").addEventListener("change", (event) => {
      this.actions.changeSettings({ muted: event.target.checked });
    });
    document.getElementById("setting-shake").addEventListener("change", (event) => {
      this.actions.changeSettings({ screenShake: event.target.checked });
    });
    document.getElementById("setting-flash").addEventListener("change", (event) => {
      this.actions.changeSettings({ reducedFlash: event.target.checked });
    });

    this.stage.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (button && !button.disabled) this.actions.uiClick?.();
    });
  }

  setHUDVisible(visible) {
    this.hud.classList.toggle("hidden", !visible);
  }

  hideAllScreens() {
    for (const screen of Object.values(this.screens)) screen.classList.add("hidden");
  }

  showScreen(name, { hud = false } = {}) {
    this.hideAllScreens();
    const screen = this.screens[name];
    if (screen) screen.classList.remove("hidden");
    this.currentScreen = name;
    this.setHUDVisible(hud);
    this.touchControls.classList.add("hidden");
    this.toastElement.classList.remove("show");
  }

  showHome() {
    this.showScreen("home");
    this.hideCountdown();
    this.setDanger(0);
  }

  showHowTo() {
    this.showScreen("howto");
  }

  showSettings(settings) {
    this.setSettings(settings);
    this.showScreen("settings");
  }

  setSettings(settings) {
    this.settings = { ...settings };
    document.getElementById("setting-volume").value = String(
      Math.round(settings.volume * 100)
    );
    document.getElementById("setting-mute").checked = Boolean(settings.muted);
    document.getElementById("setting-shake").checked = Boolean(settings.screenShake);
    document.getElementById("setting-flash").checked = Boolean(settings.reducedFlash);
    this.setMuted(settings.muted);
    this.applyAccessibility(settings);
  }

  setMuted(muted) {
    this.muteButton.textContent = muted ? "MUTED" : "MUTE";
    this.muteButton.setAttribute("aria-pressed", String(Boolean(muted)));
    const checkbox = document.getElementById("setting-mute");
    if (checkbox) checkbox.checked = Boolean(muted);
  }

  applyAccessibility(settings) {
    document.body.classList.toggle("reduced-flash", Boolean(settings.reducedFlash));
  }

  setLevelDanger(levelIndex, difficultyIndex) {
    const levelFactor = LEVELS.length > 1 ? levelIndex / (LEVELS.length - 1) : 0;
    const difficultyFactor = DIFFICULTIES.length > 1 ? difficultyIndex / (DIFFICULTIES.length - 1) : 0;
    const danger = Math.max(0, Math.min(1, levelFactor * 0.8 + difficultyFactor * 0.2));
    this.stage.style.setProperty("--level-danger", danger.toFixed(3));
    this.stage.style.setProperty("--grain-opacity", (0.06 + danger * 0.09).toFixed(3));
    this.stage.style.setProperty("--vignette-shadow", `${(9 + danger * 5).toFixed(1)}em`);
  }

  showDifficulty(progress) {
    for (const difficulty of DIFFICULTIES) {
      const data = progress[difficulty.id];
      const cleared = data.best.filter((time) => Number.isFinite(time)).length;
      const element = document.getElementById(`progress-${difficulty.id}`);
      element.textContent = `${cleared} / ${LEVELS.length} CLEARED`;
      element.style.setProperty("--fill", String(cleared / LEVELS.length));
    }
    this.showScreen("difficulty");
  }

  showLevels(difficultyIndex, progress) {
    const difficulty = DIFFICULTIES[difficultyIndex];
    const clearedCount = progress.best.filter((time) => Number.isFinite(time)).length;
    const currentIndex = Math.min(Math.max(progress.unlocked - 1, 0), LEVELS.length - 1);
    const treasureReached = clearedCount >= LEVELS.length;

    document.getElementById("levels-subtitle").textContent = difficulty.name.toUpperCase();
    document.getElementById("levels-title").textContent = "The Path to the Treasure";

    const segments = PATH_POINTS.slice(0, -1)
      .map((point, index) => {
        let state = "locked";
        if (treasureReached || (index < clearedCount && index + 1 < clearedCount)) {
          state = "completed";
        } else if (!treasureReached && index + 1 === currentIndex) {
          state = "current";
        }
        return `<path class="path-segment ${state}" d="${segmentPath(point, PATH_POINTS[index + 1])}" />`;
      })
      .join("");

    const nodes = LEVELS.map((level, index) => {
      const point = PATH_POINTS[index];
      const unlocked = index < progress.unlocked;
      const best = progress.best[index];
      let state = "locked";
      if (index < clearedCount) state = "completed";
      else if (!treasureReached && index === currentIndex) state = "current";
      else if (unlocked) state = "open";

      const stateText =
        state === "completed"
          ? "CLEARED"
          : state === "current"
            ? "ENTER"
            : state === "open"
              ? "OPEN"
              : "LOCKED";
      const bestText = Number.isFinite(best)
        ? `BEST ${formatBestTime(best)}`
        : unlocked
          ? state === "current"
            ? "ENTER TO CONTINUE"
            : "NOT YET CLEARED"
          : `CLEAR LEVEL ${index} TO UNLOCK`;

      return `
        <button class="path-node ${state}" data-level="${index}" type="button"
          style="--x: ${point.x}%; --y: ${point.y}%;"
          aria-label="${level.label}: ${level.title}${unlocked ? "" : " (locked)"}"
          ${unlocked ? "" : "disabled"}>
          <span class="path-node__medallion">
            <span class="path-node__number">${index + 1}</span>
          </span>
          <span class="path-node__label">${level.label}</span>
          <span class="path-node__title">${level.title}</span>
          <span class="path-node__state">${stateText}</span>
          <span class="path-node__best${Number.isFinite(best) ? " cleared" : ""}">${bestText}</span>
        </button>
      `;
    }).join("");

    const treasurePoint = PATH_POINTS[LEVELS.length];
    this.levelPath.innerHTML = `
      <svg class="path-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${segments}
      </svg>
      ${nodes}
      <div class="treasure-marker ${treasureReached ? "reached" : "sealed"}"
        style="--x: ${treasurePoint.x}%; --y: ${treasurePoint.y}%;">
        <span class="treasure-icon" aria-hidden="true">&#10022;</span>
        <span class="treasure-label">TREASURE</span>
        <span class="treasure-state">${treasureReached ? "REACHED" : "SEALED"}</span>
      </div>
    `;

    this.levelPath.querySelectorAll("[data-level]").forEach((node) => {
      node.addEventListener("click", () => {
        if (node.disabled) return;
        this.actions.selectLevel(difficultyIndex, Number(node.dataset.level));
      });
    });

    this.showScreen("levels");
  }

  showIntro({ difficulty, levelIndex, difficultyIndex = 0 }) {
    const level = LEVELS[levelIndex];
    const [cols, rows] = difficulty.sizes[levelIndex];
    document.getElementById("intro-kicker").textContent = `${level.label} · ${difficulty.name.toUpperCase()}`;
    document.getElementById("intro-title").textContent = level.title;
    document.getElementById("intro-story").textContent = level.story;
    document.getElementById("intro-meta").textContent =
      `${cols} × ${rows} MAZE  ·  THE SHADOW WAKES IN ${difficulty.wakeDelay[levelIndex]} SECONDS`;
    this.setLevelDanger(levelIndex, difficultyIndex);
    this.showScreen("intro");
    this.hideCountdown();
  }

  showGameplay() {
    this.hideAllScreens();
    this.currentScreen = "game";
    this.setHUDVisible(true);
    this.touchControls.classList.remove("hidden");
  }

  showPause() {
    this.showScreen("pause", { hud: true });
  }

  showGameOver({ time, best }) {
    document.getElementById("gameover-time").textContent = formatBestTime(time * 1000);
    document.getElementById("gameover-best").textContent = Number.isFinite(best)
      ? formatBestTime(best)
      : "--:--.--";
    document.getElementById("gameover-record").textContent = "";
    this.setDanger(0);
    this.showScreen("gameover");
    this.hideCountdown();
  }

  showVictory({ time, best, isBest, isFinal, levelIndex, difficultyIndex, progress }) {
    const level = LEVELS[levelIndex];
    const nextLevel = LEVELS[levelIndex + 1];
    const progressBest = progress?.best || [];
    const clearedCount = Math.min(
      LEVELS.length,
      Math.max(progressBest.filter((timeValue) => Number.isFinite(timeValue)).length, levelIndex + 1)
    );
    const kicker = document.getElementById("victory-kicker");
    const title = document.getElementById("victory-title");
    const message = document.getElementById("victory-message");
    const nextButton = document.getElementById("btn-next");

    if (isFinal) {
      kicker.textContent = "ALL LEVELS CLEARED";
      title.textContent = "TREASURE REACHED";
      message.textContent =
        "The last lock turns. Gold, dust, and the silence you were promised — the treasure is yours.";
      nextButton.classList.add("hidden");
    } else {
      kicker.textContent = `${level.label} CLEARED`;
      title.textContent = "ESCAPED";
      message.textContent = `The dark releases you — for now. ${
        nextLevel?.title || "The next chamber"
      } waits deeper in.`;
      nextButton.classList.remove("hidden");
      nextButton.textContent = `NEXT: ${nextLevel?.label || "LEVEL"}`;
    }

    document.getElementById("victory-time").textContent = formatBestTime(time * 1000);
    document.getElementById("victory-best").textContent = Number.isFinite(best)
      ? formatBestTime(best)
      : "--:--.--";
    document.getElementById("victory-record").textContent = isBest ? "NEW BEST TIME" : "";
    document.getElementById("btn-victory-replay").textContent = isFinal
      ? "REPLAY FINAL LEVEL"
      : "REPLAY LEVEL";

    const difficulty = DIFFICULTIES[difficultyIndex];
    document.getElementById("victory-message").dataset.difficulty = difficulty.id;
    this.renderVictoryPath(clearedCount, isFinal);
    this.setDanger(0);
    this.showScreen("victory");
    this.hideCountdown();
  }

  renderVictoryPath(clearedCount, isFinal) {
    const total = LEVELS.length;
    const cleared = Math.min(total, Math.max(0, clearedCount));
    const reached = isFinal || cleared >= total;
    const progressPercent = `${(cleared / total) * 100}%`;

    this.victoryPath.innerHTML = `
      <div class="victory-path__head">
        <span>PATH TO THE TREASURE</span>
        <span>${cleared} / ${total}</span>
      </div>
      <div class="victory-track" style="--path-progress: ${progressPercent};">
        ${LEVELS.map((level, index) => {
          const state = index < cleared ? "completed" : !reached && index === cleared ? "current" : "locked";
          return `<span class="victory-step ${state}" title="${level.label}"><em>${index + 1}</em></span>`;
        }).join("")}
        <span class="victory-treasure ${reached ? "reached" : "sealed"}" title="Treasure">&#10022;</span>
      </div>
    `;
  }

  setHUD({ difficulty, level, timer }) {
    if (difficulty !== undefined) this.hudDifficulty.textContent = difficulty;
    if (level !== undefined) this.hudLevel.textContent = level;
    if (timer !== undefined) this.hudTimer.textContent = timer;
  }

  setThreat(level) {
    const safe = Math.max(0, Math.min(4, level));
    for (let i = 0; i < 5; i += 1) this.hudThreat.classList.toggle(`threat-${i}`, i === safe);
    this.threatLabel.textContent = THREAT_LABELS[safe];
  }

  setDanger(amount) {
    const factor = this.settings?.reducedFlash ? 0.36 : 0.9;
    this.dangerVignette.style.opacity = String(
      Math.max(0, Math.min(1, amount)) * factor
    );
  }

  showCountdown(value, label) {
    this.countdown.classList.remove("hidden");
    this.countdownValue.textContent = value;
    this.countdownLabel.textContent = label;
    this.countdownValue.style.animation = "none";
    void this.countdownValue.offsetWidth;
    this.countdownValue.style.animation = "";
  }

  hideCountdown() {
    this.countdown.classList.add("hidden");
  }

  showToast(message, duration = 2800) {
    window.clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.classList.add("show");
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove("show");
    }, duration);
  }

  flash() {
    window.clearTimeout(this.flashTimer);
    this.flashElement.classList.remove("flash-active");
    void this.flashElement.offsetWidth;
    this.flashElement.classList.add("flash-active");
    this.flashTimer = window.setTimeout(() => {
      this.flashElement.classList.remove("flash-active");
    }, 650);
  }
}
