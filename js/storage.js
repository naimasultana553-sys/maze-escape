import { DIFFICULTIES, SETTINGS_DEFAULTS } from "./config.js";

const SAVE_KEY = "mazeEscape.save.v1";

function defaultProgress() {
  const progress = {};
  for (const difficulty of DIFFICULTIES) {
    progress[difficulty.id] = {
      unlocked: 1,
      best: [null, null, null]
    };
  }
  return progress;
}

function defaultData() {
  return {
    version: 1,
    settings: { ...SETTINGS_DEFAULTS },
    progress: defaultProgress()
  };
}

function sanitizeNumber(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export class Storage {
  constructor() {
    this.data = this.load();
  }

  load() {
    const fallback = defaultData();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return fallback;

      const settings = parsed.settings || {};
      fallback.settings.volume = sanitizeNumber(settings.volume, SETTINGS_DEFAULTS.volume, 0, 1);
      fallback.settings.muted = Boolean(settings.muted);
      fallback.settings.screenShake =
        settings.screenShake === undefined ? true : Boolean(settings.screenShake);
      fallback.settings.reducedFlash = Boolean(settings.reducedFlash);

      for (const difficulty of DIFFICULTIES) {
        const saved = parsed.progress?.[difficulty.id];
        if (!saved) continue;
        const target = fallback.progress[difficulty.id];
        target.unlocked = sanitizeNumber(Number(saved.unlocked), 1, 1, 3);
        for (let i = 0; i < 3; i += 1) {
          const best = Number(saved.best?.[i]);
          target.best[i] = Number.isFinite(best) && best > 0 ? best : null;
        }
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage can be unavailable in private mode. The game still works for this session.
    }
  }

  get settings() {
    return this.data.settings;
  }

  updateSettings(partial) {
    this.data.settings = { ...this.data.settings, ...partial };
    this.data.settings.volume = sanitizeNumber(this.data.settings.volume, 0.65, 0, 1);
    this.save();
    return this.data.settings;
  }

  getProgress(difficultyId) {
    return this.data.progress[difficultyId] || { unlocked: 1, best: [null, null, null] };
  }

  isUnlocked(difficultyId, levelIndex) {
    return levelIndex < this.getProgress(difficultyId).unlocked;
  }

  completeLevel(difficultyId, levelIndex, timeMs) {
    const progress = this.data.progress[difficultyId];
    if (!progress) {
      return { isBest: false, best: null, unlocked: 1 };
    }

    const previousBest = progress.best[levelIndex];
    const isBest = previousBest === null || timeMs < previousBest;
    if (isBest) progress.best[levelIndex] = Math.round(timeMs);

    progress.unlocked = Math.max(progress.unlocked, Math.min(3, levelIndex + 2));
    this.save();

    return { isBest, best: progress.best[levelIndex], unlocked: progress.unlocked };
  }

  resetProgress() {
    this.data.progress = defaultProgress();
    this.save();
  }

  resetAll() {
    this.data = defaultData();
    this.save();
  }
}
