import test from "node:test";
import assert from "node:assert/strict";
import { Maze } from "../js/maze.js";
import { DIFFICULTIES, LEVELS } from "../js/config.js";
import { hashString } from "../js/utils.js";

function seedFor(difficulty, levelIndex) {
  return hashString(`${difficulty.id}-${difficulty.seedBase}-${levelIndex + 1}-v1`);
}

function mazeFor(difficulty, levelIndex) {
  const [cols, rows] = difficulty.sizes[levelIndex];
  return new Maze(cols, rows, seedFor(difficulty, levelIndex));
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

test("eighteen levels generate solvable mazes", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let level = 0; level < LEVELS.length; level += 1) {
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

test("all level seeds are unique", () => {
  const seeds = new Set();
  for (const difficulty of DIFFICULTIES) {
    for (let level = 0; level < LEVELS.length; level += 1) {
      const seed = seedFor(difficulty, level);
      assert.ok(!seeds.has(seed), `${difficulty.id} level ${level + 1} reuses a seed`);
      seeds.add(seed);
    }
  }
  assert.equal(seeds.size, DIFFICULTIES.length * LEVELS.length);
});

test("outer boundary remains sealed", () => {
  for (const difficulty of DIFFICULTIES) {
    const maze = mazeFor(difficulty, LEVELS.length - 1);
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
    for (let level = 0; level < LEVELS.length; level += 1) {
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
    for (let level = 0; level < LEVELS.length; level += 1) {
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

test("levels are uniquely labelled and described", () => {
  assert.equal(LEVELS.length, 6);
  assert.deepEqual(
    LEVELS.map((level) => level.label),
    ["LEVEL 1", "LEVEL 2", "LEVEL 3", "LEVEL 4", "LEVEL 5", "LEVEL 6"]
  );
  assert.equal(new Set(LEVELS.map((level) => level.title)).size, LEVELS.length);
  assert.equal(new Set(LEVELS.map((level) => level.story)).size, LEVELS.length);
});

test("each difficulty has six unique, progressively harder tuning values", () => {
  const signatures = new Set();

  for (const difficulty of DIFFICULTIES) {
    const arrays = [
      difficulty.sizes,
      difficulty.shadowSpeed,
      difficulty.shadowMax,
      difficulty.wakeDelay,
      difficulty.lightRadius
    ];
    for (const values of arrays) assert.equal(values.length, LEVELS.length);

    assert.equal(new Set(difficulty.sizes.map(String)).size, LEVELS.length);
    assert.equal(new Set(difficulty.shadowSpeed).size, LEVELS.length);
    assert.equal(new Set(difficulty.shadowMax).size, LEVELS.length);
    assert.equal(new Set(difficulty.wakeDelay).size, LEVELS.length);
    assert.equal(new Set(difficulty.lightRadius).size, LEVELS.length);

    for (let level = 0; level < LEVELS.length; level += 1) {
      const [cols, rows] = difficulty.sizes[level];
      signatures.add(
        [cols, rows, ...difficulty.shadowSpeed.slice(level, level + 1),
          ...difficulty.shadowMax.slice(level, level + 1),
          ...difficulty.wakeDelay.slice(level, level + 1),
          ...difficulty.lightRadius.slice(level, level + 1)].join("|")
      );
    }

    for (let level = 1; level < LEVELS.length; level += 1) {
      const [cols, rows] = difficulty.sizes[level];
      const [previousCols, previousRows] = difficulty.sizes[level - 1];
      assert.ok(cols * rows > previousCols * previousRows, `${difficulty.id} maze did not grow`);
      assert.ok(difficulty.shadowSpeed[level] > difficulty.shadowSpeed[level - 1]);
      assert.ok(difficulty.shadowMax[level] > difficulty.shadowMax[level - 1]);
      assert.ok(difficulty.wakeDelay[level] < difficulty.wakeDelay[level - 1]);
      assert.ok(difficulty.lightRadius[level] < difficulty.lightRadius[level - 1]);
    }
  }

  assert.equal(signatures.size, DIFFICULTIES.length * LEVELS.length);
});

test("difficulties emphasize different challenges", () => {
  const [easy, medium, hard] = DIFFICULTIES;

  assert.ok(average(easy.shadowSpeed) < average(medium.shadowSpeed));
  assert.ok(average(medium.shadowSpeed) < average(hard.shadowSpeed));

  assert.ok(average(easy.lightRadius) > average(medium.lightRadius));
  assert.ok(average(medium.lightRadius) > average(hard.lightRadius));

  assert.ok(easy.wakeDelay[0] > medium.wakeDelay[0]);
  assert.ok(medium.wakeDelay[0] > hard.wakeDelay[0]);
  assert.ok(hard.wakeDelay[LEVELS.length - 1] < medium.wakeDelay[LEVELS.length - 1]);

  const lightDrop = (values) => values[0] - values[LEVELS.length - 1];
  assert.ok(lightDrop(hard.lightRadius) > lightDrop(easy.lightRadius));
  assert.ok(lightDrop(hard.lightRadius) > lightDrop(medium.lightRadius));
});
