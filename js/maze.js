import { DIRS, DIR_LIST, mulberry32, shuffle } from "./utils.js";

export const WALL = {
  N: 1,
  E: 2,
  S: 4,
  W: 8
};

export class Maze {
  constructor(cols, rows, seed) {
    this.cols = cols;
    this.rows = rows;
    this.seed = seed >>> 0;
    this.walls = new Uint8Array(cols * rows);
    this.walls.fill(15);
    this.explored = new Uint8Array(cols * rows);
    this.exploredExit = false;

    const random = mulberry32(this.seed);
    this.generate(random);
    this.braid(random);

    this.start = this.pickStart(random);
    const distances = this.bfs(this.start.x, this.start.y);
    this.exit = this.pickExit(distances);
    this.shadowStart = this.pickShadowStart(distances);
  }

  index(x, y) {
    return y * this.cols + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  hasWall(x, y, direction) {
    if (!this.inBounds(x, y)) return true;
    return (this.walls[this.index(x, y)] & DIRS[direction].bit) !== 0;
  }

  carveBetween(x, y, nx, ny, direction) {
    const opposite = DIR_LIST.find((name) => DIRS[name].opposite === DIRS[direction].bit);
    this.walls[this.index(x, y)] &= ~DIRS[direction].bit;
    this.walls[this.index(nx, ny)] &= ~DIRS[opposite].bit;
  }

  generate(random) {
    const visited = new Uint8Array(this.cols * this.rows);
    const startX = 0;
    const startY = 0;
    const stack = [{ x: startX, y: startY }];
    visited[this.index(startX, startY)] = 1;

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const candidates = [];

      for (const direction of DIR_LIST) {
        const vector = DIRS[direction];
        const nx = current.x + vector.dx;
        const ny = current.y + vector.dy;
        if (!this.inBounds(nx, ny)) continue;
        if (visited[this.index(nx, ny)]) continue;
        candidates.push({ x: nx, y: ny, direction });
      }

      if (candidates.length === 0) {
        stack.pop();
        continue;
      }

      const chosen = candidates[Math.floor(random() * candidates.length)];
      this.carveBetween(current.x, current.y, chosen.x, chosen.y, chosen.direction);
      visited[this.index(chosen.x, chosen.y)] = 1;
      stack.push({ x: chosen.x, y: chosen.y });
    }
  }

  braid(random) {
    const candidates = [];
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        if (x < this.cols - 1 && this.hasWall(x, y, "E")) {
          candidates.push({ x, y, direction: "E" });
        }
        if (y < this.rows - 1 && this.hasWall(x, y, "S")) {
          candidates.push({ x, y, direction: "S" });
        }
      }
    }

    shuffle(candidates, random);
    const removals = Math.floor(candidates.length * 0.12);
    for (let i = 0; i < removals; i += 1) {
      const { x, y, direction } = candidates[i];
      const vector = DIRS[direction];
      this.carveBetween(x, y, x + vector.dx, y + vector.dy, direction);
    }
  }

  pickStart(random) {
    const corners = [
      { x: 0, y: 0 },
      { x: this.cols - 1, y: 0 },
      { x: this.cols - 1, y: this.rows - 1 },
      { x: 0, y: this.rows - 1 }
    ];
    return corners[Math.floor(random() * corners.length)];
  }

  pickExit(distances) {
    let best = this.start;
    let bestDistance = -1;
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const distance = distances.dist[this.index(x, y)];
        if (distance > bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return best;
  }

  pickShadowStart(distances) {
    let best = null;
    let bestDistance = -1;
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        if (x === this.exit.x && y === this.exit.y) continue;
        if (x === this.start.x && y === this.start.y) continue;
        const distance = distances.dist[this.index(x, y)];
        if (distance > bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return best || { ...this.start };
  }

  getNeighbors(x, y) {
    const neighbors = [];
    for (const direction of DIR_LIST) {
      const vector = DIRS[direction];
      const nx = x + vector.dx;
      const ny = y + vector.dy;
      if (!this.inBounds(nx, ny)) continue;
      if (this.hasWall(x, y, direction)) continue;
      neighbors.push({ x: nx, y: ny, direction });
    }
    return neighbors;
  }

  canMove(cell, direction) {
    if (!cell || !DIRS[direction]) return false;
    const vector = DIRS[direction];
    const nx = cell.x + vector.dx;
    const ny = cell.y + vector.dy;
    if (!this.inBounds(nx, ny)) return false;
    return !this.hasWall(cell.x, cell.y, direction);
  }

  bfs(startX, startY) {
    const size = this.cols * this.rows;
    const dist = new Int32Array(size);
    const prev = new Int32Array(size);
    dist.fill(-1);
    prev.fill(-1);

    const queue = new Int32Array(size);
    let head = 0;
    let tail = 0;
    const startIndex = this.index(startX, startY);
    dist[startIndex] = 0;
    queue[tail++] = startIndex;

    while (head < tail) {
      const current = queue[head++];
      const x = current % this.cols;
      const y = Math.floor(current / this.cols);

      for (const neighbor of this.getNeighbors(x, y)) {
        const next = this.index(neighbor.x, neighbor.y);
        if (dist[next] !== -1) continue;
        dist[next] = dist[current] + 1;
        prev[next] = current;
        queue[tail++] = next;
      }
    }

    return { dist, prev };
  }

  getPath(start, end) {
    if (!start || !end) return [];
    if (!this.inBounds(start.x, start.y) || !this.inBounds(end.x, end.y)) return [];
    const { dist, prev } = this.bfs(start.x, start.y);
    const endIndex = this.index(end.x, end.y);
    if (dist[endIndex] === -1) return [];

    const path = [];
    let cursor = endIndex;
    while (cursor !== -1) {
      path.push({ x: cursor % this.cols, y: Math.floor(cursor / this.cols) });
      if (cursor === this.index(start.x, start.y)) break;
      cursor = prev[cursor];
    }
    path.reverse();
    return path;
  }

  areConnected(a, b) {
    if (!a || !b) return false;
    if (a.x === b.x && a.y === b.y) return true;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const direction = dx === 1 ? "E" : dx === -1 ? "W" : dy === 1 ? "S" : "N";
    return !this.hasWall(a.x, a.y, direction);
  }

  layoutFor(width, height, margin) {
    const availableWidth = width - margin.left - margin.right;
    const availableHeight = height - margin.top - margin.bottom;
    const cell = Math.max(
      8,
      Math.min(availableWidth / this.cols, availableHeight / this.rows)
    );
    const mazeWidth = cell * this.cols;
    const mazeHeight = cell * this.rows;
    const originX = margin.left + (availableWidth - mazeWidth) / 2;
    const originY = margin.top + (availableHeight - mazeHeight) / 2;

    return { cell, originX, originY, width: mazeWidth, height: mazeHeight };
  }

  tileToPixel(tileX, tileY, layout) {
    return {
      x: layout.originX + tileX * layout.cell,
      y: layout.originY + tileY * layout.cell
    };
  }

  cellToPixel(cellX, cellY, layout) {
    return this.tileToPixel(cellX + 0.5, cellY + 0.5, layout);
  }
}
