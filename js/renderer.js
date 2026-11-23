import { Maze } from "./maze.js";
import { VIEW, UI_COLORS } from "./config.js";
import { clamp, mulberry32 } from "./utils.js";

const GAME_STATES_WITH_SCENE = new Set([
  "playing",
  "countdown",
  "paused",
  "dying",
  "escaped",
  "gameover",
  "victory"
]);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.W = VIEW.WIDTH;
    this.H = VIEW.HEIGHT;
    this.dpr = 1;
    this.time = 0;

    this.maze = null;
    this.layout = null;
    this.baseLayer = null;
    this.memoryLayer = null;
    this.fogLayer = null;

    this.trails = [];
    this.bursts = [];
    this.dust = [];
    this.shake = { timer: 0, duration: 0, intensity: 0 };
    this.screenShakeEnabled = true;
    this.lastTrailTime = 0;

    this.backdropMaze = new Maze(19, 13, 0x5eed1234);
    this.backdropLayout = null;

    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width || VIEW.WIDTH);
    const cssHeight = Math.max(1, rect.height || VIEW.HEIGHT);
    const scale = Math.max(cssWidth / 1280, cssHeight / 900, 1);

    this.W = Math.round(cssWidth / scale);
    this.H = Math.round(cssHeight / scale);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;

    this.backdropLayout = this.backdropMaze.layoutFor(this.W, this.H, {
      left: Math.max(24, this.W * 0.06),
      right: Math.max(24, this.W * 0.06),
      top: Math.max(24, this.H * 0.08),
      bottom: Math.max(24, this.H * 0.08)
    });

    if (this.maze) {
      this.layout = this.maze.layoutFor(this.W, this.H, VIEW.MARGIN);
      this.buildLayers();
    }

    this.createDust();
  }

  setMaze(maze, resetExploration = true) {
    this.maze = maze;
    this.layout = maze.layoutFor(this.W, this.H, VIEW.MARGIN);
    if (resetExploration) {
      maze.explored.fill(0);
      maze.exploredExit = false;
    }
    this.buildLayers();
    this.resetEffects();
    this.lastTrailTime = 0;
  }

  resetLevelVisuals(maze) {
    this.maze = maze;
    this.layout = maze.layoutFor(this.W, this.H, VIEW.MARGIN);
    maze.explored.fill(0);
    maze.exploredExit = false;
    this.buildLayers();
    this.resetEffects();
  }

  resetEffects() {
    this.trails = [];
    this.bursts = [];
    this.shake = { timer: 0, duration: 0, intensity: 0 };
  }

  addShake(intensity, duration) {
    this.shake = { intensity, duration, timer: duration };
  }

  createLayer() {
    const layer = document.createElement("canvas");
    layer.width = Math.max(1, Math.round(this.W * this.dpr));
    layer.height = Math.max(1, Math.round(this.H * this.dpr));
    return layer;
  }

  buildLayers() {
    this.baseLayer = this.createLayer();
    this.memoryLayer = this.createLayer();
    this.fogLayer = this.createLayer();
    this.drawBaseLayer();
    this.drawMemoryAll();
  }

  drawBaseLayer() {
    if (!this.maze || !this.layout) return;
    const ctx = this.baseLayer.getContext("2d");
    const { originX, originY, width, height, cell } = this.layout;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.fillStyle = UI_COLORS.background;
    ctx.fillRect(0, 0, this.W, this.H);

    const ambient = ctx.createRadialGradient(
      this.W * 0.5,
      this.H * 0.55,
      40,
      this.W * 0.5,
      this.H * 0.55,
      this.W * 0.62
    );
    ambient.addColorStop(0, "rgba(82, 54, 26, 0.24)");
    ambient.addColorStop(1, "rgba(3, 2, 1, 0)");
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.fillStyle = "rgba(20, 14, 9, 0.98)";
    ctx.fillRect(originX, originY, width, height);

    for (let y = 0; y < this.maze.rows; y += 1) {
      for (let x = 0; x < this.maze.cols; x += 1) {
        if ((x + y) % 2 === 0) continue;
        ctx.fillStyle = "rgba(58, 40, 23, 0.3)";
        ctx.fillRect(originX + x * cell, originY + y * cell, cell, cell);
      }
    }

    const textureRandom = mulberry32(this.maze.seed ^ 0x9e3779b9);
    for (let i = 0; i < 340; i += 1) {
      const px = originX + textureRandom() * width;
      const py = originY + textureRandom() * height;
      const size = textureRandom() * 1.2 + 0.3;
      ctx.fillStyle = `rgba(200, 164, 110, ${0.025 + textureRandom() * 0.04})`;
      ctx.fillRect(px, py, size, size);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.save();
    ctx.shadowColor = UI_COLORS.wallGlow;
    ctx.shadowBlur = Math.max(4, cell * 0.26);
    ctx.strokeStyle = "rgba(158, 112, 58, 0.52)";
    ctx.lineWidth = Math.max(1.2, cell * 0.065);
    this.traceWalls(ctx);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = UI_COLORS.wall;
    ctx.lineWidth = Math.max(1.2, cell * 0.06);
    this.traceWalls(ctx);
    ctx.stroke();

    const inset = Math.max(10, cell * 0.45);
    const edge = ctx.createRadialGradient(
      originX + width / 2,
      originY + height / 2,
      Math.min(width, height) * 0.2,
      originX + width / 2,
      originY + height / 2,
      Math.max(width, height) * 0.7
    );
    edge.addColorStop(0, "rgba(0, 0, 0, 0)");
    edge.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = edge;
    ctx.fillRect(originX - inset, originY - inset, width + inset * 2, height + inset * 2);
  }

  traceWalls(ctx) {
    const { originX, originY, cell } = this.layout;
    ctx.beginPath();
    for (let y = 0; y < this.maze.rows; y += 1) {
      for (let x = 0; x < this.maze.cols; x += 1) {
        const px = originX + x * cell;
        const py = originY + y * cell;

        if (this.maze.hasWall(x, y, "N")) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cell, py);
        }
        if (this.maze.hasWall(x, y, "W")) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cell);
        }
        if (y === this.maze.rows - 1 && this.maze.hasWall(x, y, "S")) {
          ctx.moveTo(px, py + cell);
          ctx.lineTo(px + cell, py + cell);
        }
        if (x === this.maze.cols - 1 && this.maze.hasWall(x, y, "E")) {
          ctx.moveTo(px + cell, py);
          ctx.lineTo(px + cell, py + cell);
        }
      }
    }
  }

  drawMemoryAll() {
    if (!this.maze || !this.memoryLayer) return;
    const ctx = this.memoryLayer.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.memoryLayer.width, this.memoryLayer.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    for (let y = 0; y < this.maze.rows; y += 1) {
      for (let x = 0; x < this.maze.cols; x += 1) {
        if (this.maze.explored[this.maze.index(x, y)]) this.drawMemoryCell(x, y, ctx);
      }
    }
    if (this.maze.exploredExit) this.drawMemoryExit(ctx);
  }

  drawMemoryCell(x, y, ctx = this.memoryLayer.getContext("2d")) {
    const { originX, originY, cell } = this.layout;
    const px = originX + x * cell;
    const py = originY + y * cell;

    ctx.fillStyle = "rgba(116, 80, 42, 0.2)";
    ctx.fillRect(px + 0.5, py + 0.5, cell - 1, cell - 1);

    ctx.strokeStyle = "rgba(198, 158, 100, 0.38)";
    ctx.lineWidth = Math.max(1, cell * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath();
    if (this.maze.hasWall(x, y, "N")) {
      ctx.moveTo(px, py);
      ctx.lineTo(px + cell, py);
    }
    if (this.maze.hasWall(x, y, "W")) {
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + cell);
    }
    if (y === this.maze.rows - 1 && this.maze.hasWall(x, y, "S")) {
      ctx.moveTo(px, py + cell);
      ctx.lineTo(px + cell, py + cell);
    }
    if (x === this.maze.cols - 1 && this.maze.hasWall(x, y, "E")) {
      ctx.moveTo(px + cell, py);
      ctx.lineTo(px + cell, py + cell);
    }
    ctx.stroke();
  }

  drawMemoryExit(ctx) {
    const { cell } = this.layout;
    const point = this.maze.cellToPixel(this.maze.exit.x, this.maze.exit.y, this.layout);
    ctx.fillStyle = "rgba(105, 255, 180, 0.55)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, cell * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }

  explore(cell, radius) {
    if (!this.maze || !this.layout) return;
    const context = this.memoryLayer.getContext("2d");
    const queue = [{ x: cell.x, y: cell.y, distance: 0 }];
    const seen = new Set([this.maze.index(cell.x, cell.y)]);

    while (queue.length > 0) {
      const current = queue.shift();
      const index = this.maze.index(current.x, current.y);
      if (!this.maze.explored[index]) {
        this.maze.explored[index] = 1;
        this.drawMemoryCell(current.x, current.y, context);
        if (current.x === this.maze.exit.x && current.y === this.maze.exit.y) {
          this.maze.exploredExit = true;
          this.drawMemoryExit(context);
        }
      }

      if (current.distance >= radius) continue;
      for (const neighbor of this.maze.getNeighbors(current.x, current.y)) {
        const nextIndex = this.maze.index(neighbor.x, neighbor.y);
        if (seen.has(nextIndex)) continue;
        seen.add(nextIndex);
        queue.push({ x: neighbor.x, y: neighbor.y, distance: current.distance + 1 });
      }
    }
  }

  createDust() {
    const random = mulberry32(0xd0571234);
    this.dust = [];
    for (let i = 0; i < 74; i += 1) {
      this.dust.push({
        x: random() * this.W,
        y: random() * this.H,
        size: 0.4 + random() * 1.3,
        speed: 2 + random() * 7,
        drift: random() * Math.PI * 2,
        alpha: 0.04 + random() * 0.12
      });
    }
  }

  updateEffects(dt, game) {
    this.time += dt;

    if (this.shake.timer > 0) this.shake.timer = Math.max(0, this.shake.timer - dt);

    const player = game.player;
    if (player && player.isMoving && ["playing", "escaped"].includes(game.state)) {
      if (this.time - this.lastTrailTime > 0.045) {
        this.lastTrailTime = this.time;
        this.trails.push({
          x: player.pos.x,
          y: player.pos.y,
          life: 0.55,
          maxLife: 0.55
        });
        if (this.trails.length > 26) this.trails.shift();
      }
    }

    for (const trail of this.trails) trail.life -= dt;
    this.trails = this.trails.filter((trail) => trail.life > 0);

    for (const burst of this.bursts) {
      burst.life -= dt;
      burst.x += burst.vx * dt;
      burst.y += burst.vy * dt;
      burst.vy += burst.gravity * dt;
      burst.vx *= 0.985;
    }
    this.bursts = this.bursts.filter((burst) => burst.life > 0);

    for (const mote of this.dust) {
      mote.y -= mote.speed * dt;
      mote.x += Math.sin(this.time * 0.35 + mote.drift) * 2.4 * dt;
      if (mote.y < -4) {
        mote.y = this.H + 4;
        mote.x = Math.random() * this.W;
      }
    }
  }

  getShakeOffset() {
    if (!this.screenShakeEnabled || this.shake.timer <= 0 || this.shake.duration <= 0) {
      return { x: 0, y: 0 };
    }
    const strength = this.shake.intensity * (this.shake.timer / this.shake.duration);
    return {
      x: (Math.random() * 2 - 1) * strength,
      y: (Math.random() * 2 - 1) * strength
    };
  }

  render(game, dt) {
    this.updateEffects(dt, game);
    if (game.maze && game.player && GAME_STATES_WITH_SCENE.has(game.state)) {
      this.drawScene(game);
    } else {
      this.drawBackdrop();
    }
  }

  drawBackdrop() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#080603";
    ctx.fillRect(0, 0, this.W, this.H);

    const redGlow = ctx.createRadialGradient(
      this.W * (0.78 + Math.sin(this.time * 0.11) * 0.04),
      this.H * 0.7,
      0,
      this.W * 0.78,
      this.H * 0.7,
      this.W * 0.38
    );
    redGlow.addColorStop(0, "rgba(110, 48, 18, 0.18)");
    redGlow.addColorStop(1, "rgba(34, 14, 4, 0)");
    ctx.fillStyle = redGlow;
    ctx.fillRect(0, 0, this.W, this.H);

    const { originX, originY, cell } = this.backdropLayout;
    ctx.save();
    ctx.translate(Math.sin(this.time * 0.08) * 14, Math.cos(this.time * 0.06) * 8);
    ctx.strokeStyle = "rgba(174, 128, 72, 0.11)";
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let y = 0; y < this.backdropMaze.rows; y += 1) {
      for (let x = 0; x < this.backdropMaze.cols; x += 1) {
        const px = originX + x * cell;
        const py = originY + y * cell;
        if (this.backdropMaze.hasWall(x, y, "N")) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cell, py);
        }
        if (this.backdropMaze.hasWall(x, y, "W")) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cell);
        }
        if (y === this.backdropMaze.rows - 1 && this.backdropMaze.hasWall(x, y, "S")) {
          ctx.moveTo(px, py + cell);
          ctx.lineTo(px + cell, py + cell);
        }
        if (x === this.backdropMaze.cols - 1 && this.backdropMaze.hasWall(x, y, "E")) {
          ctx.moveTo(px + cell, py);
          ctx.lineTo(px + cell, py + cell);
        }
      }
    }
    ctx.stroke();
    ctx.restore();

    const lantern = ctx.createRadialGradient(
      this.W * 0.52 + Math.sin(this.time * 0.21) * 60,
      this.H * 0.46,
      0,
      this.W * 0.52,
      this.H * 0.46,
      this.W * 0.42
    );
    lantern.addColorStop(0, "rgba(198, 149, 80, 0.07)");
    lantern.addColorStop(1, "rgba(28, 18, 8, 0)");
    ctx.fillStyle = lantern;
    ctx.fillRect(0, 0, this.W, this.H);

    for (const mote of this.dust) {
      const blink = 0.5 + 0.5 * Math.sin(this.time * 0.8 + mote.drift);
      ctx.fillStyle = `rgba(220, 190, 145, ${mote.alpha * blink})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawScene(game) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#020305";
    ctx.fillRect(0, 0, this.W, this.H);

    const shake = this.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    ctx.drawImage(this.baseLayer, 0, 0, this.W, this.H);
    this.drawTrails(game);
    this.drawExit(game);
    this.drawShadow(game);
    this.drawPlayer(game);
    this.drawDust();

    this.drawFog(game);

    ctx.globalAlpha = 0.62;
    ctx.drawImage(this.memoryLayer, 0, 0, this.W, this.H);
    ctx.globalAlpha = 1;

    this.drawLightWash(game);
    this.drawExitBeacon(game);
    this.drawBursts();
    this.drawStateTint(game);

    ctx.restore();
  }

  tilePixel(tileX, tileY) {
    return this.maze.tileToPixel(tileX, tileY, this.layout);
  }

  drawTrails(game) {
    const ctx = this.ctx;
    const { cell } = this.layout;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const trail of this.trails) {
      const point = this.tilePixel(trail.x, trail.y);
      const alpha = (trail.life / trail.maxLife) * 0.2;
      ctx.fillStyle = `rgba(216, 176, 112, ${alpha})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, cell * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawDust() {
    const ctx = this.ctx;
    ctx.save();
    for (const mote of this.dust) {
      const blink = 0.5 + 0.5 * Math.sin(this.time * 0.8 + mote.drift);
      ctx.fillStyle = `rgba(220, 190, 145, ${mote.alpha * blink * 0.7})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlayer(game) {
    if (!game.player) return;
    const ctx = this.ctx;
    const { cell } = this.layout;
    const point = this.tilePixel(game.player.pos.x, game.player.pos.y);
    const pulse = 1 + Math.sin(this.time * 5.2) * 0.05;
    const dead = game.state === "gameover" || game.state === "dying";
    const alpha = dead ? 0.35 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      cell * 2.35 * pulse
    );
    glow.addColorStop(0, "rgba(224, 184, 118, 0.5)");
    glow.addColorStop(0.3, "rgba(184, 136, 72, 0.22)");
    glow.addColorStop(1, "rgba(48, 30, 12, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, cell * 2.35 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(point.x, point.y);
    const angle = Math.atan2(game.player.facing.y, game.player.facing.x);
    ctx.rotate(angle);

    ctx.shadowColor = "rgba(224, 184, 118, 0.9)";
    ctx.shadowBlur = cell * 0.45;
    ctx.fillStyle = "#f7e8c8";
    ctx.beginPath();
    ctx.moveTo(cell * 0.22, 0);
    ctx.lineTo(-cell * 0.13, -cell * 0.17);
    ctx.lineTo(-cell * 0.06, 0);
    ctx.lineTo(-cell * 0.13, cell * 0.17);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 246, 226, 0.92)";
    ctx.beginPath();
    ctx.arc(cell * 0.055, 0, cell * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (game.state === "escaped") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const burst = ctx.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        cell * 4
      );
      burst.addColorStop(0, "rgba(120, 255, 195, 0.3)");
      burst.addColorStop(1, "rgba(60, 255, 160, 0)");
      ctx.fillStyle = burst;
      ctx.fillRect(point.x - cell * 4, point.y - cell * 4, cell * 8, cell * 8);
      ctx.restore();
    }
  }

  drawShadow(game) {
    const shadow = game.shadow;
    if (!shadow || !shadow.active) return;
    const ctx = this.ctx;
    const { cell } = this.layout;
    const point = this.tilePixel(shadow.pos.x, shadow.pos.y);
    const dying = game.state === "dying";
    const lunge = dying ? 1 + (1 - clamp(game.deathTimer / 0.9, 0, 1)) * 0.8 : 1;
    const pulse = 1 + Math.sin(this.time * 3.1) * 0.06;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(lunge, lunge);

    const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, cell * 0.92);
    aura.addColorStop(0, "rgba(6, 3, 2, 0.98)");
    aura.addColorStop(0.48, "rgba(12, 6, 4, 0.86)");
    aura.addColorStop(0.76, "rgba(46, 16, 8, 0.26)");
    aura.addColorStop(1, "rgba(48, 16, 6, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, cell * 0.92, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(0, -cell * 0.02, 0, 0, 0, cell * 0.46);
    core.addColorStop(0, "rgba(0, 0, 0, 1)");
    core.addColorStop(0.7, "rgba(3, 1, 5, 0.96)");
    core.addColorStop(1, "rgba(5, 2, 9, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(0, 0, cell * 0.34 * pulse, cell * 0.42 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 6; i += 1) {
      const angle = this.time * 0.65 + i * 1.12;
      const orbit = cell * (0.16 + 0.06 * Math.sin(this.time * 1.7 + i));
      const sx = Math.cos(angle) * orbit;
      const sy = Math.sin(angle) * orbit * 0.9 - cell * 0.06;
      const radius = cell * (0.17 + 0.05 * Math.sin(this.time * 2.2 + i));
      const smoke = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      smoke.addColorStop(0, "rgba(2, 1, 4, 0.92)");
      smoke.addColorStop(1, "rgba(10, 0, 8, 0)");
      ctx.fillStyle = smoke;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(140, 54, 34, 0.16)";
    ctx.lineWidth = Math.max(1, cell * 0.025);
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i += 1) {
      const angle = this.time * 0.4 + i * 2.1;
      const offset = cell * 0.23;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * offset, Math.sin(angle) * offset);
      ctx.quadraticCurveTo(
        Math.cos(angle + 0.9) * cell * 0.48,
        Math.sin(angle + 0.9) * cell * 0.48,
        Math.cos(angle + 1.5) * cell * 0.3,
        Math.sin(angle + 1.5) * cell * 0.3 - cell * 0.2
      );
      ctx.stroke();
    }

    ctx.shadowColor = "rgba(220, 74, 56, 0.95)";
    ctx.shadowBlur = cell * 0.55;
    ctx.fillStyle = "#d45b4a";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(
        side * cell * 0.105,
        -cell * 0.055,
        cell * 0.048,
        cell * 0.073,
        side * 0.15,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  drawExit(game) {
    const exit = game.maze.exit;
    const point = this.maze.cellToPixel(exit.x, exit.y, this.layout);
    const ctx = this.ctx;
    const { cell } = this.layout;
    const pulse = 0.72 + Math.sin(this.time * 2.5) * 0.28;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, cell * 1.7);
    glow.addColorStop(0, `rgba(105, 255, 180, ${0.17 + pulse * 0.1})`);
    glow.addColorStop(1, "rgba(40, 200, 120, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, cell * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const doorwayWidth = cell * 0.46;
    const doorwayHeight = cell * 0.6;
    const left = point.x - doorwayWidth / 2;
    const top = point.y - doorwayHeight / 2;
    const corner = doorwayWidth / 2;

    ctx.save();
    ctx.shadowColor = "rgba(105, 255, 180, 0.9)";
    ctx.shadowBlur = cell * (0.32 + pulse * 0.25);
    ctx.fillStyle = "rgba(8, 28, 22, 0.92)";
    ctx.strokeStyle = "rgba(110, 255, 190, 0.9)";
    ctx.lineWidth = Math.max(1.2, cell * 0.055);

    ctx.beginPath();
    ctx.moveTo(left, top + doorwayHeight);
    ctx.lineTo(left, top + corner);
    ctx.quadraticCurveTo(point.x, top - corner * 0.25, left + doorwayWidth, top + corner);
    ctx.lineTo(left + doorwayWidth, top + doorwayHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const inside = ctx.createLinearGradient(left, top, left, top + doorwayHeight);
    inside.addColorStop(0, "rgba(200, 255, 225, 0.75)");
    inside.addColorStop(1, "rgba(60, 255, 155, 0.08)");
    ctx.fillStyle = inside;
    ctx.fillRect(left + cell * 0.1, top + cell * 0.12, doorwayWidth - cell * 0.2, doorwayHeight - cell * 0.12);
    ctx.restore();
  }

  drawExitBeacon(game) {
    if (!game.player) return;
    const ctx = this.ctx;
    const point = this.maze.cellToPixel(game.maze.exit.x, game.maze.exit.y, this.layout);
    const { cell } = this.layout;
    const distance = Math.hypot(
      game.player.pos.x - (game.maze.exit.x + 0.5),
      game.player.pos.y - (game.maze.exit.y + 0.5)
    );
    const urgency = clamp((game.elapsed - 40) / 40, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.2);
    const alpha = 0.085 + pulse * 0.05 + urgency * 0.04;

    if (distance < 2.2) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, cell * 2.2);
    glow.addColorStop(0, `rgba(105, 255, 180, ${alpha})`);
    glow.addColorStop(1, "rgba(60, 255, 170, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, cell * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFog(game) {
    if (!this.fogLayer || !game.player) return;
    const ctx = this.fogLayer.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.fogLayer.width, this.fogLayer.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    ctx.fillStyle = "rgba(4, 3, 2, 0.965)";
    ctx.fillRect(0, 0, this.W, this.H);

    const point = this.tilePixel(game.player.pos.x, game.player.pos.y);
    const flicker = 1 + Math.sin(this.time * 8.7) * 0.018 + Math.sin(this.time * 2.3) * 0.012;
    const radius = game.lightRadius * this.layout.cell * flicker;

    ctx.globalCompositeOperation = "destination-out";
    const light = ctx.createRadialGradient(
      point.x,
      point.y,
      Math.max(2, radius * 0.08),
      point.x,
      point.y,
      radius
    );
    light.addColorStop(0, "rgba(0, 0, 0, 1)");
    light.addColorStop(0.62, "rgba(0, 0, 0, 0.96)");
    light.addColorStop(0.84, "rgba(0, 0, 0, 0.58)");
    light.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    this.ctx.drawImage(this.fogLayer, 0, 0, this.W, this.H);
  }

  drawLightWash(game) {
    if (!game.player) return;
    const ctx = this.ctx;
    const point = this.tilePixel(game.player.pos.x, game.player.pos.y);
    const radius = game.lightRadius * this.layout.cell * 1.1;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const wash = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    wash.addColorStop(0, "rgba(198, 149, 80, 0.1)");
    wash.addColorStop(1, "rgba(48, 30, 12, 0)");
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  spawnExitBurst() {
    if (!this.maze) return;
    const point = this.maze.cellToPixel(this.maze.exit.x, this.maze.exit.y, this.layout);
    for (let i = 0; i < 42; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 24 + Math.random() * 120;
      this.bursts.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        gravity: 26,
        life: 0.7 + Math.random() * 0.9,
        maxLife: 1.6,
        size: 1 + Math.random() * 2.4,
        color: Math.random() > 0.35 ? "105, 255, 180" : "215, 255, 235"
      });
    }
  }

  drawBursts() {
    if (this.bursts.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const burst of this.bursts) {
      const alpha = clamp(burst.life / burst.maxLife, 0, 1);
      ctx.fillStyle = `rgba(${burst.color}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, burst.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawStateTint(game) {
    if (game.state === "dying") {
      const strength = clamp(game.deathTimer / 0.9, 0, 1);
      this.ctx.fillStyle = `rgba(122, 38, 18, ${0.08 + strength * 0.18})`;
      this.ctx.fillRect(0, 0, this.W, this.H);
    } else if (game.state === "escaped") {
      this.ctx.fillStyle = "rgba(55, 255, 170, 0.045)";
      this.ctx.fillRect(0, 0, this.W, this.H);
    }
  }
}
