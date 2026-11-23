import {
  CATCH_RADIUS,
  COUNTDOWN_SECONDS,
  DIFFICULTIES,
  LEVELS
} from "./config.js";
import { Maze } from "./maze.js";
import { Player } from "./player.js";
import { Shadow } from "./shadow.js";
import { Renderer } from "./renderer.js";
import { UI } from "./ui.js";
import { clamp, formatClock, hashString } from "./utils.js";

export class Game {
  constructor({ canvas, storage, audio, input }) {
    this.storage = storage;
    this.audio = audio;
    this.input = input;
    this.settings = { ...storage.settings };

    this.renderer = new Renderer(canvas);
    this.renderer.screenShakeEnabled = this.settings.screenShake;
    audio.updateSettings(this.settings);

    this.ui = new UI({
      openHowTo: () => this.openHowTo(),
      openSettings: () => this.openSettings(),
      openDifficulty: () => this.openDifficulty(),
      selectDifficulty: (index) => this.openLevels(index),
      backToDifficulty: () => this.openDifficulty(),
      selectLevel: (difficultyIndex, levelIndex) => this.selectLevel(difficultyIndex, levelIndex),
      backToLevels: () => this.openLevels(this.difficultyIndex),
      enterMaze: () => this.beginCountdown(),
      resume: () => this.resume(),
      restart: () => this.restart(),
      quitToMenu: () => this.goHome(),
      retry: () => this.retry(),
      nextLevel: () => this.nextLevel(),
      togglePause: () => this.togglePause(),
      toggleMute: () => this.toggleMute(),
      changeSettings: (partial) => this.changeSettings(partial),
      resetProgress: () => this.resetProgress(),
      uiClick: () => this.audio.click(),
      goHome: () => this.goHome()
    });
    this.ui.setSettings(this.settings);

    this.state = "home";
    this.difficultyIndex = 0;
    this.levelIndex = 0;
    this.maze = null;
    this.player = null;
    this.shadows = [];
    this.shadow = null;
    this.lightRadius = 4.5;
    this.elapsed = 0;
    this.countdown = 0;
    this.lastCountdownLabel = "";
    this.deathTimer = 0;
    this.deathTime = 0;
    this.escapedTimer = 0;
    this.lastStepCount = 0;
    this.lastExploredCell = "";
    this.hudAccumulator = 0;
    this.threatAccumulator = 0;
    this.lastThreatLevel = null;
    this.lastResult = null;

    this.input.onAction = (action) => this.handleAction(action);
    this.input.setEnabled(false);

    window.addEventListener("blur", () => {
      this.input.clear();
      if (this.state === "playing") this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pause();
    });
    window.addEventListener("resize", () => this.renderer.resize());
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => this.renderer.resize()).observe(this.renderer.canvas.parentElement);
    }

    this.ui.showHome();
    this.ui.setHUDVisible(false);
  }

  get difficulty() {
    return DIFFICULTIES[this.difficultyIndex];
  }

  goHome() {
    this.state = "home";
    this.input.setEnabled(false);
    this.input.clear();
    this.audio.stopGameplay();
    this.audio.setPaused(false);
    this.ui.showHome();
    this.ui.setHUDVisible(false);
    this.renderer.resize();
    this.ui.setDanger(0);
    this.ui.setLevelDanger(0, 0);
    this.renderer.setDangerTone(0, 0);
    this.renderer.clearFlicker();
    this.ui.hideCountdown();
  }

  openHowTo() {
    this.state = "howto";
    this.audio.stopGameplay();
    this.ui.showHowTo();
    this.ui.setHUDVisible(false);
  }

  openSettings() {
    this.state = "settings";
    this.audio.stopGameplay();
    this.ui.showSettings(this.settings);
    this.ui.setHUDVisible(false);
  }

  openDifficulty() {
    this.state = "difficulty";
    this.audio.stopGameplay();
    this.ui.showDifficulty(this.storage.data.progress);
    this.ui.setHUDVisible(false);
  }

  openLevels(index) {
    this.difficultyIndex = index;
    this.state = "levels";
    this.audio.stopGameplay();
    this.ui.showLevels(index, this.storage.getProgress(this.difficulty.id));
    this.ui.setHUDVisible(false);
  }

  selectLevel(difficultyIndex, levelIndex) {
    if (!this.storage.isUnlocked(DIFFICULTIES[difficultyIndex].id, levelIndex)) return;
    this.difficultyIndex = difficultyIndex;
    this.levelIndex = levelIndex;
    this.loadLevel();
    this.state = "intro";
    this.audio.stopGameplay();
    this.ui.showIntro({
      difficulty: this.difficulty,
      levelIndex: this.levelIndex,
      difficultyIndex: this.difficultyIndex
    });
  }

  loadLevel() {
    const difficulty = this.difficulty;
    const [cols, rows] = difficulty.sizes[this.levelIndex];
    const seed = hashString(
      `${difficulty.id}-${difficulty.seedBase}-${this.levelIndex + 1}-v1`
    );
    this.maze = new Maze(cols, rows, seed);
    this.lightRadius = difficulty.lightRadius[this.levelIndex];
    this.renderer.setDangerTone(this.levelIndex, this.difficultyIndex);
    this.ui.setLevelDanger(this.levelIndex, this.difficultyIndex);
    this.renderer.setMaze(this.maze, true);

    this.player = new Player(this.maze, this.maze.start);

    const shadowCount = difficulty.shadowCount[this.levelIndex];
    const baseSpeed = difficulty.shadowSpeed[this.levelIndex];
    const maxSpeed = difficulty.shadowMax[this.levelIndex];
    const baseWake = difficulty.wakeDelay[this.levelIndex];
    const extraGap = difficulty.extraWakeGap[this.levelIndex];
    const speedScale = difficulty.extraSpeedScale[this.levelIndex];
    const starts = this.maze.shadowStarts.slice(0, shadowCount);

    this.shadows = starts.map((start, index) => {
      const scale = index === 0 ? 1 : speedScale;
      return new Shadow(this.maze, start, {
        index,
        baseSpeed: baseSpeed * scale,
        maxSpeed: maxSpeed * scale,
        wakeDelay: baseWake + index * extraGap
      });
    });
    this.shadow = this.shadows[0] || null;

    this.renderer.setFlicker({
      interval: difficulty.flicker.interval[this.levelIndex],
      depth: difficulty.flicker.depth[this.levelIndex],
      duration: difficulty.flicker.duration[this.levelIndex],
      seed,
      softened: this.settings.reducedFlash
    });

    this.elapsed = 0;
    this.countdown = 0;
    this.lastCountdownLabel = "";
    this.deathTimer = 0;
    this.deathTime = 0;
    this.escapedTimer = 0;
    this.lastStepCount = 0;
    this.lastExploredCell = "";
    this.hudAccumulator = 0;
    this.threatAccumulator = 0;
    this.lastThreatLevel = null;
    this.lastResult = null;
    this.ui.setThreat(0);
    this.ui.setDanger(0);
  }

  beginCountdown() {
    if (!this.maze || !this.player) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    this.state = "countdown";
    this.countdown = COUNTDOWN_SECONDS;
    this.lastCountdownLabel = "3";
    this.lastStepCount = this.player.stepCount;
    this.lastExploredCell = "";

    this.ui.showGameplay();
    this.renderer.resize();
    this.ui.setHUD({
      difficulty: this.difficulty.name.toUpperCase(),
      level: LEVELS[this.levelIndex].label.toUpperCase(),
      timer: "00:00"
    });
    this.ui.setThreat(0);
    this.ui.setDanger(0);
    this.ui.showCountdown(
      "3",
      this.shadows.length > 1 ? "THE HUNTERS ARE WAKING" : "THE SHADOW IS WAKING"
    );

    this.audio.unlock();
    this.audio.startAmbient();
    this.audio.setPaused(false);
    this.renderer.explore(this.player.cell, this.lightRadius);
    this.input.setEnabled(false);
    this.input.clear();
  }

  restart() {
    this.loadLevel();
    this.beginCountdown();
  }

  retry() {
    if (this.state !== "gameover" && this.state !== "victory") return;
    this.loadLevel();
    this.beginCountdown();
  }

  nextLevel() {
    if (this.levelIndex >= LEVELS.length - 1) return;
    this.levelIndex += 1;
    this.loadLevel();
    this.state = "intro";
    this.audio.stopGameplay();
    this.ui.showIntro({
      difficulty: this.difficulty,
      levelIndex: this.levelIndex,
      difficultyIndex: this.difficultyIndex
    });
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.input.setEnabled(false);
    this.input.clear();
    this.audio.setPaused(true);
    this.ui.showPause();
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.input.setEnabled(true);
    this.input.clear();
    this.audio.setPaused(false);
    this.ui.showGameplay();
  }

  togglePause() {
    if (this.state === "playing") this.pause();
    else if (this.state === "paused") this.resume();
  }

  toggleMute() {
    this.changeSettings({ muted: !this.settings.muted });
  }

  changeSettings(partial) {
    this.settings = this.storage.updateSettings(partial);
    this.audio.updateSettings(this.settings);
    this.renderer.screenShakeEnabled = this.settings.screenShake;
    this.renderer.setFlickerSoftened(this.settings.reducedFlash);
    this.ui.setSettings(this.settings);
  }

  resetProgress() {
    this.storage.resetProgress();
    this.ui.showToast("ALL PROGRESS RESET", 2200);
  }

  handleAction(action) {
    if (action === "pause") {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
    } else if (action === "mute") {
      this.toggleMute();
    } else if (action === "retry") {
      if (this.state === "gameover" || this.state === "victory") this.retry();
    }
  }

  update(dt) {
    if (this.state === "countdown") {
      this.updateCountdown(dt);
    } else if (this.state === "playing") {
      this.updatePlaying(dt);
    } else if (this.state === "dying") {
      this.updateDying(dt);
    } else if (this.state === "escaped") {
      this.updateEscaped(dt);
    }
  }

  updateCountdown(dt) {
    this.countdown -= dt;
    let label;
    if (this.countdown > 2.6) label = "3";
    else if (this.countdown > 1.6) label = "2";
    else if (this.countdown > 0.6) label = "1";
    else label = "RUN";

    if (label !== this.lastCountdownLabel) {
      this.lastCountdownLabel = label;
      const running = label === "RUN";
      const waking =
        this.shadows.length > 1 ? "THE HUNTERS ARE WAKING" : "THE SHADOW IS WAKING";
      this.ui.showCountdown(label, running ? "RUN" : waking);
      this.audio.countdownBeep(running);
    }

    if (this.countdown <= 0) {
      this.state = "playing";
      this.elapsed = 0;
      this.hudAccumulator = 1;
      this.threatAccumulator = 1;
      this.input.setEnabled(true);
      this.input.clear();
      this.ui.hideCountdown();
      this.ui.setHUD({ timer: "00:00" });
      this.ui.setThreat(0);
      this.ui.showToast("FIND THE EXIT", 1500);
      this.audio.startAmbient();
    }
  }

  updatePlaying(dt) {
    this.elapsed += dt;

    const direction = this.input.getDirection();
    this.player.update(dt, direction);

    if (this.player.stepCount !== this.lastStepCount) {
      this.lastStepCount = this.player.stepCount;
      this.audio.footstep();
    }

    const cellKey = `${this.player.cell.x},${this.player.cell.y}`;
    if (cellKey !== this.lastExploredCell) {
      this.lastExploredCell = cellKey;
      this.renderer.explore(this.player.cell, this.lightRadius);
    }

    let wokeCount = 0;
    for (const shadow of this.shadows) {
      if (shadow.update(dt, this.player, this.elapsed) === "woke") wokeCount += 1;
    }
    if (wokeCount > 0) {
      const activeCount = this.shadows.filter((shadow) => shadow.active).length;
      const message =
        activeCount === 1
          ? "THE SHADOW HAS AWAKENED"
          : `MORE HUNTERS WAKE · ${activeCount}/${this.shadows.length}`;
      this.audio.wake();
      this.ui.showToast(message, 2600);
      this.renderer.addShake(3 + Math.min(activeCount, 6) * 0.45, 0.5);
    }

    if (this.isCaught()) {
      this.catchPlayer();
      return;
    }

    if (
      this.player.cell.x === this.maze.exit.x &&
      this.player.cell.y === this.maze.exit.y
    ) {
      this.winLevel();
      return;
    }

    this.updateThreat(dt);
    this.updateHUD(dt);
  }

  updateThreat(dt) {
    let threat = 0;
    let level = 0;
    const activeShadows = this.shadows.filter((shadow) => shadow.active);
    const surrounded = activeShadows.length >= 3;

    if (activeShadows.length > 0) {
      const nearest = activeShadows.reduce(
        (closest, shadow) => Math.min(closest, shadow.pathLength),
        Infinity
      );
      if (!Number.isFinite(nearest)) {
        level = 1;
        threat = 0.1;
      } else {
        if (nearest <= 2) level = 4;
        else if (nearest <= 4) level = 3;
        else if (nearest <= 8) level = 2;
        else level = 1;
        threat = clamp(1 - Math.max(0, nearest - 1) / 14, 0, 1);
      }

      threat = clamp(threat + Math.min(0.2, (activeShadows.length - 1) * 0.035), 0, 1);
      if (surrounded && nearest <= 8) level = Math.min(4, level + 1);
      else if (activeShadows.length >= 5) level = Math.max(level, 3);
    }

    const danger =
      level === 4 ? 0.72 : level === 3 ? 0.42 : level === 2 ? 0.2 : level === 1 ? 0.06 : 0;

    this.ui.setDanger(danger);
    this.audio.setThreat(threat);
    this.audio.updateHeartbeat(dt, threat, activeShadows.length > 0);

    this.threatAccumulator += dt;
    if (this.threatAccumulator >= 0.16 || level !== this.lastThreatLevel) {
      this.threatAccumulator = 0;
      this.lastThreatLevel = level;
      this.ui.setThreat(level, surrounded ? "SURROUNDED" : undefined);
    }
  }

  updateHUD(dt) {
    this.hudAccumulator += dt;
    if (this.hudAccumulator < 0.1) return;
    this.hudAccumulator = 0;
    this.ui.setHUD({ timer: formatClock(this.elapsed) });
  }

  isCaught() {
    return this.shadows.some((shadow) => shadow.active && this.isCaughtBy(shadow));
  }

  isCaughtBy(shadow) {
    const distance = Math.hypot(
      this.player.pos.x - shadow.pos.x,
      this.player.pos.y - shadow.pos.y
    );
    if (distance >= CATCH_RADIUS) return false;
    if (this.maze.areConnected(this.player.cell, shadow.cell)) return true;
    if (
      this.player.target &&
      this.maze.areConnected(this.player.target, shadow.cell) &&
      distance < CATCH_RADIUS
    ) {
      return true;
    }
    return false;
  }

  catchPlayer() {
    this.state = "dying";
    this.input.setEnabled(false);
    this.input.clear();
    this.deathTime = this.elapsed;
    this.deathTimer = 0.9;
    this.audio.jumpscare();
    this.audio.stopAmbient();
    this.ui.flash();
    this.ui.setDanger(1);
    this.ui.setThreat(4);
    this.renderer.addShake(16, 0.85);
  }

  updateDying(dt) {
    this.deathTimer -= dt;
    if (this.deathTimer > 0) return;

    this.state = "gameover";
    this.audio.stopGameplay();
    this.audio.setPaused(false);
    this.renderer.resetEffects();
    const progress = this.storage.getProgress(this.difficulty.id);
    this.ui.showGameOver({
      time: this.deathTime,
      best: progress.best[this.levelIndex]
    });
  }

  winLevel() {
    if (this.state !== "playing") return;
    this.state = "escaped";
    this.input.setEnabled(false);
    this.input.clear();
    this.escapedTimer = 1;
    this.audio.victory();
    this.audio.stopAmbient();
    this.renderer.spawnExitBurst();
    this.renderer.addShake(3.5, 0.3);
    this.ui.setDanger(0);
    this.ui.setThreat(0);

    const timeMs = this.elapsed * 1000;
    const result = this.storage.completeLevel(
      this.difficulty.id,
      this.levelIndex,
      timeMs
    );
    this.lastResult = {
      time: this.elapsed,
      best: result.best,
      isBest: result.isBest
    };
  }

  updateEscaped(dt) {
    this.escapedTimer -= dt;
    if (this.escapedTimer > 0) return;

    this.state = "victory";
    const isFinal = this.levelIndex >= LEVELS.length - 1;
    this.ui.showVictory({
      time: this.lastResult.time,
      best: this.lastResult.best,
      isBest: this.lastResult.isBest,
      isFinal,
      levelIndex: this.levelIndex,
      difficultyIndex: this.difficultyIndex,
      progress: this.storage.getProgress(this.difficulty.id)
    });
  }

  render(dt) {
    this.renderer.render(this, Math.min(dt, 0.05));
  }
}
