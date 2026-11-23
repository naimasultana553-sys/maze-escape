export const VIEW = {
  WIDTH: 960,
  HEIGHT: 640,
  MARGIN: { left: 34, right: 34, top: 78, bottom: 34 }
};

export const PLAYER_SPEED = 4.2;
export const CATCH_RADIUS = 0.68;
export const SHADOW_RAMP_SECONDS = 105;
export const COUNTDOWN_SECONDS = 3.2;

export const LEVELS = [
  {
    label: "LEVEL 1",
    title: "The Broken Gate",
    story:
      "You came for the treasure. The gate folded shut behind you, and something in the dark drew breath."
  },
  {
    label: "LEVEL 2",
    title: "The Weeping Halls",
    story:
      "Water taps inside walls that have no pipes. Each step sounds twice — once beneath you, once behind you."
  },
  {
    label: "LEVEL 3",
    title: "The Ash Gallery",
    story:
      "Portraits hang in the soot, their faces scratched away. The light in your hand is smaller than it was."
  },
  {
    label: "LEVEL 4",
    title: "The Drowned Vault",
    story:
      "The floor breathes. Gold glimmers somewhere below, and the Shadow no longer bothers to stay quiet."
  },
  {
    label: "LEVEL 5",
    title: "The Bone Corridor",
    story:
      "Every turn narrows. Every honest path ends in a rib of stone. The treasure is close enough to smell."
  },
  {
    label: "LEVEL 6",
    title: "The Gilded Tomb",
    story:
      "The last chamber waits beyond the red dark. One more corridor, and the prize is yours — if it lets you take it."
  }
];

export const DIFFICULTIES = [
  {
    id: "easy",
    name: "Easy",
    tagline: "A quiet descent",
    blurb: "Larger mazes, a slow stalker, and generous light. Learn the path.",
    sizes: [
      [17, 13],
      [19, 15],
      [21, 15],
      [23, 17],
      [27, 19],
      [31, 21]
    ],
    shadowSpeed: [1.85, 1.95, 2.05, 2.15, 2.25, 2.35],
    shadowMax: [2.45, 2.55, 2.65, 2.75, 2.85, 2.95],
    wakeDelay: [9, 8.5, 8, 7.5, 7, 6.5],
    lightRadius: [5.6, 5.4, 5.2, 5.0, 4.8, 4.6],
    seedBase: 1103
  },
  {
    id: "medium",
    name: "Medium",
    tagline: "It wakes sooner",
    blurb: "The Shadow stirs early and moves quickly. The maze grows without mercy.",
    sizes: [
      [19, 13],
      [21, 15],
      [23, 17],
      [27, 19],
      [29, 19],
      [33, 21]
    ],
    shadowSpeed: [2.25, 2.45, 2.65, 2.85, 3.05, 3.25],
    shadowMax: [3.0, 3.2, 3.4, 3.6, 3.8, 4.0],
    wakeDelay: [6.5, 5.5, 4.5, 3.8, 3.2, 2.6],
    lightRadius: [4.8, 4.6, 4.4, 4.2, 4.0, 3.8],
    seedBase: 2741
  },
  {
    id: "hard",
    name: "Hard",
    tagline: "No mercy",
    blurb: "Light collapses fast. The Shadow wakes almost at once and never slows.",
    sizes: [
      [23, 15],
      [25, 17],
      [27, 19],
      [31, 21],
      [35, 23],
      [37, 23]
    ],
    shadowSpeed: [2.75, 2.95, 3.15, 3.35, 3.55, 3.75],
    shadowMax: [3.55, 3.75, 3.95, 4.15, 4.35, 4.55],
    wakeDelay: [3.2, 2.6, 2.2, 1.8, 1.5, 1.2],
    lightRadius: [4.2, 3.8, 3.4, 3.0, 2.6, 2.2],
    seedBase: 6121
  }
];

export const SETTINGS_DEFAULTS = {
  volume: 0.65,
  muted: false,
  screenShake: true,
  reducedFlash: false
};

export const UI_COLORS = {
  background: "#080603",
  wall: "rgba(168, 128, 74, 0.9)",
  wallGlow: "rgba(194, 150, 82, 0.34)",
  player: "#f2dfb8",
  playerGlow: "rgba(216, 178, 119, 0.42)",
  exit: "#69ffb4",
  exitGlow: "rgba(72, 255, 164, 0.5)",
  shadow: "#d45b4a"
};
