export const VIEW = {
  WIDTH: 960,
  HEIGHT: 640,
  MARGIN: { left: 34, right: 34, top: 78, bottom: 34 }
};

export const PLAYER_SPEED = 4.2;
export const CATCH_RADIUS = 0.68;
export const SHADOW_RAMP_SECONDS = 105;
export const COUNTDOWN_SECONDS = 3.2;

export const CHAPTERS = [
  {
    numeral: "I",
    title: "The Entrance",
    story:
      "You came looking for the treasure. The entrance sealed behind you. Somewhere in the dark, something old has opened its eyes."
  },
  {
    numeral: "II",
    title: "The Depths",
    story:
      "The walls are colder here. Your light no longer reaches the ceiling. Whatever is following you has stopped pretending to be far away."
  },
  {
    numeral: "III",
    title: "The Heart",
    story:
      "The treasure was never the point. The exit is close now. So is the thing behind you. Do not look back for long."
  }
];

export const DIFFICULTIES = [
  {
    id: "easy",
    name: "Easy",
    tagline: "A quiet descent",
    blurb: "A slow stalker and a generous light. Learn the maze.",
    sizes: [
      [17, 13],
      [21, 15],
      [23, 17]
    ],
    shadowSpeed: [2.05, 2.25, 2.4],
    shadowMax: [2.7, 2.85, 3.0],
    wakeDelay: [8, 7.5, 7],
    lightRadius: [5.2, 5.0, 4.8],
    seedBase: 1103
  },
  {
    id: "medium",
    name: "Medium",
    tagline: "It wakes sooner",
    blurb: "A darker maze and a hunter that does not tire.",
    sizes: [
      [21, 15],
      [25, 17],
      [29, 19]
    ],
    shadowSpeed: [2.45, 2.6, 2.75],
    shadowMax: [3.2, 3.35, 3.5],
    wakeDelay: [5, 4.5, 4],
    lightRadius: [4.6, 4.4, 4.2],
    seedBase: 2741
  },
  {
    id: "hard",
    name: "Hard",
    tagline: "No mercy",
    blurb: "Little light. A relentless shadow. Outrun it or die.",
    sizes: [
      [25, 17],
      [29, 19],
      [33, 21]
    ],
    shadowSpeed: [2.85, 3.0, 3.15],
    shadowMax: [3.65, 3.75, 3.85],
    wakeDelay: [2.5, 2.2, 2.0],
    lightRadius: [4.0, 3.8, 3.6],
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
  background: "#030508",
  wall: "rgba(70, 124, 150, 0.94)",
  wallGlow: "rgba(70, 195, 235, 0.42)",
  player: "#e8fbff",
  playerGlow: "rgba(104, 226, 255, 0.42)",
  exit: "#69ffb4",
  exitGlow: "rgba(72, 255, 164, 0.5)",
  shadow: "#ff3454"
};
