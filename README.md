# Maze Escape

**Find the exit before it finds you.**

A 2D horror maze game built with HTML5 Canvas and vanilla JavaScript. Explore a dark
labyrinth, remember the paths you have walked, and reach the green doorway before the
Shadow catches you.

## Play live

[mazeescape-yn6k.vercel.app](https://mazeescape-yn6k.vercel.app)

## Run the game

Requires Node.js 18 or newer.

```bash
npm start
```

Then open <http://localhost:5173>.

The game uses ES modules, so it must be served over HTTP. Opening `index.html` directly
with `file://` will not work.

## Controls

| Input | Action |
| --- | --- |
| `WASD` / arrow keys | Move |
| On-screen D-pad | Move on touch devices |
| `Esc` or `P` / HUD button | Pause / resume |
| `M` | Mute / unmute |
| `R` | Retry after death or victory |

## Features

- Three difficulties, each with three chapters (nine mazes total)
- Fixed seeded layouts so best times are fair
- Relentless Shadow that follows a BFS shortest path and accelerates over time
- Fog of war with a persistent memory map
- Synthesized horror audio: footsteps, heartbeat, ambient drone, jumpscare, victory chord
- Level unlocking, best times, and settings saved to `localStorage`
- Responsive canvas, accessible menus, reduced-flash option, and screen-shake toggle

## Project structure

```text
index.html
css/style.css
js/
  main.js       boot + animation loop
  game.js       state machine, progression, chase logic
  config.js     difficulty tuning and chapter data
  maze.js       seeded generation, BFS, pathfinding, collision
  player.js     smooth grid movement
  shadow.js     stalking AI and speed ramp
  renderer.js   maze, fog, entities, atmosphere
  ui.js         menus, HUD, overlays
  audio.js      Web Audio synthesis
  input.js      keyboard + touch handling
  storage.js    persistence
tests/maze.test.js
server.js
```

## Tests

```bash
npm test
```

The tests verify that every generated maze is solvable, the exit is placed at a farthest
reachable cell, the outer boundary is sealed, and the Shadow has a valid path to the
player.

## Tuning

Difficulty and chapter definitions live in `js/config.js`. Maze seeds are derived from
the difficulty and chapter, so changing a difficulty's `seedBase` changes its layouts.
