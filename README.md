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
- Every difficulty ramps from 1 hunter at Level 1 to 6 hunters at Level 6
- Hunters spawn on different perimeter sides/corners, chosen deterministically from the level seed
- Difficulty controls the rush: Easy has long wake gaps and slower extra hunters, Hard stacks fast hunters almost immediately
- Light flickers for fractions of a second, worsening each level; `Reduce flashing` softens the dips
- Threat HUD tracks the nearest hunter and switches to `SURROUNDED` when three or more are active
- Fixed seeded layouts so best times are fair
- Hunters follow BFS shortest paths and accelerate over time
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
reachable cell, the outer boundary is sealed, hunters have valid paths to the player,
all 18 seeds are unique, every difficulty ramps from 1 to 6 hunters, spawns stay on distinct
perimeter sides, extra hunters wake in staggered order, and flicker grows worse each level.

## Tuning

Level titles and stories live in `LEVELS` in `js/config.js`. Difficulty size, hunter count,
hunter speed, wake delay, extra wake gap, extra hunter speed scale, light radius, and the
`flicker.interval` / `flicker.depth` / `flicker.duration` arrays are all index-aligned with
those six levels. Lower `flicker.depth` means a deeper dip in light. Maze seeds are derived
from the difficulty's `seedBase` plus the level number, so changing a `seedBase` changes that
difficulty's layouts and deterministic hunter spawns.
