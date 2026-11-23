import { SHADOW_RAMP_SECONDS } from "./config.js";
import { clamp } from "./utils.js";

export class Shadow {
  constructor(maze, startCell, config) {
    this.maze = maze;
    this.config = config;
    this.index = config.index || 0;
    this.startCell = { ...startCell };
    this.reset();
  }

  reset() {
    this.cell = { ...this.startCell };
    this.pos = { x: this.cell.x + 0.5, y: this.cell.y + 0.5 };
    this.target = null;
    this.active = false;
    this.activeTime = 0;
    this.pathLength = Infinity;
    this.hudTimer = 0;
  }

  get speed() {
    if (!this.active) return 0;
    const ramp = clamp(this.activeTime / SHADOW_RAMP_SECONDS, 0, 1);
    return this.config.baseSpeed + (this.config.maxSpeed - this.config.baseSpeed) * ramp;
  }

  update(dt, player, elapsed) {
    if (!this.active) {
      if (elapsed >= this.config.wakeDelay) {
        this.active = true;
        this.activeTime = 0;
        return "woke";
      }
      return null;
    }

    this.activeTime += dt;
    this.hudTimer -= dt;

    if (this.hudTimer <= 0) {
      this.hudTimer = 0.3;
      const result = this.maze.bfs(this.cell.x, this.cell.y);
      const distance = result.dist[this.maze.index(player.cell.x, player.cell.y)];
      this.pathLength = distance === -1 ? Infinity : distance;
    }

    if (!this.target) {
      const path = this.maze.getPath(this.cell, player.cell);
      if (path.length > 1) {
        this.target = { ...path[1] };
      } else {
        this.pathLength = Math.max(0, path.length - 1);
      }
    }

    if (this.target) {
      const targetX = this.target.x + 0.5;
      const targetY = this.target.y + 0.5;
      const dx = targetX - this.pos.x;
      const dy = targetY - this.pos.y;
      const remaining = Math.hypot(dx, dy);
      const travel = this.speed * dt;

      if (remaining <= travel || remaining < 0.0001) {
        this.pos.x = targetX;
        this.pos.y = targetY;
        this.cell = { ...this.target };
        this.target = null;
      } else {
        this.pos.x += (dx / remaining) * travel;
        this.pos.y += (dy / remaining) * travel;
      }
    }

    return null;
  }
}
