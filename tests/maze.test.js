import test from "node:test";
import assert from "node:assert/strict";
import { Maze } from "../js/maze.js";
import { DIFFICULTIES, CHAPTERS } from "../js/config.js";
import { hashString } from "../js/utils.js";

function mazeFor(difficulty, levelIndex) {
  const [cols, rows] = difficulty.sizes[levelIndex];
  const seed = hashString(`${difficulty.id}-${levelIndex + 1}-v1`);
  return new Maze(cols, rows, seed);
}

test("all nine levels generate solvable mazes", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let level = 0; level < CHAPTERS.length; level += 1) {
      const maze = mazeFor(difficulty, level);
      const path = maze.getPath(maze.start, maze.exit);
      assert.ok(path.length > 2, `${difficulty.id} level ${level + 1} has no path`);
      assert.deepEqual(path[0], maze.start);
      assert.deepEqual(path[path.length - 1], maze.exit);

      for (let i = 1; i < path.length; i += 1) {
        assert.ok(
          maze.areConnected(path[i - 1], path[i]),
          `${difficulty.id} level ${level + 1} path crosses a wall`
        );
      }
    }
  }
});

test("maze generation is deterministic for a seed", () => {
  const first = new Maze(25, 17, 123456);
  const second = new Maze(25, 17, 123456);
  assert.deepEqual(Array.from(first.walls), Array.from(second.walls));
  assert.deepEqual(first.exit, second.exit);
  assert.deepEqual(first.shadowStart, second.shadowStart);
});

test("outer boundary remains sealed", () => {
  for (const difficulty of DIFFICULTIES) {
    const maze = mazeFor(difficulty, 2);
    for (let x = 0; x < maze.cols; x += 1) {
      assert.ok(maze.hasWall(x, 0, "N"));
      assert.ok(maze.hasWall(x, maze.rows - 1, "S"));
    }
    for (let y = 0; y < maze.rows; y += 1) {
      assert.ok(maze.hasWall(0, y, "W"));
      assert.ok(maze.hasWall(maze.cols - 1, y, "E"));
    }
  }
});

test("exit is placed at a farthest reachable cell", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let level = 0; level < CHAPTERS.length; level += 1) {
      const maze = mazeFor(difficulty, level);
      const distances = maze.bfs(maze.start.x, maze.start.y);
      const exitDistance = distances.dist[maze.index(maze.exit.x, maze.exit.y)];
      let maximum = 0;
      for (const distance of distances.dist) maximum = Math.max(maximum, distance);
      assert.equal(exitDistance, maximum);
    }
  }
});

test("shadow starts far from the player and can reach them", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let level = 0; level < CHAPTERS.length; level += 1) {
      const maze = mazeFor(difficulty, level);
      assert.notDeepEqual(maze.shadowStart, maze.start);
      const path = maze.getPath(maze.shadowStart, maze.start);
      assert.ok(path.length > 4, `${difficulty.id} level ${level + 1} shadow starts too close`);
    }
  }
});

test("BFS distance and path length agree", () => {
  const maze = new Maze(21, 15, 98765);
  const path = maze.getPath(maze.start, maze.exit);
  const distances = maze.bfs(maze.start.x, maze.start.y);
  assert.equal(distances.dist[maze.index(maze.exit.x, maze.exit.y)], path.length - 1);
});
