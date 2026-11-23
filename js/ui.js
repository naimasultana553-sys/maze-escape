import { CHAPTERS, DIFFICULTIES } from "./config.js";
import { formatBestTime } from "./utils.js";

const THREAT_LABELS = ["DORMANT", "DISTANT", "STALKING", "CLOSE", "RIGHT BEHIND"];

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
    this.hudChapter = document.getElementById("hud-chapter");
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
    this.levelGrid = document.getElementById("level-grid");
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
        "Reset all chapter progress and best times? Settings will be kept."
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

  showDifficulty(progress) {
    for (const difficulty of DIFFICULTIES) {
      const data = progress[difficulty.id];
      const cleared = data.best.filter((time) => Number.isFinite(time)).length;
      const element = document.getElementById(`progress-${difficulty.id}`);
      element.textContent = `${cleared} / 3 CLEARED`;
      element.style.setProperty("--fill", String(cleared / 3));
    }
    this.showScreen("difficulty");
  }

  showLevels(difficultyIndex, progress) {
    const difficulty = DIFFICULTIES[difficultyIndex];
    document.getElementById("levels-subtitle").textContent = difficulty.name;
    document.getElementById("levels-title").textContent = "Select Chapter";
    this.levelGrid.innerHTML = CHAPTERS.map((chapter, index) => {
      const unlocked = index < progress.unlocked;
      const best = progress.best[index];
      const [cols, rows] = difficulty.sizes[index];
      const bestText = Number.isFinite(best)
        ? `BEST ${formatBestTime(best)}`
        : unlocked
          ? "NOT YET CLEARED"
          : `CLEAR CHAPTER ${index} TO UNLOCK`;
      return `
        <button class="level-card${unlocked ? "" : " locked"}" data-level="${index}" data-numeral="${
          chapter.numeral
        }" type="button" ${unlocked ? "" : "disabled"}>
          <span class="level-cta">${unlocked ? "ENTER ›" : ""}</span>
          <span class="level-index">CHAPTER ${chapter.numeral}</span>
          <span class="level-name">${chapter.title}</span>
          <span class="level-size">${cols} × ${rows} · WAKES IN ${difficulty.wakeDelay[index]}s</span>
          <span class="level-best${Number.isFinite(best) ? " cleared" : ""}">${bestText}</span>
        </button>
      `;
    }).join("");

    this.levelGrid.querySelectorAll("[data-level]").forEach((card) => {
      card.addEventListener("click", () => {
        if (card.disabled) return;
        this.actions.selectLevel(difficultyIndex, Number(card.dataset.level));
      });
    });

    this.showScreen("levels");
  }

  showIntro({ difficulty, levelIndex }) {
    const chapter = CHAPTERS[levelIndex];
    const [cols, rows] = difficulty.sizes[levelIndex];
    document.getElementById("intro-kicker").textContent = `CHAPTER ${chapter.numeral} · ${difficulty.name.toUpperCase()}`;
    document.getElementById("intro-title").textContent = chapter.title;
    document.getElementById("intro-story").textContent = chapter.story;
    document.getElementById("intro-meta").textContent =
      `${cols} × ${rows} MAZE  ·  THE SHADOW WAKES IN ${difficulty.wakeDelay[levelIndex]} SECONDS`;
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

  showVictory({ time, best, isBest, isFinal, levelIndex, difficultyIndex, nextChapter }) {
    const chapter = CHAPTERS[levelIndex];
    const kicker = document.getElementById("victory-kicker");
    const title = document.getElementById("victory-title");
    const message = document.getElementById("victory-message");
    const nextButton = document.getElementById("btn-next");

    if (isFinal) {
      kicker.textContent = "ALL CHAPTERS CLEARED";
      title.textContent = "YOU ESCAPED";
      message.textContent =
        "The entrance opens behind you. Whatever was down there stays there. You do not look back.";
      nextButton.classList.add("hidden");
    } else {
      kicker.textContent = `CHAPTER ${chapter.numeral} CLEARED`;
      title.textContent = "ESCAPED";
      message.textContent = `The dark releases you — for now. ${
        CHAPTERS[levelIndex + 1]?.title || "The next chamber"
      } waits deeper in.`;
      nextButton.classList.remove("hidden");
      nextButton.textContent = `NEXT: ${(nextChapter || "").toUpperCase()}`;
    }

    document.getElementById("victory-time").textContent = formatBestTime(time * 1000);
    document.getElementById("victory-best").textContent = Number.isFinite(best)
      ? formatBestTime(best)
      : "--:--.--";
    document.getElementById("victory-record").textContent = isBest ? "NEW BEST TIME" : "";
    document.getElementById("btn-victory-replay").textContent = isFinal
      ? "REPLAY FINAL CHAPTER"
      : "REPLAY CHAPTER";

    const difficulty = DIFFICULTIES[difficultyIndex];
    document.getElementById("victory-message").dataset.difficulty = difficulty.id;
    this.setDanger(0);
    this.showScreen("victory");
    this.hideCountdown();
  }

  setHUD({ difficulty, chapter, timer }) {
    if (difficulty !== undefined) this.hudDifficulty.textContent = difficulty;
    if (chapter !== undefined) this.hudChapter.textContent = chapter;
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
