import { Game } from "./game.js";
import { Storage } from "./storage.js";
import { Input } from "./input.js";
import { AudioManager } from "./audio.js";

const canvas = document.getElementById("game-canvas");
const storage = new Storage();
const input = new Input();
const audio = new AudioManager(storage.settings);
const game = new Game({ canvas, storage, audio, input });

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  game.update(dt);
  game.render(dt);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener("pointerdown", () => audio.unlock());
window.addEventListener("keydown", () => audio.unlock());

// Convenient for debugging in the browser console.
window.__MAZE_ESCAPE__ = game;
