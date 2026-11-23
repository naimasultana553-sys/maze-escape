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
    blurb: "Larger mazes, slower hunters, and generous light. The path still gets worse.",
    sizes: [
      [17, 13],
      [19, 15],
      [21, 15],
      [23, 17],
      [27, 19],
      [31, 21]
    ],
    shadowCount: [1, 2, 3, 4, 5, 6],
    shadowSpeed: [1.85, 1.95, 2.05, 2.15, 2.25, 2.35],
    shadowMax: [2.45, 2.55, 2.65, 2.75, 2.85, 2.95],
    wakeDelay: [9, 8.5, 8, 7.5, 7, 6.5],
    extraWakeGap: [4.0, 3.5, 3.0, 2.5, 2.0, 1.5],
    extraSpeedScale: [0.80, 0.82, 0.84, 0.86, 0.88, 0.90],
    lightRadius: [5.6, 5.4, 5.2, 5.0, 4.8, 4.6],
    flicker: {
      interval: [12, 10.5, 9, 7.5, 6, 4.5],
      depth: [0.92, 0.88, 0.84, 0.78, 0.70, 0.62],
      duration: [0.06, 0.075, 0.09, 0.11, 0.13, 0.16]
    },
    seedBase: 1103
  },
  {
    id: "medium",
    name: "Medium",
    tagline: "It wakes sooner",
    blurb: "Hunters wake early and move quickly. The maze grows without mercy.",
    sizes: [
      [19, 13],
      [21, 15],
      [23, 17],
      [27, 19],
      [29, 19],
      [33, 21]
    ],
    shadowCount: [1, 2, 3, 4, 5, 6],
    shadowSpeed: [2.25, 2.45, 2.65, 2.85, 3.05, 3.25],
    shadowMax: [3.0, 3.2, 3.4, 3.6, 3.8, 4.0],
    wakeDelay: [6.5, 5.5, 4.5, 3.8, 3.2, 2.6],
    extraWakeGap: [2.5, 2.2, 1.9, 1.6, 1.3, 1.0],
    extraSpeedScale: [0.90, 0.92, 0.94, 0.96, 0.98, 1.00],
    lightRadius: [4.8, 4.6, 4.4, 4.2, 4.0, 3.8],
    flicker: {
      interval: [9, 7.5, 6, 4.8, 3.6, 2.8],
      depth: [0.88, 0.82, 0.75, 0.66, 0.55, 0.45],
      duration: [0.08, 0.10, 0.12, 0.15, 0.18, 0.20]
    },
    seedBase: 2741
  },
  {
    id: "hard",
    name: "Hard",
    tagline: "No mercy",
    blurb: "Light collapses fast. Hunters wake almost at once and never slow.",
    sizes: [
      [23, 15],
      [25, 17],
      [27, 19],
      [31, 21],
      [35, 23],
      [37, 23]
    ],
    shadowCount: [1, 2, 3, 4, 5, 6],
    shadowSpeed: [2.75, 2.95, 3.15, 3.35, 3.55, 3.75],
    shadowMax: [3.55, 3.75, 3.95, 4.15, 4.35, 4.55],
    wakeDelay: [3.2, 2.6, 2.2, 1.8, 1.5, 1.2],
    extraWakeGap: [1.2, 1.0, 0.85, 0.7, 0.6, 0.5],
    extraSpeedScale: [1.00, 1.01, 1.02, 1.04, 1.06, 1.08],
    lightRadius: [4.2, 3.8, 3.4, 3.0, 2.6, 2.2],
    flicker: {
      interval: [6, 4.8, 3.8, 3, 2.2, 1.6],
      depth: [0.80, 0.70, 0.60, 0.50, 0.38, 0.28],
      duration: [0.10, 0.13, 0.16, 0.19, 0.22, 0.26]
    },
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
