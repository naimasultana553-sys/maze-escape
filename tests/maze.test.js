import test from "node:test";
import assert from "node:assert/strict";
import { Maze } from "../js/maze.js";
import { Shadow } from "../js/shadow.js";
import { DIFFICULTIES, LEVELS } from "../js/config.js";
import { flickerFactor, hashString } from "../js/utils.js";

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
  assert.deepEqual(first.shadowStarts, second.shadowStarts);
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

test("every difficulty ramps from one hunter to six", () => {
  for (const difficulty of DIFFICULTIES) {
    assert.deepEqual(difficulty.shadowCount, [1, 2, 3, 4, 5, 6]);
    assert.equal(difficulty.extraWakeGap.length, LEVELS.length);
    assert.equal(difficulty.extraSpeedScale.length, LEVELS.length);

    for (let level = 1; level < LEVELS.length; level += 1) {
      assert.ok(
        difficulty.extraWakeGap[level] < difficulty.extraWakeGap[level - 1],
        `${difficulty.id} extra hunters did not wake faster at level ${level + 1}`
      );
      assert.ok(
        difficulty.extraSpeedScale[level] >= difficulty.extraSpeedScale[level - 1],
        `${difficulty.id} extra hunters did not get faster at level ${level + 1}`
      );
    }
  }

  const [easy, medium, hard] = DIFFICULTIES;
  const last = LEVELS.length - 1;
  const lastWake = (difficulty) =>
    difficulty.wakeDelay[last] + (difficulty.shadowCount[last] - 1) * difficulty.extraWakeGap[last];
  assert.ok(lastWake(easy) > lastWake(medium));
  assert.ok(lastWake(medium) > lastWake(hard));
});

test("hunters spawn on distinct perimeter sides and stay separated", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let level = 0; level < LEVELS.length; level += 1) {
      const maze = mazeFor(difficulty, level);
      const starts = maze.shadowStarts.slice(0, difficulty.shadowCount[level]);
      assert.equal(starts.length, difficulty.shadowCount[level]);

      const sides = starts.map((cell) => cell.side);
      assert.equal(new Set(sides).size, starts.length, `${difficulty.id} level ${level + 1} reused a side`);

      for (const start of starts) {
        const onPerimeter =
          start.x === 0 || start.y === 0 ||
          start.x === maze.cols - 1 || start.y === maze.rows - 1;
        assert.ok(onPerimeter, `${difficulty.id} level ${level + 1} hunter spawned inside the maze`);
        assert.notDeepEqual({ x: start.x, y: start.y }, maze.start);
        assert.notDeepEqual({ x: start.x, y: start.y }, maze.exit);
        assert.ok(
          maze.getPath(start, maze.start).length > 4,
          `${difficulty.id} level ${level + 1} hunter spawned too close`
        );
      }

      for (let i = 0; i < starts.length; i += 1) {
        for (let j = i + 1; j < starts.length; j += 1) {
          const gap = Math.abs(starts[i].x - starts[j].x) + Math.abs(starts[i].y - starts[j].y);
          assert.ok(gap >= 2, `${difficulty.id} level ${level + 1} hunters bunched together`);
        }
      }
    }
  }
});

test("extra hunters wake after the first at the configured gap", () => {
  const difficulty = DIFFICULTIES[1];
  const level = 3;
  const baseWake = difficulty.wakeDelay[level];
  const gap = difficulty.extraWakeGap[level];
  const configs = [0, 1, 2].map((index) => ({
    index,
    baseSpeed: 1,
    maxSpeed: 1,
    wakeDelay: baseWake + index * gap
  }));

  for (const config of configs) {
    const probe = new Shadow({}, { x: 0, y: 0 }, config);
    assert.equal(probe.update(0, null, config.wakeDelay - 0.01), null);
    assert.equal(probe.active, false);
  }

  const shadows = configs.map((config) => new Shadow({}, { x: 0, y: 0 }, config));
  assert.deepEqual(
    shadows.map((shadow) => shadow.update(0, null, shadow.config.wakeDelay)),
    ["woke", "woke", "woke"]
  );
  assert.ok(shadows[2].config.wakeDelay - shadows[0].config.wakeDelay === gap * 2);
});

test("light flicker gets worse every level and respects reduced flash", () => {
  for (const difficulty of DIFFICULTIES) {
    const { interval, depth, duration } = difficulty.flicker;
    assert.equal(interval.length, LEVELS.length);
    assert.equal(depth.length, LEVELS.length);
    assert.equal(duration.length, LEVELS.length);

    for (let level = 1; level < LEVELS.length; level += 1) {
      assert.ok(interval[level] < interval[level - 1], `${difficulty.id} flicker not more frequent`);
      assert.ok(depth[level] < depth[level - 1], `${difficulty.id} flicker not deeper`);
      assert.ok(duration[level] > duration[level - 1], `${difficulty.id} flicker not longer`);
    }
  }

  const [easy, medium, hard] = DIFFICULTIES;
  const last = LEVELS.length - 1;
  assert.ok(easy.flicker.interval[last] > medium.flicker.interval[last]);
  assert.ok(medium.flicker.interval[last] > hard.flicker.interval[last]);
  assert.ok(easy.flicker.depth[last] > medium.flicker.depth[last]);
  assert.ok(medium.flicker.depth[last] > hard.flicker.depth[last]);
  assert.ok(easy.flicker.duration[last] < medium.flicker.duration[last]);
  assert.ok(medium.flicker.duration[last] < hard.flicker.duration[last]);

  const config = { interval: 4, duration: 0.2, depth: 0.3, offset: 0 };
  assert.equal(flickerFactor(0.5, config), 1);
  const dip = flickerFactor(0.1, config);
  assert.ok(Math.abs(dip - config.depth) < 0.001);
  const softened = flickerFactor(0.1, { ...config, softened: true });
  assert.ok(softened > dip && softened <= 1);
  assert.equal(flickerFactor(1, null), 1);
});
