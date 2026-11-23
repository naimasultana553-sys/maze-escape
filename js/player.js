import { PLAYER_SPEED } from "./config.js";
import { DIR_VECTORS } from "./utils.js";

export class Player {
  constructor(maze, startCell) {
    this.maze = maze;
    this.cell = { ...startCell };
    this.pos = { x: startCell.x + 0.5, y: startCell.y + 0.5 };
    this.target = null;
    this.facing = { x: 1, y: 0 };
    this.moving = false;
    this.stepCount = 0;
  }

  reset(startCell) {
    this.cell = { ...startCell };
    this.pos = { x: startCell.x + 0.5, y: startCell.y + 0.5 };
    this.target = null;
    this.facing = { x: 1, y: 0 };
    this.moving = false;
    this.stepCount = 0;
  }

  update(dt, direction) {
    if (this.target) {
      this.advance(dt);
    }

    if (!this.target && direction) {
      this.beginMove(direction);
    }

    if (this.target) {
      this.advance(dt);
    }
  }

  beginMove(direction) {
    const vector = DIR_VECTORS[direction];
    if (!vector) return false;
    if (!this.maze.canMove(this.cell, direction)) return false;

    this.facing = { ...vector };
    this.target = {
      x: this.cell.x + vector.x,
      y: this.cell.y + vector.y
    };
    this.moving = true;
    this.stepCount += 1;
    return true;
  }

  advance(dt) {
    const targetX = this.target.x + 0.5;
    const targetY = this.target.y + 0.5;
    const dx = targetX - this.pos.x;
    const dy = targetY - this.pos.y;
    const remaining = Math.hypot(dx, dy);
    const travel = PLAYER_SPEED * dt;

    if (remaining <= travel || remaining < 0.0001) {
      this.pos.x = targetX;
      this.pos.y = targetY;
      this.cell = { ...this.target };
      this.target = null;
      this.moving = false;
      return;
    }

    this.pos.x += (dx / remaining) * travel;
    this.pos.y += (dy / remaining) * travel;
  }

  get isMoving() {
    return Boolean(this.target);
  }
}
