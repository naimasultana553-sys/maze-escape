# Maze Escape

**Follow the path. Find the treasure. Get out before it finds you.**

A 2D horror maze game built with HTML5 Canvas and vanilla JavaScript. Explore a dark
labyrinth, remember the paths you have walked, and follow a six-level path toward the
treasure before the Shadow catches you.

## Play live

[mazeescape-yn6k.vercel.app](https://mazeescape-yn6k.vercel.app)

## Install on your phone

Open the live URL in your mobile browser, then:

- **Android / Chrome:** menu `⋮` → **Install app** or **Add to Home screen**
- **iPhone / Safari:** **Share** → **Add to Home Screen**

The app box will use the neon maze-eye logo. The game also opens standalone without the browser address bar.

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

- Three difficulties, each with six unique levels (18 levels total)
- A winding level path: clear a level to unlock the next step toward the treasure
- Different difficulty curves: Easy favors larger mazes and generous light, Medium wakes the Shadow earlier, Hard collapses light fast and never slows
- Visual-only danger escalation: higher levels bring darker walls, denser fog, and stronger red/amber intensity
- Fixed seeded layouts so best times are fair
- Relentless Shadow that follows a BFS shortest path and accelerates over time
- Fog of war with a persistent memory map
- Synthesized horror audio: footsteps, heartbeat, ambient drone, jumpscare, victory chord
- Level unlocking, best times, and settings saved to `localStorage`
- Old three-level saves are migrated automatically and padded to six slots
- Responsive canvas, accessible menus, reduced-flash option, and screen-shake toggle

## Project structure

```text
index.html
css/style.css
js/
  main.js       boot + animation loop
  game.js       state machine, progression, chase logic
  config.js     level data and difficulty tuning
  maze.js       seeded generation, BFS, pathfinding, collision
  player.js     smooth grid movement
  shadow.js     stalking AI and speed ramp
  renderer.js   maze, fog, entities, atmosphere, danger escalation
  ui.js         path map, menus, HUD, overlays
  audio.js      Web Audio synthesis
  input.js      keyboard + touch handling
  storage.js    persistence and save migration
tests/maze.test.js
server.js
```

## Tests

```bash
npm test
```

The tests verify that every generated maze is solvable, the exit is placed at a farthest
reachable cell, the outer boundary is sealed, the Shadow has a valid path to the player,
all 18 seeds are unique, and every difficulty has six unique progressive tuning values.

## Tuning

Level titles and stories live in `LEVELS` in `js/config.js`. Difficulty size, Shadow speed,
wake delay, and light radius arrays are index-aligned with those six levels. Maze seeds are
derived from the difficulty's `seedBase` plus the level number, so changing a `seedBase`
changes that difficulty's layouts.
