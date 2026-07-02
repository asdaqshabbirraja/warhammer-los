import { Fragment, useEffect, useRef, useState } from "react";
import BASE_DATABASE from "./baseSizes.json";
import LAYOUT_PRESETS from "./layoutPresets.json";
import LOS_TERRAIN_DATA from "./losTerrain.json";

const FORCE_DISPOSITIONS = [
  "Take and Hold",
  "Purge the Foe",
  "Disruption",
  "Reconnaissance",
  "Priority Assets",
];

const SIDEBAR_HELP = {
  game: {
    title: "Save Game",
    items: [
      "Choose a game, then click Load game to load it.",
      "Selecting New game save creates a new game slot.",
      "Edit the game name by double-clicking its name or clicking Edit name.",
      "Use Save game to store the current game, or Delete game to remove it.",
    ],
  },
  layout: {
    title: "Layout",
    items: [
      "Choose your force disposition, your opponent's force disposition, and Layout A, B, or C. Click Apply Layout to display it.",
      "Use Display or Hide beside either primary mission to show or conceal its mission card.",
    ],
  },
  importGame: {
    title: "Import Game/Layout",
    intro: "Import a game or layout previously exported from this app in JSON format.",
    items: [],
  },
  army: {
    title: "Army List",
    items: [
      "Select New army to create a new army-list slot.",
      "Edit the army name by double-clicking it or clicking Edit name.",
      "Paste an army exported from the Warhammer 40,000 app into the large box. Then click Match models. Matching entries automatically create models with the correct names, base shapes, and sizes with the correct attached units.",
      "Unmatched entries appear below Remove generated LOS marker(s). You can correct their names, rematch them, or choose a base shape and size before adding them.",
    ],
  },
  markers: {
    title: "Your Model(s)/LOS Marker(s)",
    intro: "Generated models are listed in this section.",
    items: [
      "Add a known model by searching below Add LOS, then click its name or press Enter.",
      "Add LOS creates a new 25 mm circular LOS marker.",
      "You can edit each model's name, base shape, and base size.",
      "The open eye enables LOS from a model; the crossed-out eye disables it.",
      "Enter a range in inches for a weapon or aura. Leave the box blank or enter 0 for unlimited range.",
      "Select Unit to generate several models of the same type and assign them to a numbered unit. Units can move together and are checked for coherency: selected or coherent units use blue/green outlines, while incoherent units turn red.",
    ],
  },
  units: {
    title: "Units",
    items: [
      "Select a whole unit here. Use the eye controls to enable or disable LOS for all its models, and edit the unit name in its name box.",
      "Enter a weapon or aura range in inches. Leave the box blank or enter 0 for unlimited range.",
    ],
  },
  scale: {
    title: "Rulers & Deepstrike",
    items: [
      "Select Ruler to measure between two points and leave the ruler on the map. Clear rulers removes every standard ruler.",
      "Sticky ruler continuously measures from a model or unit to another model, enemy, or terrain footprint. Clear sticky rulers removes them all.",
      "To check deepstrike screening, enter a distance and enable the overlay with the open eye. The default distance is 8 inches, but you can enter any value.",
    ],
  },
  draw: {
    title: "Deploy & Enemies",
    items: [
      "Select Add Enemy (E), then click the layout to add enemy markers. Choose another tool, such as Pan map (P), when you have finished. Clear enemies removes every enemy marker.",
      "Home deployment line and Enemy deployment line show LOS from the blue home and red enemy deployment lines. Enter a range to plan where units such as infiltrators can be placed.",
    ],
  },
  mapModify: {
    title: "Modify Layout",
    items: [
      "Pick your force disposition, your opponent's force disposition, and Layout A, B, or C.",
      "Click Display layout to modify to load the selected preset.",
      "Click Modify Layout to unlock that layout, or go directly to Edit Layout and select Start editing.",
    ],
  },
  mapUpload: {
    title: "Upload Map",
    items: [
      "Upload a picture of the map.",
      "Use Edit Layout to set its scale and add or edit map objects.",
    ],
  },
  mapCreate: {
    title: "Create Map",
    intro: "Choose the width and length to determine the map's grid size. Every grid square represents 1 inch.",
    items: [],
  },
  mapEdit: {
    title: "Edit Layout",
    items: [
      "Select Start editing to unlock the map and use the remaining Edit Layout controls.",
      "Set Scale lets you identify a known distance on an uploaded map, such as a grid square or known base length. The app can then measure distances and ranges correctly.",
      "Add preset GW terrain footprints with the quantity controls, or use Selectively remove terrain footprint(s) to remove individual pieces.",
      "Add preset light and dense terrain features.",
      "Add preset walls representing GW dense-terrain ruin features.",
      "Free Draw lets you outline a wall or footprint. Double-click to finish a wall; connect the last footprint point to the first to close a footprint.",
      {
        text: "Manipulation lets you move, mirror, link, and rotate terrain footprints and terrain features, including light terrain, dense terrain, and dense ruins.",
        subitems: [
          "To link positions, select Link, click one piece, then click an identical piece with the same mirror setting. Moving either piece then positions the other as its exact battlefield mirror.",
          "Rotate a grabbed piece with the mouse wheel, or use the rotation buttons.",
        ],
      },
      "Draw your own home and opponent deployment lines.",
      "Add objective markers. Dragging an objective onto terrain automatically centres it on that footprint.",
      {
        text: "Export layouts and games you create.",
        subitems: [
          "Export Layout saves the grid, deployment lines, terrain footprints, walls, and terrain features. This is useful for non-GW game or tournament maps.",
          "Export Game saves the complete plan, including models, units, enemies, and Deployment & Turn-by-Turn Planner positions.",
        ],
      },
    ],
  },
};
const FORCE_DISPOSITION_MISSIONS = {
  "Take and Hold": {
    "Take and Hold": "Battlefield Dominance",
    "Purge the Foe": "Immovable Object",
    Disruption: "Determined Acquisition",
    Reconnaissance: "Purge and Secure",
    "Priority Assets": "Inescapable Dominion",
  },
  "Purge the Foe": {
    "Take and Hold": "Unstoppable Force",
    "Purge the Foe": "Meatgrinder",
    Disruption: "Punishment",
    Reconnaissance: "Consecrate",
    "Priority Assets": "Destroyer's Wrath",
  },
  Disruption: {
    "Take and Hold": "Death Trap",
    "Purge the Foe": "Delaying Action",
    Disruption: "Outmanoeuvre",
    Reconnaissance: "Smoke and Mirrors",
    "Priority Assets": "Locate and Deny",
  },
  Reconnaissance: {
    "Take and Hold": "Reconnaissance Sweep",
    "Purge the Foe": "Triangulation",
    Disruption: "Surveil the Foe",
    Reconnaissance: "Gather Intel",
    "Priority Assets": "Search and Scour",
  },
  "Priority Assets": {
    "Take and Hold": "Secure Asset",
    "Purge the Foe": "Vital Link",
    Disruption: "Extract Relic",
    Reconnaissance: "Vanguard Operation",
    "Priority Assets": "Sabotage",
  },
};

const PRIMARY_MISSION_CARD_SLUGS = {
  "Battlefield Dominance": "battlefield-dominance",
  "Immovable Object": "immovable-object",
  "Determined Acquisition": "determined-acquisition",
  "Purge and Secure": "purge-and-secure",
  "Inescapable Dominion": "inescapable-dominion",
  "Unstoppable Force": "unstoppable-force",
  Meatgrinder: "meatgrinder",
  Punishment: "punishment",
  Consecrate: "consecrate",
  "Destroyer's Wrath": "destroyers-wrath",
  "Death Trap": "death-trap",
  "Delaying Action": "delaying-action",
  Outmanoeuvre: "outmanoeuvre",
  "Smoke and Mirrors": "smoke-and-mirrors",
  "Locate and Deny": "locate-and-deny",
  "Reconnaissance Sweep": "reconnaissance-sweep",
  Triangulation: "triangulation",
  "Surveil the Foe": "surveil-the-foe",
  "Gather Intel": "gather-intel",
  "Search and Scour": "search-and-scour",
  "Secure Asset": "secure-asset",
  "Vital Link": "vital-link",
  "Extract Relic": "extract-relic",
  "Vanguard Operation": "vanguard-operation",
  Sabotage: "sabotage",
};

const DOUBLE_SIDED_PRIMARY_MISSIONS = new Set([
  "Death Trap",
  "Locate and Deny",
  "Smoke and Mirrors",
  "Extract Relic",
  "Sabotage",
  "Secure Asset",
  "Vanguard Operation",
  "Vital Link",
  "Gather Intel",
  "Surveil the Foe",
  "Triangulation",
]);

function missionCardsFor(mission) {
  const slug = PRIMARY_MISSION_CARD_SLUGS[mission];
  if (!slug) return [];
  return [
    { side: "Front", src: `/mission-cards/${slug}-front.webp` },
    ...(DOUBLE_SIDED_PRIMARY_MISSIONS.has(mission)
      ? [{ side: "Back", src: `/mission-cards/${slug}-back.webp` }]
      : []),
  ];
}

const FORCE_DISPOSITION_STYLES = {
  "Take and Hold": { color: "#2f7054", icon: "hold" },
  "Purge the Foe": { color: "#982d31", icon: "sword" },
  Disruption: { color: "#295b96", icon: "bomb" },
  Reconnaissance: { color: "#23838c", icon: "eye" },
  "Priority Assets": { color: "#ad800d", icon: "arrow" },
};

const BATTLEFIELD_WIDTH_INCHES = 44;
const BATTLEFIELD_HEIGHT_INCHES = 60;
const SOURCE_LAYOUT_WIDTH_INCHES = 60;
const MOVEMENT_PHASES = ["deployment", "turn1", "turn2", "turn3", "turn4", "turn5"];
const LOS_PERF_DIAGNOSTICS = false;
const MOVEMENT_PHASE_LABELS = {
  deployment: "Deployment",
  turn1: "Turn 1",
  turn2: "Turn 2",
  turn3: "Turn 3",
  turn4: "Turn 4",
  turn5: "Turn 5",
};

const TERRAIN_FOOTPRINTS = Object.fromEntries(LOS_TERRAIN_DATA.pieces.map((piece) => {
  const [width, height] = piece.nominal_size_in;
  const centerPolygon = (points) => points.map(([x, y]) => [x - width / 2, y - height / 2]);
  return [piece.id, {
    id: piece.id,
    label: piece.label,
    quantity: piece.quantity_per_set,
    width,
    height,
    footprint: centerPolygon(piece.footprint_in),
    outer: centerPolygon(piece.outline_in),
    light: [],
    dense: [],
  }];
}));

const GW_TERRAIN_FOOTPRINT_ROWS = [
  { shape: "medium_rectangle", label: '6" x 4"', recommended: 4 },
  { shape: "long_line", label: '10" x 2.5"', recommended: 2 },
  { shape: "short_line", label: '6" x 2"', recommended: 4 },
  { shape: "large_rectangle", label: '7" x 11.5"', recommended: 4 },
  { shape: "right_triangle", label: '8" x 11.5"', recommended: 2 },
];

const LAYOUT_WALL_TYPES = {
  AB: { label: "AB", width: 5, height: 4, thickness: 0.5 },
  CD: { label: "CD", width: 6, height: 2.5, thickness: 0.5 },
  EF: { label: "EF", width: 6, height: 4.5, thickness: 0.5 },
  GH: { label: "GH", width: 3, height: 6, thickness: 0.5 },
};

const RI_FEATURE_POINTS = {
  rapidLight1: [[0.44, 1.88], [0.08, 1.88], [0.05, 1.83], [-0.62, 1.81], [-0.62, 1.69], [-0.58, 1.67], [0.03, 1.68], [0.10, 1.61], [0.06, 1.45], [0.10, 1.40], [0.10, 0.51], [0.07, 0.48], [0.10, 0.30], [0.03, 0.22], [0.03, 0.10], [0.10, 0.01], [0.07, -0.07], [0.03, -0.10], [0.03, -0.24], [0.10, -0.32], [0.07, -0.43], [0.10, -0.52], [0.10, -1.41], [0.06, -1.45], [0.10, -1.63], [0.05, -1.68], [-0.58, -1.68], [-0.62, -1.71], [-0.62, -1.82], [-0.58, -1.85], [-0.59, -1.88], [0.48, -1.88], [0.50, -1.83], [0.62, -1.76], [0.58, -1.72], [0.58, -0.20], [0.62, -0.16], [0.46, -0.09], [0.42, -0.01], [0.46, 0.08], [0.62, 0.15], [0.58, 0.20], [0.58, 1.71], [0.62, 1.76], [0.46, 1.84]],
  rapidLight2: [[0.88, 0.54], [0.68, 0.70], [0.62, 0.66], [0.42, 0.68], [0.36, 0.64], [0.14, 0.66], [-0.14, 0.78], [-0.24, 0.76], [-0.26, 0.82], [-0.44, 0.82], [-0.48, 0.74], [-0.58, 0.70], [-0.58, 0.64], [-0.66, 0.64], [-0.74, 0.54], [-0.74, 0.48], [-0.82, 0.46], [-0.84, 0.38], [-0.92, 0.36], [-0.92, 0.16], [-0.84, 0.12], [-0.86, -0.02], [-0.84, -0.24], [-0.62, -0.74], [-0.62, -0.82], [-0.54, -0.82], [-0.54, -0.76], [-0.48, -0.72], [-0.44, -0.50], [-0.38, -0.34], [-0.44, -0.26], [-0.42, -0.14], [-0.44, -0.10], [-0.36, -0.04], [-0.40, 0.02], [-0.38, 0.30], [-0.12, 0.30], [-0.06, 0.26], [-0.04, 0.33], [0.12, 0.30], [0.20, 0.33], [0.52, 0.33], [0.66, 0.38], [0.72, 0.33], [0.86, 0.33], [0.92, 0.44]],
  rapidLight3: [[0.67, -1.44], [0.72, -1.38], [0.70, -1.30], [0.80, -1.26], [0.80, -0.92], [0.87, -0.90], [0.91, -0.82], [0.91, -0.46], [0.86, -0.42], [0.84, -0.28], [0.77, -0.20], [0.84, -0.04], [0.78, 0.08], [0.68, 0.14], [0.66, 0.22], [0.68, 0.46], [0.58, 0.48], [0.56, 0.52], [0.68, 0.56], [0.72, 0.60], [0.71, 0.68], [0.83, 0.72], [0.82, 1.18], [0.71, 1.22], [0.72, 1.28], [0.63, 1.38], [0.54, 1.38], [0.53, 1.46], [0.05, 1.46], [0.02, 1.36], [-0.05, 1.38], [-0.13, 1.28], [-0.19, 1.26], [-0.48, 1.34], [-0.53, 1.28], [-0.65, 1.28], [-0.82, 1.20], [-0.87, 1.14], [-0.91, 1.14], [-0.91, 1.02], [-0.87, 1.02], [-0.77, 0.89], [-0.66, 0.84], [-0.07, 0.86], [0.14, 0.98], [0.34, 0.96], [0.34, 0.68], [0.31, 0.60], [0.36, 0.56], [0.48, 0.56], [0.49, 0.50], [0.32, 0.46], [0.19, 0.28], [0.41, 0.04], [0.41, -0.14], [0.37, -0.24], [0.46, -0.32], [0.32, -0.50], [0.48, -0.66], [0.35, -0.68], [0.34, -0.78], [0.52, -0.82], [0.41, -1.06], [0.49, -1.18], [0.60, -1.24], [0.55, -1.30], [0.35, -1.30], [0.34, -1.42], [0.51, -1.46]],
  rapidLight4: [[0.10, 2.38], [0.04, 2.30], [-0.04, 2.26], [-0.04, 1.86], [-0.08, 1.78], [-0.52, 1.76], [-0.52, 1.66], [-0.46, 1.60], [-0.52, 1.54], [-0.50, 1.42], [-0.10, 1.44], [-0.04, 1.36], [-0.04, 0.26], [-0.08, 0.16], [-0.50, 0.18], [-0.58, 0.12], [-0.72, 0.20], [-0.78, 0.16], [-0.78, -0.08], [-0.76, -0.12], [-0.78, -0.18], [-0.74, -0.20], [-0.60, -0.14], [-0.52, -0.20], [-0.08, -0.18], [-0.04, -0.28], [-0.04, -1.34], [-0.06, -1.42], [-0.50, -1.42], [-0.58, -1.48], [-0.74, -1.42], [-0.78, -1.44], [-0.76, -1.50], [-0.78, -1.54], [-0.78, -1.78], [-0.72, -1.82], [-0.58, -1.74], [-0.50, -1.80], [-0.08, -1.78], [-0.04, -1.84], [-0.04, -2.26], [0.02, -2.32], [0.04, -2.38], [0.10, -2.38], [0.12, -2.32], [0.22, -2.28], [0.22, -1.86], [0.30, -1.76], [0.42, -1.74], [0.52, -1.80], [0.64, -1.80], [0.72, -1.74], [0.78, -1.62], [0.74, -1.50], [0.66, -1.42], [0.56, -1.40], [0.42, -1.48], [0.32, -1.48], [0.22, -1.36], [0.22, -0.94], [0.26, -0.89], [0.24, -0.86], [0.26, -0.80], [0.24, -0.78], [0.26, -0.72], [0.22, -0.68], [0.24, -0.24], [0.32, -0.14], [0.42, -0.14], [0.52, -0.20], [0.64, -0.20], [0.74, -0.12], [0.78, -0.02], [0.74, 0.11], [0.64, 0.18], [0.56, 0.20], [0.42, 0.14], [0.34, 0.14], [0.24, 0.24], [0.22, 0.66], [0.26, 0.72], [0.24, 0.74], [0.26, 0.82], [0.24, 0.84], [0.26, 0.88], [0.22, 0.94], [0.22, 1.34], [0.32, 1.46], [0.42, 1.46], [0.54, 1.40], [0.64, 1.42], [0.74, 1.50], [0.78, 1.62], [0.74, 1.72], [0.64, 1.78], [0.52, 1.80], [0.40, 1.74], [0.30, 1.74], [0.22, 1.86], [0.24, 2.26], [0.16, 2.28]],
  rapidLight5: [[-1.32, 0.88], [-1.32, 0.02], [-1.38, -0.05], [-1.34, -0.11], [-1.44, -0.19], [-1.44, -0.61], [-1.34, -0.68], [-1.38, -0.76], [-1.26, -0.88], [-1.18, -0.85], [-1.12, -0.92], [-0.68, -0.92], [-0.62, -0.85], [-0.54, -0.88], [-0.48, -0.83], [-0.30, -0.83], [-0.24, -0.76], [-0.06, -0.76], [-0.02, -0.81], [0.08, -0.76], [0.14, -0.81], [0.20, -0.76], [0.36, -0.76], [0.41, -0.81], [0.60, -0.76], [0.88, -0.89], [0.96, -0.85], [1.04, -0.88], [1.12, -0.85], [1.18, -0.92], [1.44, -0.90], [1.44, -0.70], [1.18, -0.70], [1.08, -0.60], [1.00, -0.63], [0.94, -0.61], [0.92, -0.40], [0.84, -0.29], [0.78, -0.35], [0.72, -0.30], [0.34, -0.29], [0.26, -0.40], [0.20, -0.30], [0.12, -0.27], [-0.14, -0.27], [-0.24, -0.35], [-0.32, -0.29], [-0.40, -0.36], [-0.40, -0.57], [-0.48, -0.63], [-0.52, -0.62], [-0.52, -0.49], [-0.56, -0.42], [-0.62, -0.46], [-0.94, -0.46], [-0.96, -0.11], [-0.92, -0.05], [-1.00, 0.03], [-0.92, 0.12], [-0.96, 0.22], [-0.86, 0.36], [-0.92, 0.44], [-0.92, 0.60], [-0.98, 0.75], [-1.12, 0.92], [-1.26, 0.92]],
  rapidLight6: [[1.25, -0.77], [1.35, -0.16], [1.39, -0.04], [1.49, 0.04], [1.46, 0.11], [1.54, 0.17], [1.54, 0.57], [1.46, 0.63], [1.49, 0.71], [1.38, 0.81], [1.30, 0.78], [1.25, 0.85], [0.85, 0.85], [0.80, 0.78], [0.71, 0.81], [0.65, 0.74], [0.65, 0.61], [0.57, 0.56], [0.33, 0.62], [0.20, 0.62], [-0.01, 0.56], [-0.23, 0.62], [-0.37, 0.62], [-0.55, 0.56], [-0.79, 0.62], [-0.92, 0.62], [-1.02, 0.58], [-1.54, 0.61], [-1.54, 0.27], [-1.32, 0.26], [-1.20, 0.22], [0.47, 0.24], [0.55, 0.21], [0.65, 0.28], [0.75, 0.22], [0.82, 0.42], [1.07, 0.42], [1.11, 0.37], [1.10, 0.14], [0.90, 0.07], [0.98, -0.03], [0.90, -0.10], [0.89, -0.17], [0.90, -0.26], [0.97, -0.29], [0.94, -0.35], [0.94, -0.60], [0.98, -0.66], [0.96, -0.71], [1.00, -0.85], [1.09, -0.85]],
  rapidDense1: [[1.27, -1.02], [1.29, -0.86], [1.21, -0.78], [0.94, -0.78], [0.84, -0.74], [0.70, -0.76], [0.63, -0.72], [0.63, -0.48], [0.71, -0.42], [0.71, 0.46], [0.64, 0.50], [0.63, 0.70], [0.70, 0.74], [0.84, 0.74], [0.94, 0.76], [1.21, 0.78], [1.29, 0.86], [1.29, 0.98], [1.23, 1.06], [0.94, 1.08], [0.84, 1.10], [0.63, 1.08], [0.53, 1.20], [0.49, 1.22], [0.24, 1.20], [0.16, 1.10], [0.14, 1.18], [0.07, 1.24], [0.05, 1.48], [0.00, 1.50], [0.00, 1.66], [-0.03, 1.70], [-0.06, 1.70], [-0.07, 1.24], [-0.15, 1.18], [-0.17, 1.10], [-0.22, 1.18], [-0.22, 1.38], [-0.39, 1.40], [-0.54, 1.36], [-0.56, 1.18], [-0.64, 1.08], [-0.83, 1.12], [-0.94, 1.08], [-1.15, 1.08], [-1.23, 1.06], [-1.29, 1.00], [-1.29, 0.84], [-1.22, 0.78], [-0.94, 0.76], [-0.84, 0.74], [-0.70, 0.74], [-0.63, 0.70], [-0.63, 0.46], [-0.71, 0.42], [-0.71, -0.48], [-0.64, -0.52], [-0.63, -0.72], [-0.70, -0.76], [-0.83, -0.74], [-0.94, -0.78], [-1.22, -0.78], [-1.29, -0.86], [-1.29, -1.00], [-1.23, -1.06], [-0.94, -1.08], [-0.83, -1.12], [-0.80, -1.10], [-0.63, -1.10], [-0.53, -1.22], [-0.24, -1.22], [-0.17, -1.14], [-0.07, -1.24], [-0.06, -1.46], [0.00, -1.52], [0.00, -1.70], [0.07, -1.70], [0.07, -1.24], [0.14, -1.20], [0.17, -1.12], [0.24, -1.24], [0.22, -1.38], [0.28, -1.40], [0.41, -1.40], [0.54, -1.36], [0.56, -1.18], [0.63, -1.10], [0.83, -1.12], [0.94, -1.08], [1.16, -1.08]],
  rapidDense2: [[-2.11, -0.24], [-2.07, -0.26], [-1.96, -0.54], [-1.83, -0.66], [-1.79, -0.64], [-1.45, -0.80], [-1.08, -0.78], [-0.81, -0.66], [-0.74, -0.58], [-0.55, -0.72], [-0.07, -0.86], [0.21, -0.84], [0.35, -0.74], [0.55, -0.72], [0.70, -0.58], [1.07, -0.78], [1.43, -0.80], [1.77, -0.64], [1.81, -0.66], [1.95, -0.52], [2.11, 0.00], [1.95, 0.48], [1.84, 0.60], [1.60, 0.70], [1.19, 0.76], [0.79, 0.62], [0.70, 0.54], [0.55, 0.66], [0.38, 0.66], [0.19, 0.82], [0.19, 0.86], [0.13, 0.78], [0.10, 0.86], [0.04, 0.78], [0.01, 0.86], [-0.04, 0.78], [-0.09, 0.86], [-0.13, 0.80], [-0.21, 0.86], [-0.21, 0.80], [-0.37, 0.68], [-0.55, 0.66], [-0.72, 0.54], [-0.81, 0.62], [-1.20, 0.76], [-1.52, 0.73], [-1.83, 0.62], [-1.96, 0.50], [-1.96, 0.42], [-2.07, 0.20], [-2.11, 0.18]],
  rapidDense3: [[-1.34, -0.30], [-1.27, -0.46], [-1.17, -0.48], [-1.08, -0.46], [-1.02, -0.58], [-0.87, -0.60], [-0.78, -0.68], [-0.26, -0.62], [-0.05, -0.74], [0.08, -0.74], [0.29, -0.62], [0.99, -0.62], [1.07, -0.58], [1.15, -0.46], [1.26, -0.46], [1.34, -0.40], [1.34, -0.34], [1.27, -0.24], [1.05, -0.22], [1.04, -0.14], [0.95, 0.00], [0.82, 0.04], [0.49, 0.02], [0.35, 0.22], [0.31, 0.38], [0.24, 0.42], [0.22, 0.50], [0.13, 0.58], [0.15, 0.64], [0.21, 0.66], [0.22, 0.74], [-0.20, 0.74], [-0.20, 0.66], [-0.11, 0.60], [-0.19, 0.50], [-0.21, 0.42], [-0.28, 0.38], [-0.32, 0.22], [-0.47, 0.02], [-0.80, 0.04], [-0.92, 0.02], [-1.02, -0.14], [-1.04, -0.24], [-1.20, -0.18], [-1.28, -0.24]],
  rapidDense4: [[3.13, 1.44], [3.07, 1.50], [3.00, 1.46], [2.92, 1.54], [2.55, 1.54], [2.47, 1.46], [2.40, 1.50], [2.34, 1.44], [2.33, 1.28], [2.24, 1.26], [1.88, 1.30], [1.83, 1.32], [1.47, 1.32], [1.42, 1.40], [0.44, 1.42], [0.42, 1.48], [0.33, 1.54], [0.27, 1.50], [0.19, 1.54], [-0.19, 1.54], [-0.22, 1.50], [-0.33, 1.54], [-0.41, 1.50], [-0.44, 1.42], [-0.56, 1.50], [-0.72, 1.50], [-0.90, 1.48], [-1.25, 1.56], [-1.79, 1.50], [-1.92, 1.44], [-2.12, 1.40], [-2.28, 1.42], [-2.30, 1.48], [-2.38, 1.54], [-2.46, 1.50], [-2.53, 1.54], [-2.91, 1.54], [-2.95, 1.50], [-3.06, 1.54], [-3.12, 1.50], [-3.12, 1.44], [-3.17, 1.36], [-3.14, 1.28], [-3.17, 1.22], [-3.17, 0.80], [-3.14, 0.78], [-3.17, 0.66], [-3.12, 0.60], [-3.07, 0.58], [-3.06, 0.52], [-3.12, 0.16], [-3.12, -0.30], [-3.06, -0.70], [-3.17, -0.80], [-3.14, -0.88], [-3.17, -0.94], [-3.17, -1.34], [-3.14, -1.38], [-3.17, -1.48], [-3.14, -1.56], [-2.70, -1.56], [-2.70, -0.92], [-2.59, -0.82], [-2.39, -0.88], [-2.06, -0.86], [-1.98, -0.78], [-1.87, -0.74], [-1.71, -0.74], [-1.63, -0.84], [-1.54, -0.86], [-1.53, -0.84], [-1.62, -0.76], [-1.61, -0.72], [-1.52, -0.66], [-1.21, -0.66], [-1.18, -0.72], [-1.04, -0.68], [-0.97, -0.60], [-1.00, -0.46], [-0.97, -0.46], [-0.93, -0.50], [-0.90, -0.48], [-0.93, -0.38], [-0.46, -0.16], [-0.38, -0.14], [-0.23, -0.22], [-0.25, -0.10], [-0.08, -0.08], [0.02, -0.10], [0.15, -0.06], [0.22, -0.10], [0.29, -0.04], [0.47, -0.04], [0.55, -0.10], [0.55, -0.02], [0.68, 0.08], [0.69, 0.90], [0.93, 0.90], [1.01, 0.92], [1.08, 0.90], [1.15, 0.92], [1.49, 0.90], [1.55, 0.94], [1.61, 0.94], [1.66, 0.90], [1.70, 0.94], [2.04, 0.92], [2.11, 0.98], [2.33, 0.98], [2.43, 0.90], [2.49, 0.98], [2.50, 1.28], [2.56, 1.16], [2.72, 1.16], [2.76, 1.18], [2.86, 1.18], [2.94, 1.28], [2.99, 1.24], [3.00, 0.96], [3.07, 0.90], [3.13, 0.96], [3.17, 1.12]],
  rapidDense5: [[-2.40, -2.82], [-2.26, -2.82], [-2.14, -2.90], [-1.96, -2.94], [-1.60, -2.94], [-1.36, -2.84], [-1.26, -2.88], [-1.16, -3.02], [-1.08, -3.06], [-0.92, -3.04], [-0.74, -2.98], [-0.62, -2.98], [-0.50, -3.04], [-0.44, -3.00], [-0.36, -3.04], [0.36, -3.02], [0.48, -3.10], [0.58, -3.10], [0.74, -3.00], [0.88, -3.10], [1.02, -3.14], [1.76, -3.12], [1.88, -3.14], [1.90, -3.16], [1.98, -3.16], [2.06, -3.06], [2.18, -3.00], [2.28, -3.04], [2.36, -3.00], [2.44, -2.88], [2.42, -2.76], [2.44, -2.74], [2.44, -2.30], [2.42, -2.28], [2.44, -2.16], [2.34, -2.06], [2.32, -2.00], [2.32, 0.46], [2.40, 0.48], [2.44, 0.56], [2.42, 0.68], [2.44, 0.70], [2.44, 1.12], [2.42, 1.14], [2.44, 1.28], [2.32, 1.50], [2.32, 1.76], [2.24, 1.84], [2.24, 2.30], [2.12, 2.60], [2.20, 2.86], [2.20, 2.96], [2.16, 3.06], [2.10, 3.06], [2.04, 3.12], [2.04, 3.16], [1.86, 3.16], [1.86, 3.06], [1.76, 2.98], [1.80, 2.78], [1.78, 2.68], [1.86, 2.64], [1.86, 2.52], [1.82, 2.48], [1.80, 2.26], [1.84, 2.14], [1.78, 2.04], [1.80, 2.00], [1.78, 1.42], [1.82, 1.30], [1.76, 1.26], [1.66, 0.92], [1.62, 0.90], [1.50, 0.90], [1.52, 1.02], [1.58, 1.08], [1.54, 1.18], [1.44, 1.08], [1.36, 0.92], [1.28, 0.88], [1.22, 0.66], [1.02, 0.60], [1.04, 0.56], [1.12, 0.56], [1.10, 0.50], [0.94, 0.48], [0.62, 0.30], [0.54, 0.28], [0.40, 0.14], [0.26, 0.16], [0.18, 0.16], [0.14, 0.12], [0.14, -0.02], [0.08, 0.00], [0.06, 0.06], [-0.02, 0.08], [-0.02, -0.06], [0.14, -0.18], [0.14, -0.28], [0.10, -0.30], [-0.08, -0.24], [-0.12, -0.26], [-0.14, -0.34], [-0.06, -0.34], [-0.10, -0.40], [-0.08, -0.42], [-0.02, -0.38], [0.10, -0.42], [0.14, -0.46], [0.14, -0.60], [0.12, -0.62], [0.00, -0.56], [-0.12, -0.54], [-0.10, -0.58], [0.06, -0.66], [0.10, -0.72], [-0.22, -0.74], [-0.30, -0.82], [-0.32, -0.92], [0.06, -0.94], [0.06, -1.02], [-0.12, -1.26], [-0.14, -1.38], [-0.34, -1.48], [-0.32, -1.54], [-0.22, -1.56], [-0.28, -1.66], [-0.30, -2.02], [-0.38, -2.10], [-0.44, -2.04], [-0.52, -2.00], [-0.56, -2.02], [-0.46, -2.28], [-0.52, -2.40], [-0.60, -2.44], [-0.62, -2.54], [-0.64, -2.54], [-0.72, -2.40], [-0.78, -2.36], [-0.84, -2.38], [-1.00, -2.56], [-1.18, -2.44], [-1.26, -2.46], [-1.30, -2.54], [-1.40, -2.46], [-1.52, -2.46], [-1.82, -2.60], [-1.98, -2.60], [-2.04, -2.56], [-2.08, -2.62], [-2.40, -2.62], [-2.44, -2.66], [-2.44, -2.80]],
  rapidDense6: [[-1.94, 2.48], [-1.94, 2.38], [-2.00, 2.32], [-2.00, 2.04], [-1.94, 1.96], [-2.00, 1.92], [-2.00, 1.54], [-1.94, 1.48], [-2.00, 1.42], [-2.00, 1.32], [-2.06, 1.22], [-2.04, 1.08], [-2.08, 1.02], [-2.08, 0.94], [-2.16, 0.80], [-2.16, 0.64], [-2.24, 0.58], [-2.24, 0.42], [-2.16, 0.36], [-2.10, -0.04], [-2.00, -0.14], [-2.00, -1.56], [-2.04, -1.60], [-2.08, -1.62], [-2.12, -1.70], [-2.10, -1.74], [-2.16, -1.78], [-2.16, -1.84], [-2.24, -1.90], [-2.24, -2.06], [-2.16, -2.10], [-2.16, -2.18], [-2.10, -2.20], [-2.08, -2.32], [-1.96, -2.36], [-1.90, -2.34], [-1.88, -2.40], [-1.80, -2.42], [-1.76, -2.48], [-1.58, -2.48], [-1.54, -2.42], [-1.28, -2.40], [-1.08, -2.26], [-0.08, -2.26], [0.18, -2.38], [0.38, -2.36], [0.52, -2.42], [0.64, -2.40], [0.70, -2.48], [0.90, -2.48], [0.96, -2.40], [1.28, -2.44], [1.62, -2.28], [1.74, -2.28], [1.80, -2.24], [2.14, -2.24], [2.24, -2.18], [2.24, -2.04], [1.92, -2.02], [1.76, -2.06], [1.72, -2.02], [1.50, -2.02], [1.48, -1.96], [1.34, -1.96], [1.24, -1.82], [1.22, -0.90], [1.16, -0.86], [1.08, -0.90], [1.06, -1.12], [1.02, -1.02], [1.00, -0.90], [1.10, -0.76], [1.06, -0.76], [0.96, -0.80], [0.92, -0.76], [0.98, -0.72], [0.94, -0.66], [0.98, -0.60], [0.98, -0.54], [0.90, -0.48], [0.74, -0.46], [0.76, -0.32], [0.70, -0.22], [0.76, -0.20], [0.76, -0.16], [0.64, -0.16], [0.62, -0.04], [0.44, 0.12], [0.34, 0.20], [0.34, 0.26], [0.44, 0.34], [0.44, 0.38], [0.34, 0.34], [0.28, 0.30], [0.28, 0.22], [0.22, 0.22], [0.18, 0.40], [0.12, 0.46], [0.28, 0.58], [0.24, 0.62], [0.12, 0.56], [0.08, 0.58], [0.08, 0.64], [0.16, 0.66], [0.08, 0.74], [0.08, 0.78], [0.28, 0.80], [0.32, 0.84], [0.28, 0.94], [-0.70, 0.94], [-0.88, 0.92], [-0.90, 0.84], [-0.86, 0.76], [-0.64, 0.80], [-0.56, 0.78], [-0.82, 0.74], [-0.82, 0.70], [-0.76, 0.68], [-0.84, 0.58], [-0.98, 0.62], [-0.98, 0.58], [-0.90, 0.54], [-0.92, 0.50], [-1.12, 0.54], [-1.30, 0.50], [-1.32, 0.54], [-1.28, 0.64], [-1.34, 0.64], [-1.38, 0.58], [-1.42, 0.56], [-1.48, 0.58], [-1.52, 0.66], [-1.58, 0.62], [-1.68, 0.64], [-1.82, 0.50], [-1.84, 0.52], [-1.84, 0.62], [-1.88, 0.66], [-1.84, 0.74], [-1.84, 1.02], [-1.76, 1.06], [-1.76, 1.36], [-1.82, 1.50], [-1.76, 1.54], [-1.76, 1.84], [-1.82, 1.98], [-1.76, 2.04], [-1.76, 2.34], [-1.84, 2.42]],
  rapidDense7: [[-1.16, -3.02], [-0.88, -3.02], [-0.74, -3.04], [-0.40, -3.04], [-0.38, -3.06], [-0.10, -3.02], [0.14, -3.20], [0.24, -3.20], [0.36, -3.16], [0.52, -3.24], [0.58, -3.24], [0.68, -3.16], [1.28, -3.18], [1.32, -3.10], [1.38, -3.12], [1.46, -3.08], [1.44, -3.04], [1.48, -2.94], [1.48, -2.88], [1.52, -2.84], [1.52, -2.42], [1.46, -2.38], [1.48, -2.32], [1.38, -2.16], [1.40, -1.02], [1.46, -1.00], [1.48, -0.94], [1.48, -0.88], [1.52, -0.84], [1.52, -0.42], [1.48, -0.38], [1.48, -0.32], [1.46, -0.24], [1.40, -0.22], [1.42, -0.18], [1.38, -0.12], [1.40, 0.56], [1.46, 0.64], [1.52, 0.84], [1.48, 0.98], [1.60, 1.16], [1.60, 1.30], [1.56, 1.42], [1.42, 1.56], [1.44, 1.82], [1.56, 1.98], [1.58, 2.22], [1.52, 2.48], [1.54, 2.80], [1.38, 3.08], [1.38, 3.24], [1.21, 3.24], [1.21, 2.84], [1.10, 2.80], [1.04, 2.76], [1.06, 2.72], [1.16, 2.68], [1.22, 2.54], [1.18, 2.44], [1.08, 2.38], [1.06, 2.04], [1.02, 1.96], [1.04, 1.76], [0.94, 1.62], [1.06, 1.46], [1.06, 1.39], [0.94, 1.26], [0.96, 1.20], [1.02, 1.14], [1.02, 1.10], [0.72, 1.04], [0.62, 1.20], [0.56, 1.22], [0.62, 1.06], [0.52, 1.04], [0.52, 1.14], [0.46, 1.16], [0.44, 1.06], [0.40, 1.02], [0.18, 1.14], [0.12, 1.30], [0.10, 1.28], [0.08, 1.16], [-0.22, 1.20], [-0.34, 1.14], [-0.36, 1.38], [-0.52, 1.38], [-0.54, 1.02], [-0.58, 1.00], [-0.62, 1.02], [-0.60, 1.16], [-0.64, 1.18], [-0.68, 1.00], [-0.78, 0.94], [-0.80, 1.14], [-0.84, 1.18], [-0.88, 0.94], [-1.00, 0.84], [-1.08, 0.50], [-1.52, 0.50], [-1.56, 0.48], [-1.56, 0.40], [-1.52, 0.32], [-1.22, 0.30], [-1.34, -0.06], [-1.32, -0.28], [-1.42, -0.32], [-1.44, -0.38], [-1.32, -0.32], [-1.26, -0.36], [-1.22, -0.44], [-1.22, -0.52], [-1.38, -0.62], [-1.32, -0.66], [-1.22, -0.62], [-1.20, -0.66], [-1.30, -0.86], [-1.24, -1.04], [-1.56, -1.04], [-1.60, -1.16], [-1.54, -1.24], [-1.20, -1.24], [-1.18, -1.26], [-1.22, -1.48], [-1.18, -1.70], [-0.92, -1.90], [-0.88, -2.00], [-0.94, -2.10], [-1.04, -2.08], [-1.04, -2.14], [-0.94, -2.18], [-0.94, -2.26], [-1.10, -2.22], [-1.16, -2.16], [-1.20, -2.18], [-1.14, -2.28], [-0.98, -2.34], [-1.06, -2.64], [-1.20, -2.68], [-1.24, -2.90]],
  rapidDense8: [[0.50, 4.02], [0.58, 3.87], [0.54, 3.73], [0.46, 3.65], [0.50, 3.58], [0.58, 3.56], [0.58, 3.20], [0.53, 3.13], [0.53, 2.70], [0.59, 2.54], [0.90, 2.54], [0.95, 2.42], [0.91, 2.20], [0.60, 2.20], [0.53, 2.03], [0.53, 0.87], [0.60, 0.71], [0.91, 0.71], [0.95, 0.48], [0.91, 0.36], [0.60, 0.36], [0.52, 0.20], [0.54, -1.03], [0.61, -1.12], [0.83, -1.10], [0.91, -1.12], [0.92, -1.45], [0.83, -1.49], [0.60, -1.46], [0.52, -1.63], [0.52, -2.79], [0.59, -2.95], [0.83, -2.93], [0.91, -2.96], [0.93, -3.25], [0.91, -3.29], [0.83, -3.32], [0.55, -3.32], [0.50, -3.45], [0.48, -3.80], [0.37, -3.94], [0.30, -3.92], [0.29, -3.83], [0.17, -3.71], [0.19, -3.45], [0.13, -3.32], [0.06, -3.44], [0.05, -3.70], [-0.01, -3.79], [-0.01, -3.89], [-0.08, -3.90], [-0.09, -3.42], [-0.14, -3.32], [-0.19, -3.31], [-0.25, -3.45], [-0.25, -3.76], [-0.35, -3.89], [-0.35, -3.97], [-0.38, -4.02], [-0.43, -4.02], [-0.55, -3.78], [-0.55, -3.44], [-0.60, -3.32], [-0.95, -3.29], [-0.95, -2.96], [-0.61, -2.94], [-0.55, -2.81], [-0.57, -1.56], [-0.63, -1.46], [-0.81, -1.46], [-0.84, -1.49], [-0.95, -1.46], [-0.95, -1.12], [-0.85, -1.10], [-0.81, -1.12], [-0.64, -1.12], [-0.56, -1.03], [-0.55, -0.97], [-0.56, 0.27], [-0.62, 0.36], [-0.85, 0.34], [-0.95, 0.37], [-0.95, 0.70], [-0.85, 0.73], [-0.81, 0.71], [-0.62, 0.71], [-0.55, 0.85], [-0.55, 2.04], [-0.62, 2.20], [-0.81, 2.20], [-0.85, 2.17], [-0.95, 2.20], [-0.95, 2.53], [-0.85, 2.56], [-0.81, 2.54], [-0.60, 2.56], [-0.60, 2.59], [-0.50, 2.75], [-0.54, 2.79], [-0.69, 2.79], [-0.70, 2.82], [-0.51, 2.87], [-0.54, 2.89], [-0.69, 2.90], [-0.70, 2.92], [-0.53, 2.94], [-0.52, 2.97], [-0.69, 3.00], [-0.70, 3.03], [-0.54, 3.03], [-0.52, 3.07], [-0.68, 3.09], [-0.70, 3.12], [-0.53, 3.13], [-0.52, 3.17], [-0.69, 3.19], [-0.70, 3.22], [-0.43, 3.26], [-0.09, 3.22], [-0.11, 3.19], [-0.28, 3.17], [-0.27, 3.13], [-0.09, 3.12], [-0.12, 3.09], [-0.28, 3.07], [-0.26, 3.03], [-0.09, 3.03], [-0.11, 3.00], [-0.26, 2.99], [-0.28, 2.97], [-0.27, 2.94], [-0.09, 2.93], [-0.11, 2.90], [-0.26, 2.89], [-0.28, 2.87], [-0.27, 2.84], [-0.10, 2.84], [-0.06, 2.93], [0.00, 2.97], [0.00, 3.14], [0.06, 3.14], [0.07, 2.67], [0.12, 2.56], [0.18, 2.56], [0.23, 2.68], [0.23, 3.15], [0.19, 3.21], [0.19, 3.55], [0.30, 3.63], [0.21, 3.74], [0.19, 3.88], [0.27, 3.99], [0.26, 4.02]],
};

const LAYOUT_FEATURE_TYPES = {
  rapidLight1: { label: "Light RI 1", button: "Light 1", kind: "light", shape: "custom", width: 1.24, height: 3.76, points: RI_FEATURE_POINTS.rapidLight1, source: "Rapid Ingress TH-TH-A light" },
  rapidLight2: { label: "Light RI 2", button: "Light 2", kind: "light", shape: "custom", width: 1.83, height: 1.63, points: RI_FEATURE_POINTS.rapidLight2, source: "Rapid Ingress TH-TH-A light" },
  rapidLight3: { label: "Light RI 3", button: "Light 3", kind: "light", shape: "custom", width: 1.82, height: 2.93, points: RI_FEATURE_POINTS.rapidLight3, source: "Rapid Ingress TH-TH-A light" },
  rapidLight4: { label: "Light RI 4", button: "Light 4", kind: "light", shape: "custom", width: 1.57, height: 4.77, points: RI_FEATURE_POINTS.rapidLight4, source: "Rapid Ingress TH-TH-A light" },
  rapidLight5: { label: "Light RI 5", button: "Light 5", kind: "light", shape: "custom", width: 2.87, height: 1.84, points: RI_FEATURE_POINTS.rapidLight5, source: "Rapid Ingress TH-TH-A light" },
  rapidLight6: { label: "Light RI 6", button: "Light 6", kind: "light", shape: "custom", width: 3.08, height: 1.7, points: RI_FEATURE_POINTS.rapidLight6, source: "Rapid Ingress TH-TH-A light" },
  rapidDense1: { label: "Dense RI 1", button: "Dense 1", kind: "dense", shape: "custom", width: 2.58, height: 3.41, points: RI_FEATURE_POINTS.rapidDense1, source: "Rapid Ingress TH-TH-A dense" },
  rapidDense2: { label: "Dense RI 2", button: "Dense 2", kind: "dense", shape: "custom", width: 4.22, height: 1.73, points: RI_FEATURE_POINTS.rapidDense2, source: "Rapid Ingress TH-TH-A dense" },
  rapidDense3: { label: "Dense RI 3", button: "Dense 3", kind: "dense", shape: "custom", width: 2.68, height: 1.47, points: RI_FEATURE_POINTS.rapidDense3, source: "Rapid Ingress TH-TH-A dense" },
  rapidDense4: { label: "Dense RI 4", button: "Dense 4", kind: "dense", shape: "custom", width: 6.34, height: 3.13, points: RI_FEATURE_POINTS.rapidDense4, source: "Rapid Ingress TH-TH-A dense" },
  rapidDense5: { label: "Dense RI 5", button: "Dense 5", kind: "dense", shape: "custom", width: 4.89, height: 6.33, points: RI_FEATURE_POINTS.rapidDense5, source: "Rapid Ingress TH-TH-A dense" },
  rapidDense6: { label: "Dense RI 6", button: "Dense 6", kind: "dense", shape: "custom", width: 4.49, height: 4.97, points: RI_FEATURE_POINTS.rapidDense6, source: "Rapid Ingress TH-TH-A dense" },
  rapidDense7: { label: "Dense RI 7", button: "Dense 7", kind: "dense", shape: "custom", width: 3.21, height: 6.46, points: RI_FEATURE_POINTS.rapidDense7, source: "Rapid Ingress TH-TH-A dense" },
  rapidDense8: { label: "Dense RI 8", button: "Dense 8", kind: "dense", shape: "custom", width: 1.9, height: 8.04, points: RI_FEATURE_POINTS.rapidDense8, source: "Rapid Ingress TH-TH-A dense" },
};

const DEFAULT_LAYOUT_WALL_SET = [
  { type: "AB", x: 7, y: 8 }, { type: "AB", x: 37, y: 52, rotation: 180 },
  { type: "CD", x: 18, y: 8 }, { type: "CD", x: 26, y: 52, rotation: 180 },
  { type: "EF", x: 31, y: 8 }, { type: "EF", x: 13, y: 52, rotation: 180 },
  { type: "GH", x: 40, y: 17 }, { type: "GH", x: 4, y: 43, rotation: 180 },
];

const MAP_DB_NAME = "warhammer-los-maps";
const MAP_STORE_NAME = "maps";

function layoutPresetFor(defender, attacker, variant) {
  const exactKey = `${defender}|${attacker}|${variant}`;
  const exactPreset = LAYOUT_PRESETS[exactKey];
  if (exactPreset) return { key: exactKey, preset: exactPreset, reversed: false };
  const reversedKey = `${attacker}|${defender}|${variant}`;
  const reversedPreset = LAYOUT_PRESETS[reversedKey];
  return reversedPreset ? { key: reversedKey, preset: reversedPreset, reversed: true } : { key: exactKey, preset: null, reversed: false };
}

function layoutPresetForKey(layoutKey) {
  if (LAYOUT_PRESETS[layoutKey]) return LAYOUT_PRESETS[layoutKey];
  const [defender, attacker, variant] = String(layoutKey || "").split("|");
  if (!defender || !attacker || !variant) return null;
  return layoutPresetFor(defender, attacker, variant).preset;
}

function openMapDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MAP_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MAP_STORE_NAME)) db.createObjectStore(MAP_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeStoredMap(key, imageSrc) {
  const db = await openMapDatabase();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(MAP_STORE_NAME, "readwrite");
    const store = transaction.objectStore(MAP_STORE_NAME);
    if (imageSrc) store.put(imageSrc, key);
    else store.delete(key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function readStoredMap(key) {
  if (!key) return null;
  const db = await openMapDatabase();
  const imageSrc = await new Promise((resolve, reject) => {
    const request = db.transaction(MAP_STORE_NAME, "readonly").objectStore(MAP_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return imageSrc;
}

async function deleteStoredMap(key) {
  if (!key) return;
  await writeStoredMap(key, null);
}

export default function InteractiveLOSTool() {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const importJsonRef = useRef(null);
  const imgRef = useRef(null);
  const losWorkerRef = useRef(null);
  const losPreviewWorkerRef = useRef(null);
  const enemyLosWorkerRef = useRef(null);
  const losWorkerRequestIdRef = useRef(0);
  const losWorkerSceneKeyRef = useRef("");
  const losPreviewWorkerSceneKeyRef = useRef("");
  const enemyLosWorkerSceneKeyRef = useRef("");
  const latestLosWorkerRequestsRef = useRef(new Map());
  const interactivePreviewInFlightRef = useRef(false);
  const pendingInteractivePreviewRef = useRef(null);
  const losDragRevisionRef = useRef(0);
  const lastAcceptedDragRevisionRef = useRef(0);
  const latestEnemyLosWorkerRequestRef = useRef(null);
  const enemyLosCacheRef = useRef({ key: "", states: [] });
  const markerEnemyLosCacheRef = useRef(new Map());
  const lastInteractiveEnemyLosRef = useRef(0);
  const pendingEnemyLosTimerRef = useRef(null);
  const draggingRef = useRef(false);
  const panningRef = useRef(false);
  const panLastRef = useRef(null);
  const panKeysRef = useRef(new Set());
  const keyboardPanFrameRef = useRef(null);
  const keyboardPanLastTimeRef = useRef(null);
  const objectDragRef = useRef(null);
  const dragFrameRef = useRef(null);
  const pendingDragPointRef = useRef(null);
  const marqueeSelectionRef = useRef(null);
  const multiSelectedMarkerIdsRef = useRef(new Set());
  const perfStatsRef = useRef({
    draw: { total: 0, count: 0, max: 0 },
    visibility: { total: 0, count: 0, max: 0 },
    markerVisibility: { total: 0, count: 0, max: 0 },
    enemyLos: { total: 0, count: 0, max: 0 },
    lastLog: 0,
  });
  const saveTimerRef = useRef(null);
  const layoutSaveReadyRef = useRef(false);
  const storedMapSourcesRef = useRef(new Map());

  const [mode, setMode] = useState("pan");
  const [status, setStatus] = useState("Upload a map image, then drag the LOS point. Draw footprints, walls, and enemies.");
  const [imageReady, setImageReady] = useState(false);
  const [baseShape, setBaseShape] = useState("circle");
  const [baseLengthMm, setBaseLengthMm] = useState(40);
  const [baseWidthMm, setBaseWidthMm] = useState(40);
  const [baseRotation, setBaseRotation] = useState(0);
  const [scaleInches, setScaleInches] = useState(6);
  const [rangeInches, setRangeInches] = useState("unlimited");
  const [homeDeploymentRangeInches, setHomeDeploymentRangeInches] = useState("unlimited");
  const [enemyDeploymentRangeInches, setEnemyDeploymentRangeInches] = useState("unlimited");
  const [deepstrikeRangeInches, setDeepstrikeRangeInches] = useState(8);
  const [deepstrikeVisible, setDeepstrikeVisible] = useState(false);
  const [pixelsPerInch, setPixelsPerInch] = useState(null);
  const [saveName, setSaveName] = useState("Game 1");
  const [saveSlots, setSaveSlots] = useState([]);
  const [selectedSave, setSelectedSave] = useState("");
  const [defenderForceDisposition, setDefenderForceDisposition] = useState("Take and Hold");
  const [attackerForceDisposition, setAttackerForceDisposition] = useState("Take and Hold");
  const [selectedLayoutVariant, setSelectedLayoutVariant] = useState("A");
  const [missionCardsVisible, setMissionCardsVisible] = useState(false);
  const [opponentMissionCardsVisible, setOpponentMissionCardsVisible] = useState(false);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [selectiveFootprintRemoveMode, setSelectiveFootprintRemoveMode] = useState(false);
  const [selectedLayoutTerrainId, setSelectedLayoutTerrainId] = useState(null);
  const [layoutTerrainRelationVersion, setLayoutTerrainRelationVersion] = useState(0);
  const [selectedLayoutWallId, setSelectedLayoutWallId] = useState(null);
  const [selectedLayoutFeatureId, setSelectedLayoutFeatureId] = useState(null);
  const [selectedLayoutObjectiveId, setSelectedLayoutObjectiveId] = useState(null);
  const [layoutLinkMode, setLayoutLinkMode] = useState(false);
  const [firstLinkedTerrainId, setFirstLinkedTerrainId] = useState(null);
  const [firstLinkedWallId, setFirstLinkedWallId] = useState(null);
  const [firstLinkedFeatureId, setFirstLinkedFeatureId] = useState(null);
  const [activeLosId, setActiveLosId] = useState("los-1");
  const [losName, setLosName] = useState("LOS");
  const [losVersion, setLosVersion] = useState(0);
  const [markerGroupingMode, setMarkerGroupingMode] = useState("model");
  const [unitModelCount, setUnitModelCount] = useState(1);
  const [selectedUnitSlot, setSelectedUnitSlot] = useState(1);
  const [activeUnitSlot, setActiveUnitSlot] = useState(null);
  const [armyListText, setArmyListText] = useState("");
  const [armyResults, setArmyResults] = useState([]);
  const [modelSearch, setModelSearch] = useState("");
  const [modelSearchIndex, setModelSearchIndex] = useState(0);
  const [armyPresetName, setArmyPresetName] = useState("Army 1");
  const [armyPresetNames, setArmyPresetNames] = useState([]);
  const [selectedArmyPreset, setSelectedArmyPreset] = useState("");
  const [editingArmyPresetName, setEditingArmyPresetName] = useState(false);
  const [editingSaveName, setEditingSaveName] = useState(false);
  const [showNewGamePrompt, setShowNewGamePrompt] = useState(false);
  const [expandedMissionCards, setExpandedMissionCards] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customGridWidth, setCustomGridWidth] = useState(44);
  const [customGridLength, setCustomGridLength] = useState(60);
  const [showLightTerrainFeatures, setShowLightTerrainFeatures] = useState(true);
  const [showDenseTerrainFeatures, setShowDenseTerrainFeatures] = useState(true);
  const [showObjectives, setShowObjectives] = useState(true);
  const [movementPlanningEnabled, setMovementPlanningEnabled] = useState(false);
  const [activeMovementPhase, setActiveMovementPhase] = useState("deployment");
  const [plannerHelpOpen, setPlannerHelpOpen] = useState(false);
  const plannerHelpRef = useRef(null);
  const [generalHelpPosition, setGeneralHelpPosition] = useState(null);
  const generalHelpRef = useRef(null);
  const [mapSectionOpen, setMapSectionOpen] = useState({
    modify: false,
    upload: false,
    create: false,
    edit: false,
  });
  const [editSubsectionOpen, setEditSubsectionOpen] = useState({
    footprints: false,
    features: false,
    walls: false,
    freeDraw: false,
    manipulation: false,
    deployment: false,
    objectives: false,
    exportDownload: false,
  });
  const [sectionOpen, setSectionOpen] = useState({
    game: true,
    layout: true,
    importGame: false,
    createUpload: false,
    army: true,
    scale: true,
    markers: true,
    units: true,
    draw: true,
  });
  const [activeSidebarHelp, setActiveSidebarHelp] = useState(null);
  const sidebarHelpRef = useRef(null);

  useEffect(() => {
    if (!activeSidebarHelp) return undefined;
    const closeHelp = (event) => {
      if (sidebarHelpRef.current?.contains(event.target)) return;
      if (event.target.closest?.("[data-sidebar-help-button]")) return;
      setActiveSidebarHelp(null);
    };
    document.addEventListener("pointerdown", closeHelp);
    return () => document.removeEventListener("pointerdown", closeHelp);
  }, [activeSidebarHelp]);

  useEffect(() => {
    if (!plannerHelpOpen) return undefined;
    const closePlannerHelp = (event) => {
      if (plannerHelpRef.current?.contains(event.target)) return;
      setPlannerHelpOpen(false);
    };
    document.addEventListener("pointerdown", closePlannerHelp);
    return () => document.removeEventListener("pointerdown", closePlannerHelp);
  }, [plannerHelpOpen]);

  useEffect(() => {
    if (!generalHelpPosition) return undefined;
    const closeGeneralHelp = (event) => {
      if (generalHelpRef.current?.contains(event.target)) return;
      setGeneralHelpPosition(null);
    };
    document.addEventListener("pointerdown", closeGeneralHelp);
    return () => document.removeEventListener("pointerdown", closeGeneralHelp);
  }, [generalHelpPosition]);

  const state = useRef({
    W: 900,
    H: 600,
    boardWidthInches: BATTLEFIELD_WIDTH_INCHES,
    boardHeightInches: BATTLEFIELD_HEIGHT_INCHES,
    fit: { x: 0, y: 0, w: 0, h: 0 },
    camera: { scale: 1, x: 0, y: 0 },
    light: { x: 450, y: 300 },
    losMarkers: [],
    losSize: 1,
    scaleStart: null,
    scalePreview: null,
    rulerStart: null,
    rulerPreview: null,
    rulers: [],
    stickyRulerStart: null,
    stickyRulers: [],
    deploymentLine: null,
    deploymentPath: [],
    deploymentDraft: [],
    deploymentPreview: null,
    deploymentVisible: true,
    deploymentNoMansSide: null,
    deploymentLabelPosition: null,
    deploymentVisibility: { clearZones: [], oneWallZones: [] },
    enemyDeploymentLine: null,
    enemyDeploymentPath: [],
    enemyDeploymentDraft: [],
    enemyDeploymentPreview: null,
    enemyDeploymentVisible: true,
    enemyDeploymentNoMansSide: null,
    enemyDeploymentLabelPosition: null,
    enemyDeploymentVisibility: { clearZones: [], oneWallZones: [] },
    blockers: [],
    blockerIds: [],
    interactiveBlockers: [],
    walls: [],
    enemies: [],
    enemyLosStates: [],
    enemyLosRays: [],
    enemyLosPendingIndexes: new Set(),
    layoutObjectives: [],
    layoutTerrain: [],
    layoutTerrainLinks: [],
    layoutTerrainGroups: [],
    layoutWalls: [],
    layoutWallLinks: [],
    layoutTerrainFeatures: [],
    layoutFeaturePieces: [],
    layoutFeatureLinks: [],
    movementPhases: {},
    layoutStagingIndex: 0,
    activeLayoutKey: null,
    currentPoly: [],
    wallPath: [],
    wallPreview: null,
    visibility: { clear: [], oneWall: [] },
    losVisibilityCache: new Map(),
    combinedLosRender: { clear: null, oneWall: null },
    movingLosRender: { clear: null, oneWall: null },
    stationaryLosRender: { clear: null, oneWall: null },
    stationaryLosRenderKey: "",
    compositedLosRender: { clear: null, oneWall: null },
    losRenderRevision: 0,
    battlefieldBaseRender: null,
    battlefieldBaseRenderKey: "",
    battlefieldForegroundRender: null,
    battlefieldForegroundRenderKey: "",
    visibilitySceneVersion: 0,
    workerSceneVersion: 0,
    battlefieldBaseVersion: 0,
    battlefieldForegroundVersion: 0,
    combinedLosBuffers: {
      clearMask: null,
      clearRender: null,
      oneWallMask: null,
      oneWallRender: null,
      clearColour: null,
      oneWallColour: null,
      clearCleanupA: null,
      clearCleanupB: null,
      oneWallCleanupA: null,
      oneWallCleanupB: null,
    },
    movingLosBuffers: {
      clearMask: null,
      clearRender: null,
      oneWallMask: null,
      oneWallRender: null,
      clearColour: null,
      oneWallColour: null,
      clearCleanupA: null,
      clearCleanupB: null,
      oneWallCleanupA: null,
      oneWallCleanupB: null,
    },
    stationaryLosBuffers: {
      clearMask: null,
      clearRender: null,
      oneWallMask: null,
      oneWallRender: null,
      clearColour: null,
      oneWallColour: null,
      clearCleanupA: null,
      clearCleanupB: null,
      oneWallCleanupA: null,
      oneWallCleanupB: null,
    },
    compositedLosBuffers: {
      clearMask: null,
      oneWallMask: null,
      footprintMask: null,
      clearColour: null,
      oneWallColour: null,
      render: null,
      revision: -1,
      width: 0,
      height: 0,
    },
  });

  useEffect(() => {
    if (typeof Worker !== "undefined") {
      try {
        const worker = new Worker(new URL("./losWorker.js", import.meta.url), { type: "module" });
        worker.onmessage = (event) => handleLosWorkerMessage(event.data);
        worker.onerror = (error) => {
          console.warn("LOS worker error", error);
          losWorkerRef.current = null;
        };
        losWorkerRef.current = worker;
        const previewWorker = new Worker(new URL("./losWorker.js", import.meta.url), { type: "module" });
        previewWorker.onmessage = (event) => handleLosWorkerMessage(event.data);
        previewWorker.onerror = (error) => {
          console.warn("LOS preview worker error", error);
          losPreviewWorkerRef.current = null;
        };
        losPreviewWorkerRef.current = previewWorker;
        const enemyWorker = new Worker(new URL("./losWorker.js", import.meta.url), { type: "module" });
        enemyWorker.onmessage = (event) => handleLosWorkerMessage(event.data);
        enemyWorker.onerror = (error) => {
          console.warn("Enemy LOS worker error", error);
          enemyLosWorkerRef.current = null;
        };
        enemyLosWorkerRef.current = enemyWorker;
      } catch (error) {
        console.warn("LOS worker unavailable", error);
        losWorkerRef.current = null;
      }
    }
    refreshSaveSlots();
    refreshArmyPresets();
    loadBrowserSave();
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    window.addEventListener("blur", cancelActiveDrag);
    window.addEventListener("blur", stopKeyboardPan);
    return () => {
      if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current);
      stopKeyboardPan();
      if (pendingEnemyLosTimerRef.current) window.clearTimeout(pendingEnemyLosTimerRef.current);
      if (losWorkerRef.current) losWorkerRef.current.terminate();
      if (losPreviewWorkerRef.current) losPreviewWorkerRef.current.terminate();
      if (enemyLosWorkerRef.current) enemyLosWorkerRef.current.terminate();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("blur", cancelActiveDrag);
      window.removeEventListener("blur", stopKeyboardPan);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(resize);
    const timer = setTimeout(resize, 200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [sidebarCollapsed]);

  function recordPerf(label, startedAt) {
    if (!LOS_PERF_DIAGNOSTICS) return;
    const elapsed = performance.now() - startedAt;
    const stats = perfStatsRef.current[label];
    if (!stats) return;
    stats.total += elapsed;
    stats.count += 1;
    stats.max = Math.max(stats.max, elapsed);
    const now = performance.now();
    if (now - perfStatsRef.current.lastLog < 2000) return;
    perfStatsRef.current.lastLog = now;
    const summary = Object.entries(perfStatsRef.current)
      .filter(([, value]) => value && typeof value === "object" && value.count)
      .map(([name, value]) => `${name}: avg ${(value.total / value.count).toFixed(1)}ms, max ${value.max.toFixed(1)}ms`)
      .join(" | ");
    if (summary) console.info(`[LOS perf] ${summary}`);
    Object.values(perfStatsRef.current).forEach((value) => {
      if (!value || typeof value !== "object" || !("count" in value)) return;
      value.total = 0;
      value.count = 0;
      value.max = 0;
    });
  }

  function currentVisibilitySceneKey(blockers = state.current.blockers) {
    return `${state.current.workerSceneVersion}:${state.current.W}:${state.current.H}:${blockers.length}:${state.current.walls.length}`;
  }

  function serializeBlockersForWorker(blockers) {
    return blockers.map((polygon) => ({
      points: polygon.map((point) => ({ x: point.x, y: point.y })),
      footprintGroupId: polygon.footprintGroupId,
      sharedBoundaryTolerance: polygon.sharedBoundaryTolerance,
    }));
  }

  function serializeWallsForWorker(walls) {
    return walls.map((wall) => ({
      a: { x: wall.a.x, y: wall.a.y },
      b: { x: wall.b.x, y: wall.b.y },
    }));
  }

  function ensureLosWorkerScene(worker, sceneKey = currentVisibilitySceneKey(), sceneKeyRef = losWorkerSceneKeyRef) {
    if (!worker) return false;
    if (sceneKeyRef.current === sceneKey) return true;
    worker.postMessage({
      type: "setScene",
      sceneKey,
      blockers: serializeBlockersForWorker(state.current.blockers),
      walls: serializeWallsForWorker(state.current.walls),
      W: state.current.W,
      H: state.current.H,
    });
    sceneKeyRef.current = sceneKey;
    return true;
  }

  function requestDetailedMarkerVisibility(marker) {
    return requestDetailedMarkerVisibilityBatch([marker], { single: true });
  }

  function settledUnitBoundaryMarkerIds(markers) {
    const boundaryIds = new Set();
    const groups = new Map();
    markers.forEach((marker) => {
      if (marker.groupingMode !== "unit" || !marker.unitSlot) {
        boundaryIds.add(marker.id);
        return;
      }
      const key = String(marker.unitSlot);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(marker);
    });
    groups.forEach((members) => {
      if (members.length <= 4) {
        members.forEach((marker) => boundaryIds.add(marker.id));
        return;
      }
      const sorted = [...members].sort((left, right) => left.x - right.x || left.y - right.y);
      const buildHalf = (points) => {
        const half = [];
        points.forEach((point) => {
          while (half.length >= 2) {
            const first = half[half.length - 2];
            const second = half[half.length - 1];
            const turn = (second.x - first.x) * (point.y - first.y)
              - (second.y - first.y) * (point.x - first.x);
            if (turn > 0) break;
            half.pop();
          }
          half.push(point);
        });
        return half;
      };
      const hull = [
        ...buildHalf(sorted).slice(0, -1),
        ...buildHalf([...sorted].reverse()).slice(0, -1),
      ];
      (hull.length ? hull : members).forEach((marker) => boundaryIds.add(marker.id));
    });
    return boundaryIds;
  }

  function markerVisibilityRequestPriority(marker) {
    const { camera, W, H, enemies } = state.current;
    const margin = 80 / Math.max(0.1, camera.scale || 1);
    const left = -camera.x / camera.scale - margin;
    const top = -camera.y / camera.scale - margin;
    const right = (W - camera.x) / camera.scale + margin;
    const bottom = (H - camera.y) / camera.scale + margin;
    const onScreen = marker.x >= left && marker.x <= right && marker.y >= top && marker.y <= bottom;
    const nearestEnemyDistance = enemies.reduce((nearest, enemy) => Math.min(
      nearest,
      (marker.x - enemy.x) ** 2 + (marker.y - enemy.y) ** 2,
    ), Infinity);
    return [
      marker.id === activeLosId ? 0 : 1,
      onScreen ? 0 : 1,
      nearestEnemyDistance,
    ];
  }

  function compareMarkerVisibilityPriority(left, right) {
    const leftPriority = markerVisibilityRequestPriority(left);
    const rightPriority = markerVisibilityRequestPriority(right);
    for (let index = 0; index < leftPriority.length; index += 1) {
      if (leftPriority[index] !== rightPriority[index]) return leftPriority[index] - rightPriority[index];
    }
    return String(left.id).localeCompare(String(right.id));
  }

  function requestDetailedMarkerVisibilityBatch(markers, options = {}) {
    const interactive = Boolean(options.interactive);
    const worker = interactive ? (losPreviewWorkerRef.current || losWorkerRef.current) : losWorkerRef.current;
    const visibleMarkers = (markers || []).filter((marker) => marker && marker.visible !== false);
    const uncachedMarkers = (options.forceRequest
      ? visibleMarkers
      : visibleMarkers.filter((marker) => !getCachedMarkerVisibility(marker, interactive)))
      .sort(compareMarkerVisibilityPriority);
    if (!uncachedMarkers.length) return true;
    if (!worker) return false;
    const allVisibleMarkers = state.current.losMarkers.filter((marker) => marker.visible !== false);
    const largeLosSet = !interactive && allVisibleMarkers.length > 5;
    const boundaryMarkerIds = largeLosSet ? settledUnitBoundaryMarkerIds(allVisibleMarkers) : new Set();
    const markersToRequest = uncachedMarkers.map((marker) => (
      largeLosSet
        ? { ...marker, visibilityOriginMode: boundaryMarkerIds.has(marker.id) ? "unit" : "reduced" }
        : marker
    ));
    if (!markersToRequest.length) return false;
    if (!interactive) worker.postMessage({ type: "cancelVisibility" });
    const sceneKey = currentVisibilitySceneKey();
    ensureLosWorkerScene(
      worker,
      sceneKey,
      interactive && losPreviewWorkerRef.current ? losPreviewWorkerSceneKeyRef : losWorkerSceneKeyRef,
    );
    // Keep one progressive worker job per request. Multiple tiny async batches can
    // interleave inside a worker and repeat the same scene work.
    const chunks = [markersToRequest];
    const jobGroupId = ++losWorkerRequestIdRef.current;
    const sharedPayload = {
      sceneKey,
      W: state.current.W,
      H: state.current.H,
      pixelsPerInch,
      reducedOrigins: interactive,
      originMode: interactive ? "reduced" : (largeLosSet ? "unit" : "full"),
      jobGroupId,
      interactive,
      clearOnly: interactive && Boolean(options.preview),
    };
    chunks.forEach((chunk, chunkIndex) => {
      const requestId = ++losWorkerRequestIdRef.current;
      chunk.forEach((marker) => {
        latestLosWorkerRequestsRef.current.set(marker.id, {
          requestId,
          sceneKey,
          x: marker.x,
          y: marker.y,
          interactive,
          preview: Boolean(options.preview),
          dragRevision: options.dragRevision,
          activeMarkerIds: options.activeMarkerIds || chunk.map((item) => item.id),
        });
      });
      const postChunk = () => worker.postMessage({
        ...sharedPayload,
        type: options.single && chunk.length === 1 ? "markerVisibility" : "markerVisibilityBatch",
        requestId,
        marker: options.single && chunk.length === 1 ? { ...chunk[0] } : undefined,
        markers: options.single && chunk.length === 1 ? undefined : chunk.map((marker) => ({ ...marker })),
        progressive: !options.preview,
      });
      const postChunkIfCurrent = () => {
        if (sceneKey !== currentVisibilitySceneKey()) return;
        const chunkStillCurrent = chunk.every((marker) => {
          const latest = latestLosWorkerRequestsRef.current.get(marker.id);
          return latest?.requestId === requestId && latest?.sceneKey === sceneKey;
        });
        if (!chunkStillCurrent) return;
        postChunk();
      };
      if (chunkIndex === 0) postChunkIfCurrent();
      else window.setTimeout(postChunkIfCurrent, chunkIndex * 10);
    });
    return true;
  }

  function enemyLosCacheKey(interactive = false) {
    const boardPpi = boardPixelsPerInch();
    const markerKey = state.current.losMarkers
      .filter((marker) => marker.visible !== false)
      .map((marker) => [
        marker.id,
        Math.round(marker.x * 10) / 10,
        Math.round(marker.y * 10) / 10,
        marker.baseShape || "circle",
        marker.baseLengthMm || 40,
        marker.baseWidthMm || marker.baseLengthMm || 40,
        Math.round((marker.baseRotation || 0) * 1000) / 1000,
      ].join(","))
      .join("|");
    const enemyKey = state.current.enemies
      .map((enemy) => `${Math.round(enemy.x * 10) / 10},${Math.round(enemy.y * 10) / 10}`)
      .join("|");
    return [
      currentVisibilitySceneKey(),
      interactive ? "interactive" : "settled",
      Math.round((boardPpi || 0) * 100) / 100,
      markerKey,
      enemyKey,
    ].join("::");
  }

  function requestEnemyLosStates(interactive = false, cacheKey = enemyLosCacheKey(interactive)) {
    const worker = enemyLosWorkerRef.current || losWorkerRef.current;
    const visibleMarkers = state.current.losMarkers.filter((marker) => marker.visible !== false);
    if (!worker || interactive || !visibleMarkers.length || !state.current.enemies.length) return false;
    const previewStates = calculateEnemyLosPreviewStates();
    // Preview polygons are deliberately cheaper and can miss narrow valid paths.
    // The worker remains authoritative, so every enemy must receive an exact check.
    const candidateEnemyIndexes = state.current.enemies.map((_, index) => index);
    state.current.enemyLosStates = previewStates;
    state.current.enemyLosRays = [];
    state.current.enemyLosPendingIndexes = new Set(
      candidateEnemyIndexes.filter((index) => previewStates[index] !== "oneWall"),
    );
    const requestId = ++losWorkerRequestIdRef.current;
    const sceneKey = currentVisibilitySceneKey();
    worker.postMessage({ type: "cancelEnemyLos" });
    ensureLosWorkerScene(
      worker,
      sceneKey,
      enemyLosWorkerRef.current ? enemyLosWorkerSceneKeyRef : losWorkerSceneKeyRef,
    );
    latestEnemyLosWorkerRequestRef.current = { requestId, sceneKey, cacheKey };
    worker.postMessage({
      type: "enemyLos",
      requestId,
      sceneKey,
      cacheKey,
      markers: visibleMarkers.map((marker) => ({ ...marker })),
      enemies: state.current.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y })),
      previewStates,
      candidateEnemyIndexes,
      W: state.current.W,
      H: state.current.H,
      pixelsPerInch: boardPixelsPerInch() || pixelsPerInch,
      interactive,
      progressive: true,
    });
    return true;
  }

  function handleLosWorkerMessage(message) {
    if (!message || message.type === "markerVisibilityError" || message.type === "markerVisibilityBatchError" || message.type === "enemyLosError" || message.type === "sceneError") {
      if (message?.message) console.warn("LOS worker failed", message.message);
      if (message?.type === "markerVisibilityError" || message?.type === "markerVisibilityBatchError") {
        interactivePreviewInFlightRef.current = false;
        startNextInteractivePreview();
      }
      return;
    }
    if (message.type === "sceneReady") return;
    if (message.type === "enemyLosResult") {
      const latest = latestEnemyLosWorkerRequestRef.current;
      if (!latest || latest.requestId !== message.requestId || latest.sceneKey !== message.sceneKey) return;
      if (currentVisibilitySceneKey() !== message.sceneKey) return;
      if (latest.cacheKey !== message.cacheKey) return;
      const states = Array.isArray(message.states) ? message.states : [];
      state.current.enemyLosStates = states;
      if (!message.partial) {
        state.current.enemyLosPendingIndexes = new Set();
        enemyLosCacheRef.current = { key: message.cacheKey, states };
        latestEnemyLosWorkerRequestRef.current = null;
      }
      draw();
      return;
    }
    if (message.type === "markerVisibilityBatchResult") {
      if (currentVisibilitySceneKey() !== message.sceneKey) return;
      let changed = false;
      let resultRequest = null;
      (message.results || []).forEach((result) => {
        if (!result?.markerId) return;
        const latest = latestLosWorkerRequestsRef.current.get(result.markerId);
        if (!latest || latest.requestId !== message.requestId || latest.sceneKey !== message.sceneKey) return;
        if (!resultRequest) resultRequest = latest;
        const marker = state.current.losMarkers.find((item) => item.id === result.markerId);
        if (!marker || marker.visible === false) return;
        if (latest.interactive && latest.dragRevision < losDragRevisionRef.current - 2) return;
        if (latest.interactive && latest.dragRevision < lastAcceptedDragRevisionRef.current) return;
        if (!latest.interactive && (Math.abs(marker.x - latest.x) > 0.01 || Math.abs(marker.y - latest.y) > 0.01)) return;
        const visibility = latest.preview
          ? collapseInteractivePreviewVisibility(result.visibility)
          : (result.visibility || { clearZones: [], oneWallZones: [] });
        cacheMarkerVisibility(
          result.markerId,
          visibility,
          Boolean(latest.interactive),
        );
        if (!message.partial) latestLosWorkerRequestsRef.current.delete(result.markerId);
        changed = true;
      });
      if (!changed) {
        finishInteractivePreview(resultRequest, message.partial);
        return;
      }
      if (resultRequest?.interactive) {
        lastAcceptedDragRevisionRef.current = Math.max(
          lastAcceptedDragRevisionRef.current,
          resultRequest.dragRevision || 0,
        );
        rebuildCombinedVisibility(true, resultRequest.activeMarkerIds || []);
        if (!message.partial) updateEnemyLosPreviewStates();
      } else {
        rebuildCombinedVisibility(false);
        updateEnemyLosStates(false, { deferred: true });
      }
      draw();
      finishInteractivePreview(resultRequest, message.partial);
      return;
    }
    if (message.type !== "markerVisibilityResult" || !message.markerId) return;
    const latest = latestLosWorkerRequestsRef.current.get(message.markerId);
    if (!latest || latest.requestId !== message.requestId || latest.sceneKey !== message.sceneKey) return;
    if (currentVisibilitySceneKey() !== message.sceneKey) return;
    const marker = state.current.losMarkers.find((item) => item.id === message.markerId);
    if (!marker || marker.visible === false) return;
    if (latest.interactive && (
      latest.dragRevision < losDragRevisionRef.current - 2
      || latest.dragRevision < lastAcceptedDragRevisionRef.current
    )) {
      finishInteractivePreview(latest, message.partial);
      return;
    }
    if (!latest.interactive && (Math.abs(marker.x - latest.x) > 0.01 || Math.abs(marker.y - latest.y) > 0.01)) return;
    const visibility = latest.preview
      ? collapseInteractivePreviewVisibility(message.visibility)
      : (message.visibility || { clearZones: [], oneWallZones: [] });
    cacheMarkerVisibility(
      message.markerId,
      visibility,
      Boolean(latest.interactive),
    );
    if (latest.interactive) {
      lastAcceptedDragRevisionRef.current = Math.max(
        lastAcceptedDragRevisionRef.current,
        latest.dragRevision || 0,
      );
      rebuildCombinedVisibility(true, latest.activeMarkerIds || [message.markerId]);
      if (!message.partial) updateEnemyLosPreviewStates();
    } else {
      rebuildCombinedVisibility(false);
      updateEnemyLosStates(false, { deferred: true });
    }
    if (!message.partial) latestLosWorkerRequestsRef.current.delete(message.markerId);
    draw();
    finishInteractivePreview(latest, message.partial);
  }

  useEffect(() => {
    const marker = getActiveLosMarker();
    if (!marker) return;
    setLosName(marker.name || "LOS");
    setBaseShape(marker.baseShape || "circle");
    setBaseLengthMm(marker.baseLengthMm || 40);
    setBaseWidthMm(marker.baseWidthMm || marker.baseLengthMm || 40);
    setBaseRotation(marker.baseRotation || 0);
    setRangeInches(marker.rangeInches ?? "unlimited");
    setMarkerGroupingMode(marker.groupingMode || "model");
    setUnitModelCount(getMarkerTypeMembers(marker).length || 1);
    setSelectedUnitSlot(marker.unitSlot || 1);
    state.current.light = { x: marker.x, y: marker.y };
    draw();
  }, [activeLosId, losVersion]);

  useEffect(() => {
    updateVisibility();
    draw();
    scheduleBrowserSave();
  }, [imageReady, pixelsPerInch]);

  useEffect(() => {
    draw();
    scheduleBrowserSave();
  }, [mode, activeLosId, activeUnitSlot, losVersion, scaleInches, rangeInches, homeDeploymentRangeInches, enemyDeploymentRangeInches, deepstrikeRangeInches, deepstrikeVisible, layoutEditMode, selectiveFootprintRemoveMode, selectedLayoutTerrainId, selectedLayoutWallId, selectedLayoutFeatureId, selectedLayoutObjectiveId, showLightTerrainFeatures, showDenseTerrainFeatures, showObjectives, movementPlanningEnabled, activeMovementPhase]);

  useEffect(() => {
    if (!layoutSaveReadyRef.current) {
      layoutSaveReadyRef.current = true;
      return;
    }
    scheduleBrowserSave();
  }, [defenderForceDisposition, attackerForceDisposition, selectedLayoutVariant, missionCardsVisible, opponentMissionCardsVisible, showLightTerrainFeatures, showDenseTerrainFeatures, showObjectives]);

  function resize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const previousFit = state.current.fit ? { ...state.current.fit } : null;
    const previousW = state.current.W;
    const previousH = state.current.H;
    state.current.W = Math.max(320, rect.width);
    state.current.H = Math.max(420, rect.height);
    const sizeChanged = Math.abs(previousW - state.current.W) > 0.5 || Math.abs(previousH - state.current.H) > 0.5;
    const anchoredObjects = sizeChanged ? captureBoardAnchoredObjects(previousFit) : null;
    canvas.width = state.current.W * dpr;
    canvas.height = state.current.H * dpr;
    canvas.style.width = `${state.current.W}px`;
    canvas.style.height = `${state.current.H}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    calculateFit();
    if (sizeChanged) invalidateLosRenderLayers();
    if (state.current.activeLayoutKey) {
      refreshActiveLayoutGeometry();
      setPixelsPerInch(state.current.fit.w / boardWidthInches());
    }
    if (anchoredObjects) restoreBoardAnchoredObjects(anchoredObjects);
    updateVisibility();
    draw();
  }

  function fitIsUsable(fit) {
    return fit && Number.isFinite(fit.x) && Number.isFinite(fit.y) && fit.w > 0 && fit.h > 0;
  }

  function worldPointToBoardWithFit(point, fit) {
    if (!point || !fitIsUsable(fit)) return null;
    return {
      x: (point.x - fit.x) / fit.w * boardWidthInches(),
      y: (point.y - fit.y) / fit.h * boardHeightInches(),
    };
  }

  function boardPointToWorldWithFit(point, fit = state.current.fit) {
    if (!point || !fitIsUsable(fit)) return null;
    return {
      x: fit.x + (point.x / boardWidthInches()) * fit.w,
      y: fit.y + (point.y / boardHeightInches()) * fit.h,
    };
  }

  function capturePointMap(items, fit) {
    return new Map((items || []).map((item, index) => [
      item.id || `index-${index}`,
      worldPointToBoardWithFit(item, fit),
    ]).filter(([, point]) => point));
  }

  function restorePointMap(items, pointMap) {
    (items || []).forEach((item, index) => {
      const boardPoint = pointMap.get(item.id || `index-${index}`);
      const worldPoint = boardPointToWorldWithFit(boardPoint);
      if (worldPoint) {
        item.x = worldPoint.x;
        item.y = worldPoint.y;
      }
    });
  }

  function captureBoardAnchoredObjects(fit) {
    if (!fitIsUsable(fit)) return null;
    const movementPhases = {};
    Object.entries(state.current.movementPhases || {}).forEach(([phase, snapshot]) => {
      movementPhases[phase] = {
        losMarkers: capturePointMap(snapshot?.losMarkers || [], fit),
        enemies: capturePointMap(snapshot?.enemies || [], fit),
      };
    });
    return {
      losMarkers: capturePointMap(state.current.losMarkers, fit),
      enemies: capturePointMap(state.current.enemies, fit),
      light: worldPointToBoardWithFit(state.current.light, fit),
      rulers: (state.current.rulers || []).map((ruler) => ({
        id: ruler.id,
        a: worldPointToBoardWithFit(ruler.a, fit),
        b: worldPointToBoardWithFit(ruler.b, fit),
      })),
      rulerStart: worldPointToBoardWithFit(state.current.rulerStart, fit),
      rulerPreview: state.current.rulerPreview ? {
        a: worldPointToBoardWithFit(state.current.rulerPreview.a, fit),
        b: worldPointToBoardWithFit(state.current.rulerPreview.b, fit),
      } : null,
      movementPhases,
    };
  }

  function restoreBoardAnchoredObjects(snapshot) {
    if (!snapshot) return;
    restorePointMap(state.current.losMarkers, snapshot.losMarkers);
    restorePointMap(state.current.enemies, snapshot.enemies);
    const active = getActiveLosMarker();
    if (active) {
      state.current.light = { x: active.x, y: active.y };
    } else {
      const light = boardPointToWorldWithFit(snapshot.light);
      if (light) state.current.light = light;
    }
    (state.current.rulers || []).forEach((ruler, index) => {
      const saved = snapshot.rulers[index];
      const a = boardPointToWorldWithFit(saved?.a);
      const b = boardPointToWorldWithFit(saved?.b);
      if (a && b) {
        ruler.a = a;
        ruler.b = b;
      }
    });
    const rulerStart = boardPointToWorldWithFit(snapshot.rulerStart);
    if (rulerStart) state.current.rulerStart = rulerStart;
    if (state.current.rulerPreview && snapshot.rulerPreview) {
      const a = boardPointToWorldWithFit(snapshot.rulerPreview.a);
      const b = boardPointToWorldWithFit(snapshot.rulerPreview.b);
      if (a && b) state.current.rulerPreview = { a, b };
    }
    Object.entries(snapshot.movementPhases || {}).forEach(([phase, saved]) => {
      const target = state.current.movementPhases?.[phase];
      if (!target) return;
      restorePointMap(target.losMarkers || [], saved.losMarkers);
      restorePointMap(target.enemies || [], saved.enemies);
    });
  }

  function clearLosBufferSet(buffers) {
    if (!buffers) return;
    Object.keys(buffers).forEach((key) => {
      buffers[key] = null;
    });
  }

  function invalidateBattlefieldRenderCaches() {
    state.current.battlefieldBaseRender = null;
    state.current.battlefieldBaseRenderKey = "";
    state.current.battlefieldForegroundRender = null;
    state.current.battlefieldForegroundRenderKey = "";
    state.current.battlefieldBaseVersion += 1;
    state.current.battlefieldForegroundVersion += 1;
  }

  function markVisibilityGeometryChanged({ base = true, foreground = true, clearVisibility = true } = {}) {
    cancelInteractivePreview();
    state.current.visibilitySceneVersion += 1;
    state.current.workerSceneVersion += 1;
    losWorkerSceneKeyRef.current = "";
    losPreviewWorkerSceneKeyRef.current = "";
    enemyLosWorkerSceneKeyRef.current = "";
    if (base) state.current.battlefieldBaseVersion += 1;
    if (foreground) state.current.battlefieldForegroundVersion += 1;
    state.current.combinedLosRender = { clear: null, oneWall: null };
    state.current.movingLosRender = { clear: null, oneWall: null };
    state.current.stationaryLosRender = { clear: null, oneWall: null };
    state.current.compositedLosRender = { clear: null, oneWall: null };
    state.current.compositedLosBuffers.revision = -1;
    state.current.losRenderRevision += 1;
    state.current.stationaryLosRenderKey = "";
    enemyLosCacheRef.current = { key: "", states: [] };
    markerEnemyLosCacheRef.current.clear();
    latestEnemyLosWorkerRequestRef.current = null;
    if (clearVisibility) {
      state.current.losVisibilityCache.clear();
      latestLosWorkerRequestsRef.current.clear();
    }
  }

  function invalidateLosRenderLayers({ clearVisibility = false } = {}) {
    state.current.combinedLosRender = { clear: null, oneWall: null };
    state.current.movingLosRender = { clear: null, oneWall: null };
    state.current.stationaryLosRender = { clear: null, oneWall: null };
    state.current.compositedLosRender = { clear: null, oneWall: null };
    state.current.compositedLosBuffers.revision = -1;
    state.current.losRenderRevision += 1;
    state.current.stationaryLosRenderKey = "";
    state.current.visibilitySceneVersion += 1;
    clearLosBufferSet(state.current.combinedLosBuffers);
    clearLosBufferSet(state.current.movingLosBuffers);
    clearLosBufferSet(state.current.stationaryLosBuffers);
    clearLosBufferSet(state.current.compositedLosBuffers);
    enemyLosCacheRef.current = { key: "", states: [] };
    markerEnemyLosCacheRef.current.clear();
    latestEnemyLosWorkerRequestRef.current = null;
    if (clearVisibility) {
      state.current.losVisibilityCache.clear();
      latestLosWorkerRequestsRef.current.clear();
    }
  }

  function calculateFit() {
    const { W, H } = state.current;
    const boardWidth = boardWidthInches();
    const boardHeight = boardHeightInches();
    const padding = 18;
    const s = Math.min(
      Math.max(1, W - padding * 2) / boardWidth,
      Math.max(1, H - padding * 2) / boardHeight,
    );
    state.current.fit = {
      x: (W - boardWidth * s) / 2,
      y: (H - boardHeight * s) / 2,
      w: boardWidth * s,
      h: boardHeight * s,
    };
  }

  function boardWidthInches() {
    return Number(state.current.boardWidthInches) || BATTLEFIELD_WIDTH_INCHES;
  }

  function boardHeightInches() {
    return Number(state.current.boardHeightInches) || BATTLEFIELD_HEIGHT_INCHES;
  }

  function uploadImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        state.current.savedImageSrc = img.src;
        state.current.blockers = [];
        state.current.walls = [];
        state.current.enemies = [];
        state.current.layoutObjectives = [];
        state.current.layoutTerrain = [];
        state.current.layoutTerrainLinks = [];
        state.current.layoutTerrainGroups = [];
        state.current.layoutWalls = [];
        state.current.layoutWallLinks = [];
        state.current.layoutTerrainFeatures = [];
        state.current.layoutFeaturePieces = [];
        state.current.layoutFeatureLinks = [];
        state.current.activeLayoutKey = null;
        state.current.currentPoly = [];
        state.current.wallPath = [];
        state.current.wallPreview = null;
        state.current.camera = { scale: 1, x: 0, y: 0 };
        state.current.losMarkers = [];
        state.current.light = { x: state.current.W / 2, y: state.current.H / 2 };
        setActiveLosId("");
        setRangeInches("unlimited");
        setLosVersion((v) => v + 1);
        state.current.scaleStart = null;
        state.current.scalePreview = null;
        state.current.rulerStart = null;
        state.current.rulerPreview = null;
        state.current.rulers = [];
        state.current.stickyRulerStart = null;
        state.current.stickyRulers = [];
        state.current.deploymentLine = null;
        state.current.deploymentPath = [];
        state.current.deploymentDraft = [];
        state.current.deploymentPreview = null;
        state.current.deploymentVisible = true;
        state.current.deploymentNoMansSide = null;
        state.current.deploymentLabelPosition = null;
        state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
        state.current.enemyDeploymentLine = null;
        state.current.enemyDeploymentPath = [];
        state.current.enemyDeploymentDraft = [];
        state.current.enemyDeploymentPreview = null;
        state.current.enemyDeploymentVisible = true;
        state.current.enemyDeploymentNoMansSide = null;
        state.current.enemyDeploymentLabelPosition = null;
        state.current.enemyDeploymentVisibility = { clearZones: [], oneWallZones: [] };
        setHomeDeploymentRangeInches("unlimited");
        setEnemyDeploymentRangeInches("unlimited");
        setDeepstrikeRangeInches(8);
        setDeepstrikeVisible(false);
        calculateFit();
        state.current.light = { x: state.current.W / 2, y: state.current.H / 2 };
        updateVisibility();
        setImageReady(true);
        setStatus("Map loaded. Draw footprints, walls, then add enemies.");
        draw();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function buildSaveData(options = {}) {
    if (movementPlanningEnabled) saveActiveMovementPhaseSnapshot();
    const losMarkersForSave = options.disableLosMarkerVisibility
      ? state.current.losMarkers.map((marker) => ({ ...marker, visible: false }))
      : state.current.losMarkers;
    return {
      version: 11,
      type: "game",
      exactLayoutState: true,
      battlefieldOrientation: "portrait-44x60",
      layoutGeometryVersion: "wartoken-json-v1",
      boardWidthInches: boardWidthInches(),
      boardHeightInches: boardHeightInches(),
      savedAt: new Date().toISOString(),
      mapStorageKey: null,
      light: getActiveLosPoint(),
      losMarkers: losMarkersForSave,
      activeLosId,
      camera: state.current.camera,
      blockers: state.current.blockers,
      blockerIds: state.current.blockerIds,
      walls: state.current.walls.filter((wall) => !wall.generatedLayoutWall),
      enemies: state.current.enemies,
      layoutObjectives: state.current.layoutObjectives,
      layoutTerrain: state.current.layoutTerrain,
      layoutTerrainLinks: state.current.layoutTerrainLinks,
      layoutTerrainGroups: state.current.layoutTerrainGroups,
      layoutWalls: state.current.layoutWalls,
      layoutWallLinks: state.current.layoutWallLinks,
      layoutTerrainFeatures: state.current.layoutTerrainFeatures,
      layoutFeaturePieces: state.current.layoutFeaturePieces,
      layoutFeatureLinks: state.current.layoutFeatureLinks,
      showLightTerrainFeatures,
      showDenseTerrainFeatures,
      showObjectives,
      activeLayoutKey: state.current.activeLayoutKey,
      deploymentLine: state.current.deploymentLine,
      deploymentPath: state.current.deploymentPath,
      deploymentVisible: state.current.deploymentVisible,
      deploymentNoMansSide: state.current.deploymentNoMansSide,
      deploymentLabelPosition: state.current.deploymentLabelPosition,
      enemyDeploymentLine: state.current.enemyDeploymentLine,
      enemyDeploymentPath: state.current.enemyDeploymentPath,
      enemyDeploymentVisible: state.current.enemyDeploymentVisible,
      enemyDeploymentNoMansSide: state.current.enemyDeploymentNoMansSide,
      enemyDeploymentLabelPosition: state.current.enemyDeploymentLabelPosition,
      homeDeploymentRangeInches,
      enemyDeploymentRangeInches,
      deepstrikeRangeInches,
      deepstrikeVisible,
      rulers: state.current.rulers,
      stickyRulers: state.current.stickyRulers,
      baseShape,
      baseLengthMm,
      baseWidthMm,
      baseRotation,
      scaleInches,
      rangeInches,
      pixelsPerInch,
      defenderForceDisposition,
      attackerForceDisposition,
      selectedLayoutVariant,
      missionCardsVisible,
      opponentMissionCardsVisible,
      movementPlanningEnabled,
      activeMovementPhase,
      movementPhases: state.current.movementPhases || {},
      armyListText,
      armyResults,
      armyPresetName,
      selectedArmyPreset,
    };
  }

  async function applySaveData(data, message = "Browser save restored.") {
    if (!data) return;
    state.current.boardWidthInches = Number(data.boardWidthInches) || BATTLEFIELD_WIDTH_INCHES;
    state.current.boardHeightInches = Number(data.boardHeightInches) || BATTLEFIELD_HEIGHT_INCHES;
    setCustomGridLength(state.current.boardWidthInches);
    setCustomGridWidth(state.current.boardHeightInches);
    setActiveUnitSlot(null);
    setLayoutLinkMode(false);
    setFirstLinkedTerrainId(null);
    setFirstLinkedWallId(null);
    setFirstLinkedFeatureId(null);
    setDefenderForceDisposition(FORCE_DISPOSITIONS.includes(data.defenderForceDisposition) ? data.defenderForceDisposition : "Take and Hold");
    setAttackerForceDisposition(FORCE_DISPOSITIONS.includes(data.attackerForceDisposition) ? data.attackerForceDisposition : "Take and Hold");
    setSelectedLayoutVariant(["A", "B", "C"].includes(data.selectedLayoutVariant) ? data.selectedLayoutVariant : "A");
    setMissionCardsVisible(data.missionCardsVisible === true);
    setOpponentMissionCardsVisible(data.opponentMissionCardsVisible === true);
    setMovementPlanningEnabled(data.movementPlanningEnabled === true);
    setActiveMovementPhase(MOVEMENT_PHASES.includes(data.activeMovementPhase) ? data.activeMovementPhase : "deployment");
    state.current.movementPhases = data.movementPhases && typeof data.movementPhases === "object" ? data.movementPhases : {};
    if (typeof data.armyListText === "string") setArmyListText(data.armyListText);
    if (Array.isArray(data.armyResults)) setArmyResults(data.armyResults);
    if (typeof data.armyPresetName === "string") setArmyPresetName(data.armyPresetName);
    if (typeof data.selectedArmyPreset === "string") setSelectedArmyPreset(data.selectedArmyPreset);
    setShowLightTerrainFeatures(data.showLightTerrainFeatures !== false);
    setShowDenseTerrainFeatures(data.showDenseTerrainFeatures !== false);
    setShowObjectives(data.showObjectives !== false);

    if (Array.isArray(data.losMarkers)) {
      state.current.losMarkers = data.losMarkers.map((marker, index) => normalizeLosMarker(marker, index, data.rangeInches));
      const nextActive = data.activeLosId && state.current.losMarkers.some((m) => m.id === data.activeLosId)
        ? data.activeLosId
        : state.current.losMarkers[0]?.id || "";
      setActiveLosId(nextActive);
      const active = state.current.losMarkers.find((m) => m.id === nextActive);
      if (active) {
        state.current.light = { x: active.x, y: active.y };
        setLosName(active.name);
        setBaseShape(active.baseShape);
        setBaseLengthMm(active.baseLengthMm);
        setBaseWidthMm(active.baseWidthMm);
        setBaseRotation(active.baseRotation);
        setRangeInches(active.rangeInches ?? data.rangeInches ?? "unlimited");
      } else {
        state.current.light = data.light || { x: state.current.W / 2, y: state.current.H / 2 };
        setRangeInches("unlimited");
      }
      setLosVersion((v) => v + 1);
    } else if (data.light) {
      const legacy = createLosMarker("los-1", "LOS", data.light.x, data.light.y);
      legacy.baseShape = data.baseShape || "circle";
      legacy.baseLengthMm = data.baseLengthMm || 40;
      legacy.baseWidthMm = data.baseWidthMm || legacy.baseLengthMm;
      legacy.baseRotation = data.baseRotation || 0;
      legacy.rangeInches = data.rangeInches ?? "unlimited";
      state.current.losMarkers = [legacy];
      state.current.light = { x: legacy.x, y: legacy.y };
      setActiveLosId(legacy.id);
      setLosName(legacy.name);
      setLosVersion((v) => v + 1);
    }
    if (data.camera) state.current.camera = data.camera;
    if (Array.isArray(data.blockers)) {
      state.current.blockers = data.blockers;
      state.current.blockerIds = data.blockers.map((_, index) => data.blockerIds?.[index] || `footprint-${Date.now()}-${index}`);
    }
    if (Array.isArray(data.walls)) state.current.walls = data.walls;
    if (Array.isArray(data.enemies)) {
      state.current.enemies = data.enemies.map((enemy, index) => ({
        ...enemy,
        id: enemy.id || `enemy-${Date.now()}-${index}`,
      }));
    }
    state.current.layoutObjectives = Array.isArray(data.layoutObjectives)
      ? data.layoutObjectives.map((objective, index) => {
        const boardPoint = Number.isFinite(objective.boardX) && Number.isFinite(objective.boardY)
          ? { x: objective.boardX, y: objective.boardY }
          : Number.isFinite(objective.x) && Number.isFinite(objective.y)
            ? worldToBattlefieldPoint(objective)
            : null;
        const worldPoint = boardPoint ? battlefieldPoint(boardPoint.x, boardPoint.y) : { x: objective.x || 0, y: objective.y || 0 };
        return {
          ...objective,
          id: objective.id || `layout-objective-${index}`,
          ...worldPoint,
          boardX: boardPoint?.x ?? objective.boardX ?? 0,
          boardY: boardPoint?.y ?? objective.boardY ?? 0,
          visible: objective.visible !== false,
        };
      })
      : [];
    state.current.layoutWalls = Array.isArray(data.layoutWalls)
      ? data.layoutWalls.map((wall) => ({ ...wall, mirrored: wall.mirrored === true }))
      : [];
    state.current.layoutWallLinks = Array.isArray(data.layoutWallLinks)
      ? data.layoutWallLinks.filter((link) => Array.isArray(link) && link.length === 2)
      : [];
    state.current.layoutTerrainLinks = Array.isArray(data.layoutTerrainLinks)
      ? data.layoutTerrainLinks.filter((link) => Array.isArray(link) && link.length === 2)
      : [];
    state.current.layoutTerrainGroups = Array.isArray(data.layoutTerrainGroups)
      ? data.layoutTerrainGroups.filter((group) => Array.isArray(group) && group.length >= 2)
      : [];
    // Legacy freehand TFs were replaced by reusable feature pieces. Discard them
    // on load so old, non-interactive overlays cannot remain stuck on layouts.
    state.current.layoutTerrainFeatures = [];
    state.current.layoutFeaturePieces = Array.isArray(data.layoutFeaturePieces)
      ? data.layoutFeaturePieces.map((feature) => ({ ...feature, mirrored: feature.mirrored === true }))
      : [];
    state.current.layoutFeatureLinks = Array.isArray(data.layoutFeatureLinks)
      ? data.layoutFeatureLinks.filter((link) => Array.isArray(link) && link.length === 2)
      : [];
    const usesPortraitBattlefield = data.battlefieldOrientation === "portrait-44x60";
    const restoredLayoutKey = typeof data.activeLayoutKey === "string"
      ? data.activeLayoutKey
      : Array.isArray(data.layoutTerrain) && data.layoutTerrain.length
        ? `${data.defenderForceDisposition || "Take and Hold"}|${data.attackerForceDisposition || "Take and Hold"}|${data.selectedLayoutVariant || "A"}`
        : null;
    const restoredPreset = layoutPresetForKey(restoredLayoutKey);
    if (!state.current.layoutWalls.length && restoredPreset) {
      state.current.layoutWalls = (restoredPreset.wallPieces || DEFAULT_LAYOUT_WALL_SET).map((wall, index) => ({
        id: `layout-wall-${wall.type}-${index}`,
        type: wall.type,
        x: wall.x,
        y: wall.y,
        rotation: wall.rotation || 0,
        mirrored: wall.mirrored === true,
      }));
    }
    const shouldUpgradeLayoutGeometry = restoredPreset && data.layoutGeometryVersion !== "wartoken-json-v1";
    state.current.layoutTerrain = shouldUpgradeLayoutGeometry
      ? restoredPreset.terrain.map((terrain, index) => {
        const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
        const center = restoredPreset.portraitCoordinates ? { x: terrain.x, y: terrain.y } : rotateLayoutPoint(terrain.x, terrain.y);
        return {
          id: `layout-footprint-${index}`,
          shape: terrain.shape,
          x: center.x,
          y: center.y,
          rotation: restoredPreset.portraitCoordinates ? terrain.rotation : (terrain.rotation - 90 + 360) % 360,
          width: definition.width,
          height: definition.height,
        };
      })
      : Array.isArray(data.layoutTerrain)
      ? data.layoutTerrain.map((terrain) => {
        return {
          ...terrain,
          x: usesPortraitBattlefield ? terrain.x : terrain.x * 44 / 60,
          y: usesPortraitBattlefield ? terrain.y : terrain.y * 60 / 44,
          outer: Array.isArray(terrain.outer) ? terrain.outer.map((point) => [...point]) : undefined,
        };
      })
      : [];
    state.current.activeLayoutKey = restoredLayoutKey;
    state.current.deploymentLine = data.deploymentLine || null;
    state.current.deploymentPath = Array.isArray(data.deploymentPath) ? data.deploymentPath : (data.deploymentLine ? [data.deploymentLine.a, data.deploymentLine.b] : []);
    state.current.deploymentVisible = data.deploymentVisible !== false;
    state.current.deploymentNoMansSide = data.deploymentNoMansSide === -1 ? -1 : data.deploymentNoMansSide === 1 ? 1 : null;
    state.current.deploymentLabelPosition = validBoardPoint(data.deploymentLabelPosition) ? { ...data.deploymentLabelPosition } : null;
    state.current.deploymentDraft = [];
    state.current.deploymentPreview = null;
    state.current.enemyDeploymentLine = data.enemyDeploymentLine || null;
    state.current.enemyDeploymentPath = Array.isArray(data.enemyDeploymentPath)
      ? data.enemyDeploymentPath
      : (data.enemyDeploymentLine ? [data.enemyDeploymentLine.a, data.enemyDeploymentLine.b] : []);
    state.current.enemyDeploymentVisible = data.enemyDeploymentVisible !== false;
    state.current.enemyDeploymentNoMansSide = data.enemyDeploymentNoMansSide === -1 ? -1 : data.enemyDeploymentNoMansSide === 1 ? 1 : null;
    state.current.enemyDeploymentLabelPosition = validBoardPoint(data.enemyDeploymentLabelPosition) ? { ...data.enemyDeploymentLabelPosition } : null;
    state.current.enemyDeploymentDraft = [];
    state.current.enemyDeploymentPreview = null;
    state.current.rulerStart = null;
    state.current.rulerPreview = null;
    state.current.rulers = Array.isArray(data.rulers) ? data.rulers : [];
    state.current.stickyRulerStart = null;
    state.current.stickyRulers = Array.isArray(data.stickyRulers) ? data.stickyRulers : [];
    setHomeDeploymentRangeInches(data.homeDeploymentRangeInches ?? "unlimited");
    setEnemyDeploymentRangeInches(data.enemyDeploymentRangeInches ?? "unlimited");
    setDeepstrikeRangeInches(data.deepstrikeRangeInches ?? 8);
    setDeepstrikeVisible(data.deepstrikeVisible === true);

    if (data.baseShape) setBaseShape(data.baseShape);
    if (data.baseLengthMm) setBaseLengthMm(data.baseLengthMm);
    if (data.baseWidthMm) setBaseWidthMm(data.baseWidthMm);
    if (typeof data.baseRotation === "number") setBaseRotation(data.baseRotation);
    if (data.scaleInches) setScaleInches(data.scaleInches);
    if (data.pixelsPerInch && !state.current.activeLayoutKey) setPixelsPerInch(data.pixelsPerInch);

    let savedImageSrc = data.savedImageSrc || null;
    if (!savedImageSrc && data.mapStorageKey) {
      try {
        savedImageSrc = await readStoredMap(data.mapStorageKey);
        if (savedImageSrc) storedMapSourcesRef.current.set(data.mapStorageKey, savedImageSrc);
      } catch (err) {
        console.warn("Could not load stored map", err);
      }
    }

    const shouldRefreshPresetLayout = data.exactLayoutState !== true;
    if (savedImageSrc) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        state.current.savedImageSrc = savedImageSrc;
        calculateFit();
        if (state.current.activeLayoutKey && shouldRefreshPresetLayout) {
          refreshActiveLayoutGeometry();
          setPixelsPerInch(state.current.fit.w / boardWidthInches());
          state.current.deploymentVisible = false;
          state.current.enemyDeploymentVisible = false;
          state.current.deploymentNoMansSide = null;
          state.current.enemyDeploymentNoMansSide = null;
        } else {
          rebuildLayoutTerrainGeometry();
          rebuildLayoutWallGeometry();
        }
        updateVisibility();
        setImageReady(true);
        setStatus(message);
        draw();
      };
      img.onerror = () => {
        setStatus(`${message} The saved map image could not be opened.`);
      };
      img.src = savedImageSrc;
    } else {
      imgRef.current = null;
      state.current.savedImageSrc = null;
      setImageReady(false);
      calculateFit();
      if (state.current.activeLayoutKey && shouldRefreshPresetLayout) {
        refreshActiveLayoutGeometry();
        setPixelsPerInch(state.current.fit.w / boardWidthInches());
        state.current.deploymentVisible = false;
        state.current.enemyDeploymentVisible = false;
        state.current.deploymentNoMansSide = null;
        state.current.enemyDeploymentNoMansSide = null;
      } else {
        rebuildLayoutTerrainGeometry();
        rebuildLayoutWallGeometry();
      }
      updateVisibility();
      setStatus(message);
      draw();
    }
  }

  function scheduleBrowserSave() {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveBrowserState, 250);
  }

  async function persistGame(storageKey, mapStorageKey, options = {}) {
    const data = buildSaveData(options);
    const imageSrc = state.current.savedImageSrc || null;
    data.mapStorageKey = imageSrc ? mapStorageKey : null;
    if (storedMapSourcesRef.current.get(mapStorageKey) !== imageSrc) {
      await writeStoredMap(mapStorageKey, imageSrc);
      storedMapSourcesRef.current.set(mapStorageKey, imageSrc);
    }
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  async function saveBrowserState() {
    try {
      await persistGame("warhammer-los-save", "autosave");
    } catch (err) {
      console.warn("Autosave failed", err);
    }
  }

  async function loadBrowserSave() {
    try {
      const raw = localStorage.getItem("warhammer-los-save");
      if (!raw) return;
      await applySaveData(JSON.parse(raw), "Browser autosave restored.");
    } catch (err) {
      console.warn("Load save failed", err);
    }
  }

  async function clearBrowserSave() {
    localStorage.removeItem("warhammer-los-save");
    try {
      await deleteStoredMap("autosave");
      storedMapSourcesRef.current.delete("autosave");
    } catch (err) {
      console.warn("Could not clear autosaved map", err);
    }
    setStatus("Browser autosave cleared. Named save slots are unchanged.");
  }

  function readSaveSlotRecords() {
    try {
      const raw = JSON.parse(localStorage.getItem("warhammer-los-slots-index") || "[]");
      return raw
        .map((entry) => (typeof entry === "string" ? { name: entry, lastAccessed: 0 } : entry))
        .filter((entry) => entry?.name)
        .sort((a, b) => (Number(b.lastAccessed) || 0) - (Number(a.lastAccessed) || 0));
    } catch (err) {
      console.warn("Could not load save slot list", err);
      return [];
    }
  }

  function writeSaveSlotRecords(records) {
    const deduped = [];
    records.forEach((record) => {
      if (!record?.name || deduped.some((item) => item.name === record.name)) return;
      deduped.push({ name: record.name, lastAccessed: Number(record.lastAccessed) || 0 });
    });
    deduped.sort((a, b) => (Number(b.lastAccessed) || 0) - (Number(a.lastAccessed) || 0));
    localStorage.setItem("warhammer-los-slots-index", JSON.stringify(deduped));
    setSaveSlots(deduped.map((record) => record.name));
    return deduped;
  }

  function touchSaveSlot(name) {
    if (!name) return;
    const records = readSaveSlotRecords().filter((record) => record.name !== name);
    writeSaveSlotRecords([{ name, lastAccessed: Date.now() }, ...records]);
  }

  function refreshSaveSlots() {
    const records = readSaveSlotRecords();
    setSaveSlots(records.map((record) => record.name));
    if (records.length && !selectedSave) setSelectedSave(records[0].name);
  }

  async function saveNamedSlot() {
    const name = saveName.trim();
    if (!name) {
      setStatus("Enter a save name first.");
      return;
    }

    try {
      await persistGame(`warhammer-los-slot:${name}`, `slot:${name}`, { disableLosMarkerVisibility: true });
      touchSaveSlot(name);
      setSelectedSave(name);
      setStatus(`Saved game: ${name}`);
    } catch (err) {
      console.warn("Named save failed", err);
      setStatus("Could not save game. Browser storage may be full.");
    }
  }

  async function loadNamedSlot() {
    if (!selectedSave) {
      setStatus("Choose a game first.");
      return;
    }

    try {
      const raw = localStorage.getItem(`warhammer-los-slot:${selectedSave}`);
      if (!raw) {
        setStatus("That saved game was not found.");
        refreshSaveSlots();
        return;
      }
      await applySaveData(JSON.parse(raw), `Loaded game: ${selectedSave}`);
      touchSaveSlot(selectedSave);
      setSaveName(selectedSave);
    } catch (err) {
      console.warn("Load game failed", err);
      setStatus("Could not load that saved game.");
    }
  }

  async function deleteNamedSlot() {
    if (!selectedSave) {
      setStatus("Choose a game to delete.");
      return;
    }

    localStorage.removeItem(`warhammer-los-slot:${selectedSave}`);
    try {
      await deleteStoredMap(`slot:${selectedSave}`);
      storedMapSourcesRef.current.delete(`slot:${selectedSave}`);
    } catch (err) {
      console.warn("Could not delete saved map", err);
    }
    const next = writeSaveSlotRecords(readSaveSlotRecords().filter((record) => record.name !== selectedSave));
    setSelectedSave(next[0]?.name || "");
    setSaveName(next[0]?.name || "Game 1");
    setStatus(`Deleted game: ${selectedSave}`);
  }

  function handleSelectedSaveChange(value) {
    if (value === "__new_game__") {
      setShowNewGamePrompt(true);
      return;
    }
    setSelectedSave(value);
    if (value) setSaveName(value);
  }

  function nextGameSaveName() {
    let number = 1;
    while (saveSlots.includes(`Game ${number}`)) number += 1;
    return `Game ${number}`;
  }

  function createNewGame() {
    imgRef.current = null;
    state.current.savedImageSrc = null;
    state.current.boardWidthInches = BATTLEFIELD_WIDTH_INCHES;
    state.current.boardHeightInches = BATTLEFIELD_HEIGHT_INCHES;
    state.current.fit = { x: 0, y: 0, w: 0, h: 0 };
    state.current.camera = { scale: 1, x: 0, y: 0 };
    state.current.light = { x: state.current.W / 2, y: state.current.H / 2 };
    state.current.losMarkers = [];
    state.current.scaleStart = null;
    state.current.scalePreview = null;
    state.current.rulerStart = null;
    state.current.rulerPreview = null;
    state.current.rulers = [];
    state.current.stickyRulerStart = null;
    state.current.stickyRulers = [];
    state.current.deploymentLine = null;
    state.current.deploymentPath = [];
    state.current.deploymentDraft = [];
    state.current.deploymentPreview = null;
    state.current.deploymentVisible = true;
    state.current.deploymentNoMansSide = null;
    state.current.deploymentLabelPosition = null;
    state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
    state.current.enemyDeploymentLine = null;
    state.current.enemyDeploymentPath = [];
    state.current.enemyDeploymentDraft = [];
    state.current.enemyDeploymentPreview = null;
    state.current.enemyDeploymentVisible = true;
    state.current.enemyDeploymentNoMansSide = null;
    state.current.enemyDeploymentLabelPosition = null;
    state.current.enemyDeploymentVisibility = { clearZones: [], oneWallZones: [] };
    state.current.blockers = [];
    state.current.blockerIds = [];
    state.current.walls = [];
    state.current.enemies = [];
    state.current.layoutObjectives = [];
    state.current.layoutTerrain = [];
    state.current.layoutTerrainLinks = [];
    state.current.layoutTerrainGroups = [];
    state.current.layoutWalls = [];
    state.current.layoutWallLinks = [];
    state.current.layoutTerrainFeatures = [];
    state.current.layoutFeaturePieces = [];
    state.current.layoutFeatureLinks = [];
    state.current.movementPhases = {};
    state.current.activeLayoutKey = null;
    state.current.currentPoly = [];
    state.current.wallPath = [];
    state.current.wallPreview = null;
    state.current.visibility = { clear: [], oneWall: [] };
    setLayoutLinkMode(false);
    setFirstLinkedTerrainId(null);
    setFirstLinkedWallId(null);
    setFirstLinkedFeatureId(null);

    setSelectedSave("");
    setCustomGridLength(BATTLEFIELD_WIDTH_INCHES);
    setCustomGridWidth(BATTLEFIELD_HEIGHT_INCHES);
    setDefenderForceDisposition("Take and Hold");
    setAttackerForceDisposition("Take and Hold");
    setSelectedLayoutVariant("A");
    setMissionCardsVisible(false);
    setMovementPlanningEnabled(false);
    setActiveMovementPhase("deployment");
    setSaveName(nextGameSaveName());
    setEditingSaveName(false);
    setActiveLosId("");
    setActiveUnitSlot(null);
    setLosName("LOS");
    setBaseShape("circle");
    setBaseLengthMm(40);
    setBaseWidthMm(40);
    setBaseRotation(0);
    setMarkerGroupingMode("model");
    setUnitModelCount(1);
    setSelectedUnitSlot(1);
    setScaleInches(6);
    setRangeInches("unlimited");
    setHomeDeploymentRangeInches("unlimited");
    setEnemyDeploymentRangeInches("unlimited");
    setDeepstrikeRangeInches(8);
    setDeepstrikeVisible(false);
    setPixelsPerInch(null);
    setMode("pan");
    setImageReady(false);
    setLosVersion((version) => version + 1);
    setShowNewGamePrompt(false);
    if (fileRef.current) fileRef.current.value = "";
    calculateFit();
    updateVisibility(activeLosId, false);
    draw();
    scheduleBrowserSave();
    setStatus("New 44 by 60 inch battlefield ready. Upload a map or apply a layout preset.");
  }

  function handleSaveNameChange(value) {
    setSaveName(value);
  }

  async function commitSaveNameRename() {
    const nextName = saveName.trim();
    setEditingSaveName(false);

    if (!nextName) {
      setSaveName(selectedSave || "Game 1");
      setStatus("Save name cannot be blank.");
      return;
    }

    if (!selectedSave) {
      setSaveName(nextName);
      return;
    }

    if (nextName === selectedSave) return;

    if (saveSlots.includes(nextName)) {
      setSaveName(selectedSave);
      setStatus(`A save named ${nextName} already exists.`);
      return;
    }

    try {
      const oldKey = `warhammer-los-slot:${selectedSave}`;
      const newKey = `warhammer-los-slot:${nextName}`;
      const existing = localStorage.getItem(oldKey);
      const data = existing ? JSON.parse(existing) : buildSaveData();
      data.savedAt = new Date().toISOString();
      const oldMapKey = data.mapStorageKey || `slot:${selectedSave}`;
      const nextMapKey = `slot:${nextName}`;
      const savedMap = data.savedImageSrc || await readStoredMap(oldMapKey);
      if (savedMap) await writeStoredMap(nextMapKey, savedMap);
      await deleteStoredMap(oldMapKey);
      storedMapSourcesRef.current.delete(oldMapKey);
      if (savedMap) storedMapSourcesRef.current.set(nextMapKey, savedMap);
      delete data.savedImageSrc;
      data.mapStorageKey = savedMap ? nextMapKey : null;
      localStorage.setItem(newKey, JSON.stringify(data));
      localStorage.removeItem(oldKey);

      const records = readSaveSlotRecords()
        .filter((record) => record.name !== selectedSave && record.name !== nextName);
      writeSaveSlotRecords([{ name: nextName, lastAccessed: Date.now() }, ...records]);
      setSelectedSave(nextName);
      setSaveName(nextName);
      setStatus(`Renamed saved game to: ${nextName}`);
    } catch (err) {
      console.warn("Rename saved game failed", err);
      setStatus("Could not rename saved game.");
    }
  }

  function cancelSaveNameRename() {
    setSaveName(selectedSave || saveName || "Game 1");
    setEditingSaveName(false);
  }

  function toggleSidebarSection(key) {
    setSectionOpen((current) => ({ ...current, [key]: !current[key] }));
    setActiveSidebarHelp((current) => current?.key === key ? null : current);
  }

  function toggleSidebarHelp(key, event) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveSidebarHelp((current) => current?.key === key ? null : {
      key,
      top: Math.max(12, Math.min(rect.top - 6, window.innerHeight - 260)),
    });
  }

  function toggleMapSection(key) {
    setMapSectionOpen((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleEditSubsection(key) {
    setEditSubsectionOpen((current) => ({ ...current, [key]: !current[key] }));
  }

  function refreshArmyPresets() {
    try {
      const names = JSON.parse(localStorage.getItem("warhammer-los-armies-index") || "[]");
      setArmyPresetNames(names);
      if (names.length) {
        setSelectedArmyPreset((current) => current || names[0]);
        setArmyPresetName((current) => current === "Army 1" ? names[0] : current);
      }
    } catch (err) {
      console.warn("Could not load army preset list", err);
    }
  }

  function startNewArmyPreset() {
    setSelectedArmyPreset("");
    setArmyPresetName(`Army ${armyPresetNames.length + 1}`);
    setArmyListText("");
    setArmyResults([]);
    setEditingArmyPresetName(false);
    setStatus("Started a new army list slot.");
  }

  function saveArmyPresetName() {
    const nextName = armyPresetName.trim();
    if (!nextName) {
      setStatus("Enter an army name first.");
      return;
    }
    if (selectedArmyPreset && selectedArmyPreset !== nextName) {
      const raw = localStorage.getItem(`warhammer-los-army:${selectedArmyPreset}`);
      if (raw) {
        localStorage.setItem(`warhammer-los-army:${nextName}`, raw);
        localStorage.removeItem(`warhammer-los-army:${selectedArmyPreset}`);
      }
      const nextNames = [...new Set(armyPresetNames.map((name) => (name === selectedArmyPreset ? nextName : name)))]
        .sort((a, b) => a.localeCompare(b));
      localStorage.setItem("warhammer-los-armies-index", JSON.stringify(nextNames));
      setArmyPresetNames(nextNames);
    }
    setSelectedArmyPreset(nextName);
    setArmyPresetName(nextName);
    setEditingArmyPresetName(false);
    setStatus(`Army name saved as ${nextName}.`);
  }

  function saveArmyPreset() {
    const name = armyPresetName.trim();
    if (!name) {
      setStatus("Enter an army preset name first.");
      return;
    }
    if (!armyListText.trim() && !armyResults.length) {
      setStatus("Paste or match an army list before saving a preset.");
      return;
    }

    try {
      const data = {
        version: 1,
        savedAt: new Date().toISOString(),
        armyListText,
        armyResults,
      };
      localStorage.setItem(`warhammer-los-army:${name}`, JSON.stringify(data));
      const next = armyPresetNames.includes(name)
        ? armyPresetNames
        : [...armyPresetNames, name].sort((a, b) => a.localeCompare(b));
      localStorage.setItem("warhammer-los-armies-index", JSON.stringify(next));
      setArmyPresetNames(next);
      setSelectedArmyPreset(name);
      setArmyPresetName(name);
      setStatus(`Saved army preset: ${name}`);
    } catch (err) {
      console.warn("Army preset save failed", err);
      setStatus("Could not save that army preset.");
    }
  }

  function loadArmyPreset() {
    if (!selectedArmyPreset) {
      setStatus("Choose an army preset first.");
      return;
    }
    try {
      const raw = localStorage.getItem(`warhammer-los-army:${selectedArmyPreset}`);
      if (!raw) {
        refreshArmyPresets();
        setStatus("That army preset was not found.");
        return;
      }
      const data = JSON.parse(raw);
      setArmyListText(data.armyListText || "");
      setArmyResults(Array.isArray(data.armyResults) ? data.armyResults : []);
      setArmyPresetName(selectedArmyPreset);
      setStatus(`Loaded army preset: ${selectedArmyPreset}`);
    } catch (err) {
      console.warn("Army preset load failed", err);
      setStatus("Could not load that army preset.");
    }
  }

  function deleteArmyPreset() {
    if (!selectedArmyPreset) {
      setStatus("Choose an army preset to delete.");
      return;
    }
    localStorage.removeItem(`warhammer-los-army:${selectedArmyPreset}`);
    const next = armyPresetNames.filter((name) => name !== selectedArmyPreset);
    localStorage.setItem("warhammer-los-armies-index", JSON.stringify(next));
    setArmyPresetNames(next);
    setSelectedArmyPreset(next[0] || "");
    setArmyPresetName(next[0] || "Army 1");
    setStatus(`Deleted army preset: ${selectedArmyPreset}`);
  }


  function createLosMarker(id, name, x, y) {
    return {
      id,
      name,
      x,
      y,
      baseShape: "circle",
      baseLengthMm: 40,
      baseWidthMm: 40,
      baseRotation: 0,
      rangeInches: "unlimited",
      visible: true,
      groupingMode: "model",
      unitSlot: null,
      unitTypeId: id,
      unitName: "",
      unitNameCustom: false,
      unitRangeInches: "unlimited",
    };
  }

  function normalizeLosMarker(marker, index = 0, fallbackRange = "unlimited") {
    const id = marker.id || `los-${Date.now()}-${index}`;
    const baseLength = Number(marker.baseLengthMm) || 40;
    return {
      id,
      name: marker.name || `LOS ${index + 1}`,
      x: Number(marker.x ?? marker.light?.x ?? state.current.W / 2),
      y: Number(marker.y ?? marker.light?.y ?? state.current.H / 2),
      baseShape: marker.baseShape || "circle",
      baseLengthMm: baseLength,
      baseWidthMm: Number(marker.baseWidthMm) || baseLength,
      baseRotation: Number(marker.baseRotation) || 0,
      rangeInches: marker.rangeInches ?? fallbackRange ?? "unlimited",
      visible: marker.visible !== false,
      groupingMode: marker.groupingMode === "unit" ? "unit" : "model",
      unitSlot: marker.groupingMode === "unit" && Number(marker.unitSlot) ? Number(marker.unitSlot) : null,
      unitTypeId: marker.unitTypeId || id,
      unitName: marker.unitName || "",
      unitNameCustom: marker.unitNameCustom === true,
      unitRangeInches: marker.unitRangeInches ?? "unlimited",
    };
  }

  function getActiveLosMarker() {
    return state.current.losMarkers.find((marker) => marker.id === activeLosId) || state.current.losMarkers[0];
  }

  function getActiveLosPoint() {
    const active = getActiveLosMarker();
    return active ? { x: active.x, y: active.y } : state.current.light;
  }

  function updateActiveLosMarker(patch) {
    const markers = state.current.losMarkers;
    const index = markers.findIndex((marker) => marker.id === activeLosId);
    if (index < 0) return;
    markers[index] = { ...markers[index], ...patch };
    const active = markers[index];
    state.current.light = { x: active.x, y: active.y };

    if ("name" in patch) setLosName(active.name);
    if ("baseShape" in patch) setBaseShape(active.baseShape);
    if ("baseLengthMm" in patch) setBaseLengthMm(active.baseLengthMm);
    if ("baseWidthMm" in patch) setBaseWidthMm(active.baseWidthMm);
    if ("baseRotation" in patch) setBaseRotation(active.baseRotation);
    if ("rangeInches" in patch) setRangeInches(active.rangeInches ?? "unlimited");
    if ("groupingMode" in patch) setMarkerGroupingMode(active.groupingMode || "model");
    if ("unitSlot" in patch) setSelectedUnitSlot(active.unitSlot || 1);

    setLosVersion((v) => v + 1);
    updateVisibility(activeLosId, false);
    draw();
    scheduleBrowserSave();
  }

  function updateLosMarkerById(id, patch) {
    const index = state.current.losMarkers.findIndex((marker) => marker.id === id);
    if (index < 0) return;
    state.current.losMarkers[index] = { ...state.current.losMarkers[index], ...patch };
    if (id === activeLosId) {
      const marker = state.current.losMarkers[index];
      setLosName(marker.name || "LOS");
      setBaseShape(marker.baseShape || "circle");
      setBaseLengthMm(marker.baseLengthMm || 40);
      setBaseWidthMm(marker.baseWidthMm || marker.baseLengthMm || 40);
      setBaseRotation(marker.baseRotation || 0);
      setRangeInches(marker.rangeInches ?? "unlimited");
      state.current.light = { x: marker.x, y: marker.y };
    }
    setLosVersion((v) => v + 1);
    updateVisibility(id, false);
    draw();
    scheduleBrowserSave();
  }

  function renameLosMarker(id, name) {
    updateLosMarkerById(id, { name });
  }

  function setLosMarkerVisibility(id, visible) {
    const marker = state.current.losMarkers.find((item) => item.id === id);
    if (!marker || marker.visible === visible) return;
    marker.visible = visible;
    if (visible) {
      if (!requestDetailedMarkerVisibility(marker)) {
        cacheMarkerVisibility(marker.id, calculateMarkerVisibility(marker));
      }
    }
    rebuildCombinedVisibility();
    updateEnemyLosStates(false, { forceImmediate: true });
    setLosVersion((version) => version + 1);
    draw();
    scheduleBrowserSave();
    setStatus(`${marker.name || "LOS"} LOS ${visible ? "enabled" : "disabled"}.`);
  }

  function sortedLosMarkers() {
    return [...state.current.losMarkers].sort((a, b) => (a.name || "LOS").localeCompare(b.name || "LOS"));
  }

  function getUnitMembers(slot) {
    return state.current.losMarkers.filter((marker) => marker.groupingMode === "unit" && marker.unitSlot === Number(slot));
  }

  function getMarkerTypeMembers(marker) {
    if (!marker) return [];
    if (marker.groupingMode !== "unit") return [marker];
    return getUnitMembers(marker.unitSlot).filter((item) => item.unitTypeId === marker.unitTypeId);
  }

  function getUnitDisplayName(slot, members = getUnitMembers(slot)) {
    const customName = members.find((member) => member.unitNameCustom && member.unitName)?.unitName;
    if (customName) return customName;
    const types = new Map();
    members.forEach((member) => {
      const key = member.unitTypeId || member.id;
      const existing = types.get(key) || { name: member.name || "LOS", count: 0 };
      existing.count += 1;
      types.set(key, existing);
    });
    const names = [...types.values()]
      .sort((first, second) => first.count - second.count)
      .map((type) => type.name);
    return `Unit ${slot}: ${names.join(" + ")}`;
  }

  function getUnitRange(slot, members = getUnitMembers(slot)) {
    return members.find((member) => member.unitRangeInches !== undefined)?.unitRangeInches ?? "unlimited";
  }

  function updateUnit(slot, patch) {
    const members = getUnitMembers(slot);
    if (!members.length) return;
    members.forEach((member) => Object.assign(member, patch));
    setLosVersion((version) => version + 1);
    draw();
    scheduleBrowserSave();
  }

  function renameUnit(slot, name) {
    updateUnit(slot, { unitName: name, unitNameCustom: true });
  }

  function setUnitRange(slot, value) {
    updateUnit(slot, { unitRangeInches: value || "unlimited" });
  }

  function setUnitVisibility(slot, visible) {
    const members = getUnitMembers(slot);
    if (!members.length) return;
    members.forEach((member) => {
      member.visible = visible;
    });
    if (visible && !requestDetailedMarkerVisibilityBatch(members)) {
      const preparedGeometry = getPreparedVisibilityGeometry(state.current.blockers, state.current.walls, state.current.W, state.current.H);
      members.forEach((member) => {
        cacheMarkerVisibility(member.id, calculateMarkerVisibility(member, false, preparedGeometry));
      });
    }
    rebuildCombinedVisibility();
    updateEnemyLosStates(false, { forceImmediate: true });
    setLosVersion((version) => version + 1);
    draw();
    scheduleBrowserSave();
    setStatus(`${getUnitDisplayName(slot, members)} LOS ${visible ? "enabled" : "disabled"}.`);
  }

  function selectUnit(slot) {
    const members = getUnitMembers(slot);
    if (!members.length) return;
    multiSelectedMarkerIdsRef.current.clear();
    const first = members[0];
    setActiveUnitSlot(slot);
    setActiveLosId(first.id);
    setLosName(first.name);
    setBaseShape(first.baseShape);
    setBaseLengthMm(first.baseLengthMm);
    setBaseWidthMm(first.baseWidthMm);
    setBaseRotation(first.baseRotation || 0);
    setRangeInches(first.rangeInches ?? "unlimited");
    setMarkerGroupingMode("unit");
    setUnitModelCount(getMarkerTypeMembers(first).length || 1);
    setSelectedUnitSlot(slot);
    state.current.light = { x: first.x, y: first.y };
    setStatus(`${getUnitDisplayName(slot, members)} selected. Drag any model to move the whole unit.`);
    draw();
  }

  function startUnitStickyRuler(slot) {
    if (!pixelsPerInch) {
      setStatus("Set the map scale before using a unit sticky ruler.");
      return;
    }
    selectUnit(slot);
    state.current.stickyRulerStart = { type: "unit", id: String(slot) };
    setMode("stickyRuler");
    setStatus(`${getUnitDisplayName(slot)} selected. Choose a footprint, enemy, or LOS marker.`);
    draw();
  }

  function setActiveMarkerAsModel() {
    const marker = getActiveLosMarker();
    if (!marker) return;
    marker.groupingMode = "model";
    marker.unitSlot = null;
    marker.unitTypeId = marker.id;
    marker.unitName = "";
    marker.unitNameCustom = false;
    marker.unitRangeInches = "unlimited";
    setActiveUnitSlot(null);
    setMarkerGroupingMode("model");
    setUnitModelCount(1);
    setLosVersion((version) => version + 1);
    draw();
    scheduleBrowserSave();
    setStatus(`${marker.name} is now a standalone model.`);
  }

  function applyActiveMarkerToUnit() {
    const marker = getActiveLosMarker();
    if (!marker) return;
    if (!pixelsPerInch) {
      setStatus("Set the map scale before generating a unit formation.");
      return;
    }

    const slot = Math.max(1, Math.min(20, Number(selectedUnitSlot) || 1));
    const desiredCount = Math.max(1, Math.min(20, Number(unitModelCount) || 1));
    const sourceMembers = getMarkerTypeMembers(marker);
    const sourceIds = new Set(sourceMembers.map((item) => item.id));
    const destinationMembers = getUnitMembers(slot).filter((item) => !sourceIds.has(item.id));
    const typeId = marker.unitTypeId || marker.id;
    const workingMembers = [...sourceMembers];

    while (workingMembers.length < desiredCount) {
      const copyIndex = workingMembers.length + 1;
      const copy = {
        ...marker,
        id: `unit-model-${Date.now()}-${copyIndex}`,
        name: marker.name,
        visible: marker.visible,
        groupingMode: "unit",
        unitSlot: slot,
        unitTypeId: typeId,
      };
      state.current.losMarkers.push(copy);
      workingMembers.push(copy);
    }

    while (workingMembers.length > desiredCount) {
      let removeIndex = workingMembers.length - 1;
      while (removeIndex >= 0 && workingMembers[removeIndex].id === marker.id) removeIndex -= 1;
      if (removeIndex < 0) break;
      const [removed] = workingMembers.splice(removeIndex, 1);
      state.current.losMarkers = state.current.losMarkers.filter((item) => item.id !== removed.id);
      removeStickyRulersForTarget({ type: "los", id: removed.id });
    }

    workingMembers.forEach((item) => {
      item.groupingMode = "unit";
      item.unitSlot = slot;
      item.unitTypeId = typeId;
    });

    const anchorGroup = destinationMembers.length >= workingMembers.length ? destinationMembers : workingMembers;
    const movingGroup = anchorGroup === destinationMembers ? workingMembers : destinationMembers;
    const anchor = anchorGroup[0] || marker;
    const orderedMembers = anchorGroup === destinationMembers
      ? [...destinationMembers, ...movingGroup]
      : [...workingMembers, ...movingGroup];
    layoutUnitGrid(orderedMembers, anchor.x, anchor.y);

    const combinedMembers = getUnitMembers(slot);
    const existingCustomName = combinedMembers.find((item) => item.unitNameCustom && item.unitName)?.unitName;
    const unitName = existingCustomName || getUnitDisplayName(slot, combinedMembers);
    const unitRange = combinedMembers.find((item) => item.unitRangeInches !== undefined)?.unitRangeInches ?? "unlimited";
    combinedMembers.forEach((item) => {
      item.unitName = unitName;
      item.unitNameCustom = Boolean(existingCustomName);
      item.unitRangeInches = unitRange;
    });

    setMarkerGroupingMode("unit");
    setActiveUnitSlot(slot);
    setSelectedUnitSlot(slot);
    setUnitModelCount(desiredCount);
    setLosVersion((version) => version + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${marker.name} assigned to Unit ${slot} with ${desiredCount} model${desiredCount === 1 ? "" : "s"} of this type.`);
  }

  function layoutUnitGrid(members, startX, startY) {
    if (!members.length) return;
    const effectivePixelsPerInch = pixelsPerInch || state.current.fit.w / boardWidthInches() || 10;
    const gap = 0.25 * effectivePixelsPerInch;
    const columns = 5;
    const rows = Math.ceil(members.length / columns);
    const columnWidths = Array(columns).fill(0);
    const rowHeights = Array(rows).fill(0);
    members.forEach((member, index) => {
      const base = getBaseRadii(1, member);
      const column = index % columns;
      const row = Math.floor(index / columns);
      columnWidths[column] = Math.max(columnWidths[column], base.rx * 2);
      rowHeights[row] = Math.max(rowHeights[row], base.ry * 2);
    });
    const columnCenters = [startX];
    for (let column = 1; column < columns; column++) {
      columnCenters[column] = columnCenters[column - 1] + columnWidths[column - 1] / 2 + gap + columnWidths[column] / 2;
    }
    const rowCenters = [startY];
    for (let row = 1; row < rows; row++) {
      rowCenters[row] = rowCenters[row - 1] + rowHeights[row - 1] / 2 + gap + rowHeights[row] / 2;
    }
    members.forEach((member, index) => {
      member.x = columnCenters[index % columns];
      member.y = rowCenters[Math.floor(index / columns)];
    });
  }

  function selectLosMarker(id) {
    const marker = state.current.losMarkers.find((m) => m.id === id);
    if (!marker) return;
    setActiveUnitSlot(null);
    setActiveLosId(id);
    setLosName(marker.name);
    setBaseShape(marker.baseShape);
    setBaseLengthMm(marker.baseLengthMm);
    setBaseWidthMm(marker.baseWidthMm);
    setBaseRotation(marker.baseRotation);
    setRangeInches(marker.rangeInches ?? "unlimited");
    setMarkerGroupingMode(marker.groupingMode || "model");
    setUnitModelCount(getMarkerTypeMembers(marker).length || 1);
    setSelectedUnitSlot(marker.unitSlot || 1);
    state.current.light = { x: marker.x, y: marker.y };
    setStatus(`Selected ${marker.name}.`);
  }

  function nextLosMarkerStagingPoint(index = state.current.losMarkers.length) {
    const yStep = Math.max(34, (pixelsPerInch || state.current.fit.w / boardWidthInches()) * 1.2);
    const rowsPerColumn = 12;
    const column = Math.floor(index / rowsPerColumn);
    const columnStep = Math.max(70, yStep * 2);
    return {
      x: state.current.fit.x - 48 / state.current.camera.scale - column * columnStep,
      y: state.current.fit.y + 45 / state.current.camera.scale + (index % rowsPerColumn) * yStep,
    };
  }

  function markerCollectionBounds(markers) {
    return markers.reduce((bounds, marker) => {
      const base = getBaseRadii(1, marker);
      return {
        minX: Math.min(bounds.minX, marker.x - base.rx),
        maxX: Math.max(bounds.maxX, marker.x + base.rx),
        minY: Math.min(bounds.minY, marker.y - base.ry),
        maxY: Math.max(bounds.maxY, marker.y + base.ry),
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  }

  function layoutArmyGeneratedStaging() {
    const generated = state.current.losMarkers.filter((marker) => String(marker.id || "").startsWith("army-los-"));
    if (!generated.length) return;

    const groups = [];
    const seenUnits = new Set();
    generated.forEach((marker) => {
      if (marker.groupingMode === "unit" && marker.unitSlot) {
        if (seenUnits.has(marker.unitSlot)) return;
        seenUnits.add(marker.unitSlot);
        groups.push(getUnitMembers(marker.unitSlot).filter((member) => String(member.id || "").startsWith("army-los-")));
      } else {
        groups.push([marker]);
      }
    });

    const effectivePixelsPerInch = pixelsPerInch || state.current.fit.w / boardWidthInches() || 10;
    const groupGap = Math.max(24, effectivePixelsPerInch * 0.75);
    const top = state.current.fit.y + groupGap;
    const stagingHeight = state.current.fit.h || Math.max(groupGap * 2, state.current.H - top);
    const bottom = top + stagingHeight - groupGap;
    let cursorY = top;
    let columnOffset = 0;
    let columnWidth = 0;

    groups.forEach((markers) => {
      if (!markers.length) return;
      if (markers.length > 1) layoutUnitGrid(markers, 0, 0);
      else {
        markers[0].x = 0;
        markers[0].y = 0;
      }
      let bounds = markerCollectionBounds(markers);
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      if (cursorY > top && cursorY + height > bottom) {
        columnOffset += columnWidth + groupGap;
        columnWidth = 0;
        cursorY = top;
      }
      const targetRight = state.current.fit.x - groupGap - columnOffset;
      const dx = targetRight - bounds.maxX;
      const dy = cursorY - bounds.minY;
      markers.forEach((marker) => {
        marker.x += dx;
        marker.y += dy;
        if (marker.id === activeLosId) state.current.light = { x: marker.x, y: marker.y };
      });
      bounds = markerCollectionBounds(markers);
      cursorY = bounds.maxY + groupGap;
      columnWidth = Math.max(columnWidth, width);
    });
  }

  function addLosMarker() {
    const id = `los-${Date.now()}`;
    const existing = state.current.losMarkers.length;
    const spawn = nextLosMarkerStagingPoint(existing);
    const marker = createLosMarker(id, `LOS ${existing + 1}`, spawn.x, spawn.y);
    marker.baseShape = baseShape;
    marker.baseLengthMm = baseLengthMm;
    marker.baseWidthMm = baseShape === "circle" ? baseLengthMm : baseWidthMm;
    marker.baseRotation = baseRotation;
    marker.rangeInches = "unlimited";
    state.current.losMarkers.push(marker);
    setActiveUnitSlot(null);
    setActiveLosId(id);
    setLosName(marker.name);
    setMarkerGroupingMode("model");
    setUnitModelCount(1);
    setSelectedUnitSlot(1);
    setLosVersion((v) => v + 1);
    setStatus(`Added ${marker.name}.`);
    scheduleBrowserSave();
  }

  function addDatabaseLosMarker(name, base) {
    const id = `los-${Date.now()}`;
    const spawn = nextLosMarkerStagingPoint();
    const marker = createLosMarker(id, name, spawn.x, spawn.y);
    marker.baseShape = base.shape || "circle";
    marker.baseLengthMm = Number(marker.baseShape === "circle" ? base.diameter : base.length) || 40;
    marker.baseWidthMm = marker.baseShape === "circle"
      ? marker.baseLengthMm
      : Number(base.width) || marker.baseLengthMm;
    state.current.losMarkers.push(marker);
    setActiveUnitSlot(null);
    setActiveLosId(id);
    setLosName(marker.name);
    setBaseShape(marker.baseShape);
    setBaseLengthMm(marker.baseLengthMm);
    setBaseWidthMm(marker.baseWidthMm);
    setBaseRotation(0);
    setRangeInches("unlimited");
    setMarkerGroupingMode("model");
    setUnitModelCount(1);
    setSelectedUnitSlot(1);
    state.current.light = { x: marker.x, y: marker.y };
    setModelSearch("");
    setModelSearchIndex(0);
    setLosVersion((v) => v + 1);
    setStatus(`Added ${name}.`);
    scheduleBrowserSave();
  }

  function renameActiveLosMarker() {
    const name = losName.trim() || "LOS";
    updateActiveLosMarker({ name });
    setStatus(`Renamed active LOS marker to ${name}.`);
  }

  function toggleActiveLosVisibility() {
    const marker = getActiveLosMarker();
    if (!marker) return;
    updateActiveLosMarker({ visible: !marker.visible });
    setStatus(`${marker.name} LOS ${marker.visible ? "hidden" : "shown"}.`);
  }

  function deleteActiveLosMarker() {
    const old = getActiveLosMarker();
    if (!old) return;
    state.current.losMarkers = state.current.losMarkers.filter((marker) => marker.id !== activeLosId);
    removeStickyRulersForTarget({ type: "los", id: activeLosId });
    const next = state.current.losMarkers[0];
    if (old.groupingMode === "unit" && !getUnitMembers(old.unitSlot).length) setActiveUnitSlot(null);
    setActiveLosId(next?.id || "");
    if (next) {
      setLosName(next.name);
      setBaseShape(next.baseShape);
      setBaseLengthMm(next.baseLengthMm);
      setBaseWidthMm(next.baseWidthMm);
      setBaseRotation(next.baseRotation);
      setRangeInches(next.rangeInches ?? "unlimited");
      setMarkerGroupingMode(next.groupingMode || "model");
      setUnitModelCount(getMarkerTypeMembers(next).length || 1);
      setSelectedUnitSlot(next.unitSlot || 1);
      state.current.light = { x: next.x, y: next.y };
    } else {
      setRangeInches("unlimited");
      setMarkerGroupingMode("model");
      setUnitModelCount(1);
      setSelectedUnitSlot(1);
      state.current.light = { x: state.current.W / 2, y: state.current.H / 2 };
    }
    setLosVersion((v) => v + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`Deleted ${old?.name || "LOS marker"}.`);
  }


  function cleanArmyLine(line) {
    return line
      .replace(/\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/^\s*\d+\s*x?\s*/i, "")
      .replace(/^\s*[•◦\-*]+\s*/, "")
      .replace(/\b\d+\s*(pts?|points?|pl)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isArmyBulletLine(line) {
    return /^\s*[•◦\-*]/.test(line);
  }

  function extractWarhammerAppUnits(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !isArmyBulletLine(line))
      .map((line) => {
        const match = line.match(/^(.+?)\s*\((\d+)\s*Points?\)\s*$/i);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean);
  }

  function parseWarhammerArmyEntries(text) {
    const entries = [];
    let section = "";
    let attachedSlot = null;
    let currentEntry = null;
    const isBullet = (line) => /^\s*[\u2022\u25e6\-*]/.test(line);

    String(text || "").split(/\r?\n/).forEach((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return;

      const attachedMatch = trimmed.match(/^Attached\s+unit\s+(\d+)\s*$/i);
      if (attachedMatch) {
        section = "ATTACHED UNITS";
        attachedSlot = Math.max(1, Math.min(20, Number(attachedMatch[1]) || 1));
        currentEntry = null;
        return;
      }

      const heading = trimmed.toUpperCase();
      if (/^[A-Z][A-Z\s/&-]+$/.test(trimmed) && !/\bPOINTS?\b/i.test(trimmed)) {
        section = heading;
        if (heading !== "ATTACHED UNITS") attachedSlot = null;
        currentEntry = null;
        return;
      }

      const datasheetMatch = trimmed.match(/^(.+?)\s*\(([\d,]+)\s*Points?\)\s*$/i);
      if (datasheetMatch && section) {
        currentEntry = {
          name: datasheetMatch[1].trim(),
          original: trimmed,
          section,
          attachedSlot,
          bullets: [],
        };
        entries.push(currentEntry);
        return;
      }

      if (!currentEntry || !isBullet(rawLine)) return;
      const prefix = rawLine.match(/^(\s*)[\u2022\u25e6\-*]\s*/);
      const indent = (prefix?.[1] || "").replace(/\t/g, "    ").length;
      const content = rawLine.replace(/^\s*[\u2022\u25e6\-*]\s*/, "").trim();
      currentEntry.bullets.push({ indent, content });
    });

    const usedSlots = new Set(entries.map((entry) => entry.attachedSlot).filter(Boolean));
    let nextUnitSlot = 1;
    const allocateUnitSlot = () => {
      while (usedSlots.has(nextUnitSlot) && nextUnitSlot <= 20) nextUnitSlot += 1;
      const slot = Math.min(20, nextUnitSlot);
      usedSlots.add(slot);
      nextUnitSlot += 1;
      return slot;
    };

    return entries.map((entry) => {
      const roleLine = entry.bullets.find((bullet) => /^Attached\s+as:/i.test(bullet.content));
      const attachmentRole = /\bLeader\b/i.test(roleLine?.content || "")
        ? "leader"
        : /\bBodyguard\b/i.test(roleLine?.content || "") ? "bodyguard" : null;
      const quantityBullets = entry.bullets
        .map((bullet) => ({ ...bullet, match: bullet.content.match(/^(\d+)\s*x\s+(.+)$/i) }))
        .filter((bullet) => bullet.match);
      const countIndent = quantityBullets.length ? Math.min(...quantityBullets.map((bullet) => bullet.indent)) : 0;
      const hasNestedBullets = entry.bullets.some((bullet) => bullet.indent > countIndent);
      const topLevelCounts = quantityBullets
        .filter((bullet) => bullet.indent === countIndent)
        .map((bullet) => Number(bullet.match[1]) || 0);
      const countedModels = Math.min(100, topLevelCounts.reduce((sum, count) => sum + count, 0));
      const isCharacter = entry.section === "CHARACTERS" || attachmentRole === "leader";
      const modelCount = isCharacter
        ? 1
        : attachmentRole === "bodyguard"
          ? Math.max(1, countedModels)
          : hasNestedBullets && countedModels > 0 ? countedModels : 1;
      const unitSlot = entry.attachedSlot || (modelCount > 1 ? allocateUnitSlot() : null);
      return { ...entry, attachmentRole, modelCount, unitSlot };
    });
  }

  function normaliseName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(unit|models?|model|squad|team)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreUnitMatch(line, unitName) {
    const search = normaliseName(line);
    const unit = normaliseName(unitName);
    if (!search || !unit) return 0;
    if (search === unit) return 1000;
    if (search.includes(unit)) return 800 + unit.length;
    if (unit.includes(search)) return 650 + search.length;

    const searchWords = new Set(search.split(" ").filter(Boolean));
    const unitWords = unit.split(" ").filter(Boolean);
    const hits = unitWords.filter((word) => searchWords.has(word));
    if (!hits.length) return 0;
    return hits.length * 100 + hits.join("").length;
  }

  function findBestBaseMatch(unitName) {
  const search = normaliseName(unitName);
  const entries = Object.entries(BASE_DATABASE);

  for (const [name, base] of entries) {
    if (normaliseName(name) === search) return { name, base };
  }

  for (const [name, base] of entries) {
    const n = normaliseName(name);
    if (singularise(n) === singularise(search)) return { name, base };
  }

  for (const [name, base] of entries) {
    const n = normaliseName(name);
    if (search.includes(n) || n.includes(search)) return { name, base };
  }

  let best = null;
  let bestScore = Infinity;

  for (const [name, base] of entries) {
    const score = levenshtein(singularise(search), singularise(normaliseName(name)));
    if (score < bestScore) {
      bestScore = score;
      best = { name, base };
    }
  }

  return bestScore <= 3 ? best : null;
}

  function formatBase(result) {
  const shape = result.baseShape || "circle";

  if (shape === "oval") {
    return `Oval • ${result.baseLengthMm}mm × ${result.baseWidthMm}mm`;
  }

  if (shape === "rectangle") {
    return `Rectangle - ${result.baseLengthMm}mm x ${result.baseWidthMm}mm`;
  }


  return `Circle • ${result.baseLengthMm}mm`;
}

  function resultBaseFromMatch(match, fallbackName = "") {
    const base = match?.base || { shape: "circle", diameter: 40 };
    const shape = base.shape || "circle";
    const baseLengthMm = shape === "circle" ? base.diameter : base.length;
    const baseWidthMm = shape === "circle" ? base.diameter : base.width;
    return {
      unit: match?.name || fallbackName,
      matched: Boolean(match),
      accepted: Boolean(match),
      editing: !match,
      baseShape: shape,
      baseLengthMm: Number(baseLengthMm) || 40,
      baseWidthMm: Number(baseWidthMm) || Number(baseLengthMm) || 40,
    };
  }

  function removeArmyGeneratedMarker(markerId) {
    if (!markerId) return false;
    const before = state.current.losMarkers.length;
    state.current.losMarkers = state.current.losMarkers.filter((marker) => marker.id !== markerId);
    removeStickyRulersForTarget({ type: "los", id: markerId });
    if (before === state.current.losMarkers.length) return false;
    if (activeLosId === markerId) {
      const next = state.current.losMarkers[0];
      setActiveLosId(next?.id || "");
      if (next) {
        setLosName(next.name);
        setBaseShape(next.baseShape || "circle");
        setBaseLengthMm(next.baseLengthMm || 40);
        setBaseWidthMm(next.baseWidthMm || next.baseLengthMm || 40);
        setBaseRotation(next.baseRotation || 0);
        setRangeInches(next.rangeInches ?? "unlimited");
        state.current.light = { x: next.x, y: next.y };
      }
    }
    return true;
  }

  function armyResultMarkerIds(result) {
    return [...new Set([...(result?.markerIds || []), result?.markerId].filter(Boolean))];
  }

  function removeArmyGeneratedMarkersForResult(result) {
    return armyResultMarkerIds(result).reduce((removed, markerId) => removeArmyGeneratedMarker(markerId) || removed, false);
  }

  function createLosMarkersForArmyResult(result, index = 0) {
    if (!result?.accepted) return [];
    const existingIds = armyResultMarkerIds(result).filter((markerId) => state.current.losMarkers.some((marker) => marker.id === markerId));
    if (existingIds.length) return existingIds;

    const count = Math.max(1, Math.min(100, Number(result.modelCount) || 1));
    const markerIds = [];
    for (let modelIndex = 0; modelIndex < count; modelIndex += 1) {
      const id = `army-los-${Date.now()}-${index}-${modelIndex}-${Math.random().toString(36).slice(2, 7)}`;
      const spawn = nextLosMarkerStagingPoint(state.current.losMarkers.length + modelIndex);
      const marker = {
        ...createLosMarker(id, result.unit || result.original || `Unit ${index + 1}`, spawn.x, spawn.y),
        baseShape: result.baseShape || "circle",
        baseLengthMm: Number(result.baseLengthMm) || 40,
        baseWidthMm: result.baseShape === "circle" ? Number(result.baseLengthMm) || 40 : Number(result.baseWidthMm) || Number(result.baseLengthMm) || 40,
        visible: false,
        armyResultId: result.id,
        groupingMode: result.unitSlot ? "unit" : "model",
        unitSlot: result.unitSlot || null,
        unitTypeId: `army-type-${result.id}`,
      };
      state.current.losMarkers.push(marker);
      markerIds.push(id);
    }

    if (result.unitSlot) {
      const members = getUnitMembers(result.unitSlot);
      const anchor = members[0];
      if (anchor) layoutUnitGrid(members, anchor.x, anchor.y);
    }
    return markerIds;
  }

  function parseArmyList() {
    state.current.losMarkers = state.current.losMarkers.filter((marker) => !String(marker.id || "").startsWith("army-los-"));
    const retainedMarkerIds = new Set(state.current.losMarkers.map((marker) => marker.id));
    state.current.stickyRulers = state.current.stickyRulers.filter((ruler) => (
      (ruler.from.type !== "los" || retainedMarkerIds.has(ruler.from.id))
      && (ruler.to.type !== "los" || retainedMarkerIds.has(ruler.to.id))
    ));
    const structuredEntries = parseWarhammerArmyEntries(armyListText);
    const fallbackLines = armyListText.split(/\n|\r|;/)
      .map(cleanArmyLine)
      .filter((line) => line.length >= 3)
      .filter((line) => !/^\d+$/.test(line));
    const sourceEntries = structuredEntries.length
      ? structuredEntries
      : [...new Set(fallbackLines.map((line) => normaliseName(line)))].map((normalized) => ({
        name: fallbackLines.find((line) => normaliseName(line) === normalized),
        original: fallbackLines.find((line) => normaliseName(line) === normalized),
        modelCount: 1,
        unitSlot: null,
      }));

    const results = sourceEntries.map((entry, index) => {
      const match = findBestBaseMatch(entry.name);
      return {
        id: `army-result-${Date.now()}-${index}`,
        original: entry.original || entry.name,
        modelCount: entry.modelCount || 1,
        unitSlot: entry.unitSlot || null,
        attachmentRole: entry.attachmentRole || null,
        section: entry.section || "",
        ...resultBaseFromMatch(match, entry.name),
      };
    });

    const hydratedResults = results.map((result, index) => {
      const markerIds = result.accepted ? createLosMarkersForArmyResult(result, index) : [];
      return { ...result, markerIds, markerId: markerIds[0] || null };
    });
    layoutArmyGeneratedStaging();
    if (hydratedResults.some((result) => result.markerId)) {
      const first = state.current.losMarkers.find((marker) => marker.id === hydratedResults.find((result) => result.markerId)?.markerId);
      if (first) {
        setActiveLosId(first.id);
        setActiveUnitSlot(first.groupingMode === "unit" ? first.unitSlot : null);
        setLosName(first.name);
        setBaseShape(first.baseShape);
        setBaseLengthMm(first.baseLengthMm);
        setBaseWidthMm(first.baseWidthMm);
        setBaseRotation(first.baseRotation || 0);
        setRangeInches(first.rangeInches ?? "unlimited");
        setMarkerGroupingMode(first.groupingMode || "model");
        setUnitModelCount(getMarkerTypeMembers(first).length || 1);
        setSelectedUnitSlot(first.unitSlot || 1);
        state.current.light = { x: first.x, y: first.y };
      }
      setLosVersion((v) => v + 1);
      updateVisibility();
      draw();
      scheduleBrowserSave();
    }
    setArmyResults(hydratedResults);
    setStatus(
      structuredEntries.length
        ? `Warhammer app format detected. Matched ${hydratedResults.filter((r) => r.matched).length} of ${hydratedResults.length} unit entries and created ${hydratedResults.reduce((sum, result) => sum + (result.markerIds?.length || 0), 0)} LOS markers in their declared units.`
        : `Matched ${hydratedResults.filter((r) => r.matched).length} of ${hydratedResults.length} army-list entries and created LOS markers for them.`
    );
  }

  function updateArmyResult(id, patch) {
    setArmyResults((current) => current.map((result) => result.id === id ? { ...result, ...patch } : result));
  }

  function rematchArmyResult(id) {
    setArmyResults((current) => current.map((result, index) => {
      if (result.id !== id) return result;
      removeArmyGeneratedMarkersForResult(result);
      const match = findBestBaseMatch(result.unit || result.original || "");
      const updated = {
        ...result,
        ...resultBaseFromMatch(match, result.unit || result.original || ""),
      };
      updated.markerIds = updated.accepted ? createLosMarkersForArmyResult(updated, index) : [];
      updated.markerId = updated.markerIds[0] || null;
      layoutArmyGeneratedStaging();
      setStatus(updated.matched ? `${updated.unit} rematched and added with ${updated.markerIds.length} LOS marker${updated.markerIds.length === 1 ? "" : "s"}.` : `${result.unit || result.original} still needs manual base details.`);
      return updated;
    }));
    setLosVersion((v) => v + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
  }

  function addArmyResultLosMarker(id) {
    setArmyResults((current) => current.map((result, index) => {
      if (result.id !== id) return result;
      const accepted = {
        ...result,
        accepted: true,
        editing: false,
        matched: result.matched || false,
      };
      const markerIds = createLosMarkersForArmyResult(accepted, index);
      layoutArmyGeneratedStaging();
      setStatus(`${accepted.unit || accepted.original} added with ${markerIds.length} LOS marker${markerIds.length === 1 ? "" : "s"}.`);
      return { ...accepted, markerIds, markerId: markerIds[0] || null };
    }));
    setLosVersion((v) => v + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
  }

  function deleteArmyResult(id) {
    setArmyResults((current) => {
      const result = current.find((item) => item.id === id);
      if (result?.markerId) removeArmyGeneratedMarkersForResult(result);
      return current.filter((item) => item.id !== id);
    });
    setLosVersion((v) => v + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus("Army result removed.");
  }

  function createLosMarkersFromArmy() {
    const accepted = armyResults.filter((result) => result.accepted && !result.markerId);
    if (!accepted.length) {
      setStatus("No accepted army-list entries need LOS markers.");
      return;
    }
    let first = null;
    let createdCount = 0;
    setArmyResults((current) => current.map((result, index) => {
      if (!result.accepted || result.markerId) return result;
      const markerIds = createLosMarkersForArmyResult(result, index);
      layoutArmyGeneratedStaging();
      if (!first) first = state.current.losMarkers.find((marker) => marker.id === markerIds[0]);
      createdCount += markerIds.length;
      return { ...result, markerIds, markerId: markerIds[0] || null };
    }));
    if (!first) return;
    setActiveLosId(first.id);
    setActiveUnitSlot(null);
    setLosName(first.name);
    setBaseShape(first.baseShape);
    setBaseLengthMm(first.baseLengthMm);
    setBaseWidthMm(first.baseWidthMm);
    setBaseRotation(0);
    setRangeInches(first.rangeInches ?? "unlimited");
    setMarkerGroupingMode("model");
    setUnitModelCount(1);
    setSelectedUnitSlot(1);
    state.current.light = { x: first.x, y: first.y };
    setLosVersion((v) => v + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`Created ${createdCount} LOS marker${createdCount === 1 ? "" : "s"} from army list with LOS disabled.`);
  }

  function clearArmyGeneratedLosMarkers() {
    const before = state.current.losMarkers.length;
    const remaining = state.current.losMarkers.filter((marker) => !String(marker.id || "").startsWith("army-los-"));

    if (remaining.length === before) {
      setStatus("No army-generated LOS markers to remove.");
      return;
    }

    state.current.losMarkers = remaining;
    const remainingIds = new Set(remaining.map((marker) => marker.id));
    state.current.stickyRulers = state.current.stickyRulers.filter((ruler) => (
      (ruler.from.type !== "los" || remainingIds.has(ruler.from.id)) &&
      (ruler.to.type !== "los" || remainingIds.has(ruler.to.id))
    ));
    const activeStillExists = remaining.some((marker) => marker.id === activeLosId);
    const nextActive = activeStillExists ? getActiveLosMarker() : remaining[0];

    setActiveLosId(nextActive?.id || "");
    if (nextActive) {
      setLosName(nextActive.name);
      setBaseShape(nextActive.baseShape);
      setBaseLengthMm(nextActive.baseLengthMm);
      setBaseWidthMm(nextActive.baseWidthMm);
      setBaseRotation(nextActive.baseRotation || 0);
      setRangeInches(nextActive.rangeInches ?? "unlimited");
      setMarkerGroupingMode(nextActive.groupingMode || "model");
      setUnitModelCount(getMarkerTypeMembers(nextActive).length || 1);
      setSelectedUnitSlot(nextActive.unitSlot || 1);
      state.current.light = { x: nextActive.x, y: nextActive.y };
    } else {
      setRangeInches("unlimited");
      setMarkerGroupingMode("model");
      setUnitModelCount(1);
      setSelectedUnitSlot(1);
      state.current.light = { x: state.current.W / 2, y: state.current.H / 2 };
    }
    setLosVersion((v) => v + 1);
    setArmyResults([]);
    setArmyListText("");
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`Removed ${before - remaining.length} army-generated LOS marker${before - remaining.length === 1 ? "" : "s"}.`);
  }

  function screenPos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function screenToWorld(e) {
    const p = screenPos(e);
    const cam = state.current.camera;
    return { x: (p.x - cam.x) / cam.scale, y: (p.y - cam.y) / cam.scale };
  }

  function normalizedSelectionRect(start, current) {
    return {
      left: Math.min(start.x, current.x),
      right: Math.max(start.x, current.x),
      top: Math.min(start.y, current.y),
      bottom: Math.max(start.y, current.y),
    };
  }

  function markerIntersectsSelection(marker, rect) {
    const base = getBaseRadii(state.current.camera.scale, marker);
    const rotation = marker.baseRotation || 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const halfWidth = Math.abs(base.rx * cos) + Math.abs(base.ry * sin);
    const halfHeight = Math.abs(base.rx * sin) + Math.abs(base.ry * cos);
    return marker.x + halfWidth >= rect.left
      && marker.x - halfWidth <= rect.right
      && marker.y + halfHeight >= rect.top
      && marker.y - halfHeight <= rect.bottom;
  }

  function selectedMarkers() {
    const selectedIds = multiSelectedMarkerIdsRef.current;
    return state.current.losMarkers.filter((marker) => selectedIds.has(marker.id));
  }

  function selectedMovementMeasureGroups() {
    const groups = [];
    const unitSlots = new Set();
    selectedMarkers().forEach((marker) => {
      if (marker.groupingMode === "unit") {
        if (unitSlots.has(marker.unitSlot)) return;
        unitSlots.add(marker.unitSlot);
        groups.push({ kind: "unit", slot: marker.unitSlot, start: unitCoherencyCircleCenter(getUnitMembers(marker.unitSlot)) });
      } else {
        groups.push({ kind: "model", id: marker.id, start: { x: marker.x, y: marker.y } });
      }
    });
    return groups;
  }

  function completeMarqueeSelection() {
    const marquee = marqueeSelectionRef.current;
    marqueeSelectionRef.current = null;
    if (!marquee) return;
    const rect = normalizedSelectionRect(marquee.start, marquee.current);
    const selectedIds = new Set();
    state.current.losMarkers.forEach((marker) => {
      if (!markerIntersectsSelection(marker, rect)) return;
      if (marker.groupingMode === "unit") {
        getUnitMembers(marker.unitSlot).forEach((member) => selectedIds.add(member.id));
      } else {
        selectedIds.add(marker.id);
      }
    });
    multiSelectedMarkerIdsRef.current = selectedIds;
    const groupCount = selectedMovementMeasureGroups().length;
    setStatus(groupCount
      ? `${groupCount} model${groupCount === 1 ? "/unit selected" : "s/units selected"}. Drag any selected model to move them together.`
      : "No models or units selected.");
    draw();
  }

  function isDeploymentMode() {
    return mode === "deployHome" || mode === "deployEnemy";
  }

  function activeDeploymentDraft() {
    return mode === "deployEnemy" ? state.current.enemyDeploymentDraft : state.current.deploymentDraft;
  }

  function setActiveDeploymentPreview(point) {
    if (mode === "deployEnemy") state.current.enemyDeploymentPreview = point;
    else state.current.deploymentPreview = point;
  }

  function pointerDown(e) {
    const p = screenToWorld(e);

    if (e.button === 2) {
      e.preventDefault();
      marqueeSelectionRef.current = { start: p, current: p };
      canvasRef.current?.setPointerCapture?.(e.pointerId);
      setStatus("Drag the selection box over models or units, then release.");
      draw();
      return;
    }

    const wallFloorChoice = selectedLayoutWallId ? findLayoutWallFloorButton(p) : null;
    if (wallFloorChoice) {
      setSelectedWallFloorState(wallFloorChoice);
      return;
    }
    const terrainRelationChoice = layoutEditMode && selectedLayoutTerrainId
      ? findLayoutTerrainRelationButton(p)
      : null;
    if (terrainRelationChoice !== null) {
      setSelectedTerrainFootprintRelation(terrainRelationChoice);
      return;
    }
    if (selectedLayoutWallId && (mode === "denseTF" || mode === "lightTF")) {
      setSelectedLayoutWallId(null);
    }

    const canSelectLayoutWall = mode !== "denseTF" && mode !== "lightTF" && mode !== "block"
      && mode !== "wall" && mode !== "erase" && !isDeploymentMode();

    if (selectiveFootprintRemoveMode) {
      const terrainIndex = findLayoutTerrainAtPoint(p);
      if (terrainIndex >= 0) {
        const terrain = state.current.layoutTerrain[terrainIndex];
        const removedTerrain = removeLayoutTerrainById(terrain.id);
        if (removedTerrain) {
          const definition = TERRAIN_FOOTPRINTS[removedTerrain.shape];
          setSelectedLayoutWallId(null);
          setSelectedLayoutFeatureId(null);
          setSelectedLayoutObjectiveId(null);
          setStatus(`${definition?.label || "Terrain"} footprint removed.`);
          draw();
          scheduleBrowserSave();
        }
      } else {
        setStatus("Selective footprint removal is on. Click a GW terrain footprint to remove it.");
      }
      return;
    }

    const clickedDeploymentLabel = layoutEditMode && canSelectLayoutWall ? findDeploymentLabelAtPoint(p) : null;
    if (clickedDeploymentLabel) {
      objectDragRef.current = { type: "deploymentLabel", kind: clickedDeploymentLabel };
      setSelectedLayoutFeatureId(null);
      setSelectedLayoutWallId(null);
      setSelectedLayoutTerrainId(null);
      setSelectedLayoutObjectiveId(null);
      setStatus(`${clickedDeploymentLabel === "enemy" ? "Enemy" : "Home"} deploy line label selected. Drag it to reposition both deploy labels.`);
      draw();
      return;
    }
    const clickedLayoutFeatureIndex = layoutEditMode && canSelectLayoutWall
      ? findLayoutFeatureAtPoint(p)
      : -1;
    if (clickedLayoutFeatureIndex >= 0) {
      const feature = state.current.layoutFeaturePieces[clickedLayoutFeatureIndex];
      if (layoutEditMode && layoutLinkMode) {
        selectFeatureForLink(feature);
        return;
      }
      setSelectedLayoutFeatureId(feature.id);
      setSelectedLayoutWallId(null);
      setSelectedLayoutTerrainId(null);
      setSelectedLayoutObjectiveId(null);
      if (layoutEditMode) {
        objectDragRef.current = { type: "layoutFeature", index: clickedLayoutFeatureIndex, startPoint: p, startX: feature.x, startY: feature.y };
      }
      setStatus(`${LAYOUT_FEATURE_TYPES[feature.type]?.label || "Terrain feature"} selected.`);
      draw();
      return;
    }
    const clickedLayoutWallIndex = canSelectLayoutWall ? findLayoutWallAtPoint(p) : -1;
    if (clickedLayoutWallIndex >= 0) {
      const wall = state.current.layoutWalls[clickedLayoutWallIndex];
      if (layoutEditMode && layoutLinkMode) {
        selectWallForLink(wall);
        return;
      }
      setSelectedLayoutWallId(wall.id);
      setSelectedLayoutFeatureId(null);
      setSelectedLayoutTerrainId(null);
      setSelectedLayoutObjectiveId(null);
      if (layoutEditMode) {
        objectDragRef.current = { type: "layoutWall", index: clickedLayoutWallIndex, startPoint: p, startX: wall.x, startY: wall.y };
      }
      setStatus(`${wall.type} wall selected. Choose Ground or 1st Floor.`);
      draw();
      return;
    }

    if (selectedLayoutWallId) setSelectedLayoutWallId(null);
    if (selectedLayoutFeatureId) setSelectedLayoutFeatureId(null);

    if (layoutEditMode && showObjectives && mode !== "denseTF" && mode !== "lightTF") {
      const objectiveIndex = findLayoutObjectiveAtPoint(p);
      if (objectiveIndex >= 0) {
        const objective = state.current.layoutObjectives[objectiveIndex];
        setSelectedLayoutObjectiveId(objective.id);
        setSelectedLayoutTerrainId(null);
        setSelectedLayoutWallId(null);
        setSelectedLayoutFeatureId(null);
        if (layoutEditMode) objectDragRef.current = { type: "layoutObjective", index: objectiveIndex };
        setStatus("Objective marker selected. Drag it to reposition it.");
        draw();
        return;
      }
    }

    if (layoutEditMode && mode !== "denseTF" && mode !== "lightTF") {
      if (layoutLinkMode) {
        const linkTerrainIndex = findLayoutTerrainAtPoint(p);
        if (linkTerrainIndex >= 0) {
          selectTerrainForLink(state.current.layoutTerrain[linkTerrainIndex]);
        } else {
          setStatus("Link mode: click a terrain footprint.");
        }
        return;
      }
      const handle = findSelectedLayoutTerrainHandle(p);
      if (handle) {
        setSelectedLayoutWallId(null);
        objectDragRef.current = { type: "layoutTerrainPoint", ...handle };
        setStatus("Drag this outline point to reshape the terrain footprint.");
        draw();
        return;
      }
      const terrainIndex = findLayoutTerrainAtPoint(p);
      if (terrainIndex >= 0) {
        const terrain = state.current.layoutTerrain[terrainIndex];
        setSelectedLayoutTerrainId(terrain.id);
        setSelectedLayoutWallId(null);
        setSelectedLayoutObjectiveId(null);
        objectDragRef.current = { type: "layoutTerrain", index: terrainIndex, startPoint: p, startX: terrain.x, startY: terrain.y };
        setStatus("Terrain selected. Drag to move it, use the mouse wheel to rotate it, or use the Layout controls.");
        draw();
        return;
      }
      if (selectedLayoutTerrainId || selectedLayoutWallId || selectedLayoutFeatureId || selectedLayoutObjectiveId) {
        setSelectedLayoutTerrainId(null);
        setSelectedLayoutWallId(null);
        setSelectedLayoutFeatureId(null);
        setSelectedLayoutObjectiveId(null);
        setLayoutTerrainRelationVersion((version) => version + 1);
        draw();
      }
    }

    const deploymentSideChoice = mode !== "erase" ? findDeploymentSideArrow(p) : null;
    if (deploymentSideChoice) {
      if (deploymentSideChoice.kind === "enemy") state.current.enemyDeploymentNoMansSide = deploymentSideChoice.side;
      else state.current.deploymentNoMansSide = deploymentSideChoice.side;
      setStatus(`${deploymentSideChoice.kind === "enemy" ? "Enemy" : "Home"} deployment no man's land side selected.`);
      draw();
      scheduleBrowserSave();
      return;
    }

    const visibilityButton = findLosVisibilityButton(p);
    if (visibilityButton && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "denseTF" && mode !== "lightTF" && mode !== "scale" && mode !== "ruler" && mode !== "stickyRuler" && !isDeploymentMode()) {
      updateLosMarkerById(visibilityButton.id, { visible: visibilityButton.visible });
      const marker = state.current.losMarkers.find((m) => m.id === visibilityButton.id);
      setStatus(`${marker?.name || "LOS"} LOS ${visibilityButton.visible ? "shown" : "hidden"}.`);
      return;
    }

    const draggable = findDraggableObject(p);
    if (draggable && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "denseTF" && mode !== "lightTF" && mode !== "scale" && mode !== "ruler" && mode !== "stickyRuler") {
      const draggedMarker = draggable.type === "light" ? state.current.losMarkers.find((marker) => marker.id === draggable.id) : null;
      const moveMultiSelection = draggable.type === "light"
        && multiSelectedMarkerIdsRef.current.has(draggable.id)
        && multiSelectedMarkerIdsRef.current.size > 1;
      if (draggable.type === "light") {
        losWorkerRef.current?.postMessage({ type: "cancelVisibility" });
        losPreviewWorkerRef.current?.postMessage({ type: "cancelVisibility" });
        enemyLosWorkerRef.current?.postMessage({ type: "cancelEnemyLos" });
      }
      const moveSelectedUnit = draggedMarker?.groupingMode === "unit" && draggedMarker.unitSlot === activeUnitSlot;
      if (draggable.type === "light" && !moveSelectedUnit && !moveMultiSelection) {
        multiSelectedMarkerIdsRef.current.clear();
        selectLosMarker(draggable.id);
      }
      objectDragRef.current = moveMultiSelection
        ? {
          ...draggable,
          multiSelection: true,
          startPoint: p,
          memberStarts: selectedMarkers().map((member) => ({ id: member.id, x: member.x, y: member.y })),
          movementMeasureGroups: selectedMovementMeasureGroups(),
          lastLosUpdate: 0,
          previewMemberIndex: 0,
        }
        : moveSelectedUnit
        ? {
          ...draggable,
          unitSlot: activeUnitSlot,
          startPoint: p,
          memberStarts: getUnitMembers(activeUnitSlot).map((member) => ({ id: member.id, x: member.x, y: member.y })),
          movementMeasureStart: unitCoherencyCircleCenter(getUnitMembers(activeUnitSlot)),
          lastLosUpdate: 0,
          previewMemberIndex: 0,
        }
        : {
          ...draggable,
          lastLosUpdate: 0,
          movementMeasureStart: draggable.type === "light"
            ? { x: draggedMarker.x, y: draggedMarker.y }
            : null,
        };
      if (draggable.type === "light") {
        const activeMarkerIds = moveMultiSelection
          ? selectedMarkers().filter((marker) => marker.visible !== false).map((marker) => marker.id)
          : moveSelectedUnit
          ? getUnitMembers(activeUnitSlot).filter((marker) => marker.visible !== false).map((marker) => marker.id)
          : [draggable.id];
        rebuildCombinedVisibility(true, activeMarkerIds);
        draw();
      }
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      const active = draggable.type === "light" ? state.current.losMarkers.find((m) => m.id === draggable.id) : null;
      setStatus(moveMultiSelection
        ? `Moving ${selectedMovementMeasureGroups().length} selected models/units. Release to drop.`
        : moveSelectedUnit
        ? `Moving ${getUnitDisplayName(activeUnitSlot)}. Release to drop.`
        : draggable.type === "light" ? `Moving ${active?.name || "LOS marker"}. Release to drop.` : "Moving enemy. Release to drop.");
      return;
    }

    if (mode === "stickyRuler") {
      if (!pixelsPerInch) {
        setStatus("Set the map scale before using a sticky ruler.");
        return;
      }
      const target = findStickyRulerTarget(p);
      if (!target) {
        setStatus(state.current.stickyRulerStart ? "Choose a footprint, enemy, or different LOS marker." : "Choose a LOS marker or enemy first.");
        return;
      }
      if (!state.current.stickyRulerStart) {
        if (target.type === "footprint") {
          setStatus("Start from a LOS marker or enemy, then choose the footprint.");
          return;
        }
        state.current.stickyRulerStart = target;
        setStatus(`${target.type === "enemy" ? "Enemy" : "LOS marker"} selected. Now choose a footprint${target.type === "los" ? ", enemy, or another LOS marker" : ""}.`);
        draw();
        return;
      }
      if (sameStickyTarget(state.current.stickyRulerStart, target)) {
        setStatus("Choose a different target.");
        return;
      }
      if (state.current.stickyRulerStart.type === "unit" && target.type === "los") {
        const targetMarker = state.current.losMarkers.find((marker) => marker.id === target.id);
        if (targetMarker?.groupingMode === "unit" && String(targetMarker.unitSlot) === state.current.stickyRulerStart.id) {
          setStatus("Choose a target outside the selected unit.");
          return;
        }
      }
      if (state.current.stickyRulerStart.type === "enemy" && target.type !== "footprint") {
        setStatus("An enemy sticky ruler must connect to a footprint.");
        return;
      }
      if (target.type === "footprint" && state.current.stickyRulerStart.type === "footprint") {
        setStatus("Footprints cannot be connected to each other.");
        return;
      }
      state.current.stickyRulers.push({
        id: `sticky-ruler-${Date.now()}`,
        from: state.current.stickyRulerStart,
        to: target,
      });
      state.current.stickyRulerStart = null;
      setLosVersion((version) => version + 1);
      setStatus("Sticky ruler added. Choose another LOS marker to start the next one.");
      draw();
      scheduleBrowserSave();
      return;
    }

    if (mode === "pan") {
      panningRef.current = true;
      panLastRef.current = screenPos(e);
      setStatus("Panning map. Release to stop.");
      return;
    }

    if (isDeploymentMode()) {
      const draft = activeDeploymentDraft();
      draft.push(p);
      setActiveDeploymentPreview(p);
      const label = mode === "deployEnemy" ? "Enemy deployment LOS" : "Home deployment LOS";
      setStatus(draft.length === 1
        ? `${label} started. Click to add bends/corners; double-click to finish.`
        : `${label} point ${draft.length} added. Double-click to finish.`);
      draw();
      return;
    }

    if (mode === "scale") {
      state.current.scaleStart = p;
      state.current.scalePreview = { a: p, b: p };
      setStatus(`Drag a known ${scaleInches}" distance, then release to set scale.`);
      draw();
      return;
    }

    if (mode === "ruler") {
      if (!pixelsPerInch) {
        setStatus("Set the map scale before using the ruler.");
        return;
      }
      state.current.rulerStart = p;
      state.current.rulerPreview = { a: p, b: p };
      setStatus("Drag between two points to add a ruler line.");
      draw();
      return;
    }

    if (mode === "light") {
      draggingRef.current = true;
      updateActiveLosMarker({ x: p.x, y: p.y });
    } else if (mode === "block" || mode === "denseTF" || mode === "lightTF") {
      const poly = state.current.currentPoly;
      if (poly.length >= 3 && dist(p, poly[0]) < 24 / state.current.camera.scale) {
        if (mode === "block") {
          state.current.blockers.push([...poly]);
          state.current.blockerIds.push(`footprint-${Date.now()}`);
        } else {
          state.current.layoutTerrainFeatures.push({
            id: `layout-${mode}-${Date.now()}`,
            kind: mode === "denseTF" ? "dense" : "light",
            points: poly.map((point) => worldToBattlefieldPoint(point)),
          });
        }
        state.current.currentPoly = [];
        setStatus(mode === "block" ? "Footprint added. White = clear, yellow = one footprint wall crossed, dark = blocked." : `${mode === "denseTF" ? "Dense" : "Light"} TF added.`);
      } else {
        poly.push(p);
        setStatus(`${mode === "block" ? "Footprint" : mode === "denseTF" ? "Dense TF" : "Light TF"} point ${poly.length}. Tap near the first point to close.`);
      }
      if (mode === "block") updateVisibility();
      draw();
      scheduleBrowserSave();
    } else if (mode === "wall") {
      const path = state.current.wallPath;
      path.push(p);
      state.current.wallPreview = p;
      setStatus(path.length === 1 ? "Wall started. Click to add corners; double-click to finish." : `Wall corner ${path.length} placed. Click to change direction, double-click to finish.`);
      updateVisibility();
      draw();
      scheduleBrowserSave();
    } else if (mode === "enemy") {
      state.current.enemies.push({ id: `enemy-${Date.now()}`, x: p.x, y: p.y });
      updateEnemyLosStates(false);
      setStatus("Enemy added. Red = clear, yellow = through one footprint wall, grey = blocked.");
      draw();
      scheduleBrowserSave();
    } else if (mode === "erase") {
      const rulerIndex = state.current.rulers.findIndex((ruler) => pointNearSegment(p, ruler.a, ruler.b, 10 / state.current.camera.scale));
      const stickyRulerIndex = state.current.stickyRulers.findIndex((ruler) => {
        const geometry = getStickyRulerGeometry(ruler);
        return geometry && pointNearSegment(p, geometry.a, geometry.b, 10 / state.current.camera.scale);
      });
      const enemyIndex = state.current.enemies.findIndex((enemy) => dist(p, enemy) < 18 / state.current.camera.scale);
      const homeDeployPath = state.current.deploymentPath?.length >= 2
        ? state.current.deploymentPath
        : (state.current.deploymentLine ? [state.current.deploymentLine.a, state.current.deploymentLine.b] : []);
      const enemyDeployPath = state.current.enemyDeploymentPath?.length >= 2
        ? state.current.enemyDeploymentPath
        : (state.current.enemyDeploymentLine ? [state.current.enemyDeploymentLine.a, state.current.enemyDeploymentLine.b] : []);
      const homeDeployHit = pointNearPath(p, homeDeployPath, 12 / state.current.camera.scale);
      const enemyDeployHit = pointNearPath(p, enemyDeployPath, 12 / state.current.camera.scale);
      if (rulerIndex >= 0) {
        state.current.rulers.splice(rulerIndex, 1);
        setStatus("Ruler erased.");
      } else if (stickyRulerIndex >= 0) {
        state.current.stickyRulers.splice(stickyRulerIndex, 1);
        setStatus("Sticky ruler erased.");
      } else if (enemyIndex >= 0) {
        const [removedEnemy] = state.current.enemies.splice(enemyIndex, 1);
        removeStickyRulersForTarget({ type: "enemy", id: removedEnemy.id });
        setStatus("Enemy erased.");
      } else if (homeDeployHit) {
        if (state.current.activeLayoutKey) {
          restorePresetDeploymentLines();
          setStatus("Official home deployment line restored. Preset deployment lines cannot be erased with Erase.");
          return;
        }
        clearDeploymentLOS("home");
        setStatus("Home deployment LOS erased.");
        return;
      } else if (enemyDeployHit) {
        if (state.current.activeLayoutKey) {
          restorePresetDeploymentLines();
          setStatus("Official enemy deployment line restored. Preset deployment lines cannot be erased with Erase.");
          return;
        }
        clearDeploymentLOS("enemy");
        setStatus("Enemy deployment LOS erased.");
        return;
      } else {
        const objectiveIndex = findLayoutObjectiveAtPoint(p);
        if (objectiveIndex >= 0) {
          state.current.layoutObjectives.splice(objectiveIndex, 1);
          setSelectedLayoutObjectiveId(null);
          setStatus("Objective marker erased.");
          draw();
          scheduleBrowserSave();
          return;
        }
        const layoutTerrainIndex = layoutEditMode ? findLayoutTerrainAtPoint(p) : -1;
        if (layoutTerrainIndex >= 0) {
          const terrain = state.current.layoutTerrain[layoutTerrainIndex];
          const removedTerrain = removeLayoutTerrainById(terrain.id);
          if (removedTerrain) {
            const definition = TERRAIN_FOOTPRINTS[removedTerrain.shape];
            setStatus(`${definition?.label || "Terrain"} footprint erased.`);
            draw();
            scheduleBrowserSave();
            return;
          }
        }
        const layoutWallIndex = findLayoutWallAtPoint(p);
        if (layoutWallIndex >= 0) {
          const [removedWall] = state.current.layoutWalls.splice(layoutWallIndex, 1);
          state.current.layoutWallLinks = state.current.layoutWallLinks.filter((link) => !link.includes(removedWall.id));
          setSelectedLayoutWallId(null);
          rebuildLayoutWallGeometry();
          updateVisibility();
          setStatus(`${removedWall.type} wall erased.`);
          draw();
          scheduleBrowserSave();
          return;
        }
        const featurePieceIndex = state.current.layoutFeaturePieces.findIndex((feature) => (
          terrainFeatureKindVisible(LAYOUT_FEATURE_TYPES[feature.type]?.kind || "light")
          && pointInPoly(p, layoutFeaturePolygonToWorld(feature))
        ));
        if (featurePieceIndex >= 0) {
          state.current.layoutFeaturePieces.splice(featurePieceIndex, 1);
          setSelectedLayoutFeatureId(null);
          setStatus("Reusable terrain feature erased.");
          draw();
          scheduleBrowserSave();
          return;
        }
        const decorativeIndex = state.current.layoutTerrainFeatures.findIndex((feature) => (
          terrainFeatureKindVisible(feature.kind)
          && pointInPoly(p, feature.points.map((point) => battlefieldPoint(point.x, point.y)))
        ));
        if (decorativeIndex >= 0) {
          state.current.layoutTerrainFeatures.splice(decorativeIndex, 1);
          setStatus("Decorative terrain feature erased.");
          draw();
          scheduleBrowserSave();
          return;
        }
        const wallIndex = state.current.walls.findIndex((wall) => pointNearSegment(p, wall.a, wall.b, 12 / state.current.camera.scale));
        if (wallIndex >= 0) {
          state.current.walls.splice(wallIndex, 1);
          setStatus("Wall erased.");
        } else {
          const blockerIndex = state.current.blockers.findIndex((poly) => pointInPoly(p, poly));
          if (blockerIndex >= 0) {
            const removedId = state.current.blockerIds[blockerIndex];
            state.current.blockers.splice(blockerIndex, 1);
            state.current.blockerIds.splice(blockerIndex, 1);
            removeStickyRulersForTarget({ type: "footprint", id: removedId });
            setStatus("Footprint erased.");
          }
        }
      }
      updateVisibility();
      draw();
      scheduleBrowserSave();
    }
  }

  function pointerMove(e) {
    const p = screenToWorld(e);

    if (marqueeSelectionRef.current) {
      marqueeSelectionRef.current.current = p;
      draw();
      return;
    }

    if (objectDragRef.current) {
      pendingDragPointRef.current = p;
      if (!dragFrameRef.current) {
        dragFrameRef.current = requestAnimationFrame(() => {
          dragFrameRef.current = null;
          applyPendingObjectDrag();
        });
      }
      return;
    }

    updateHoverCursor(p);

    if (mode === "pan" && panningRef.current) {
      const now = screenPos(e);
      const last = panLastRef.current || now;
      state.current.camera.x += now.x - last.x;
      state.current.camera.y += now.y - last.y;
      panLastRef.current = now;
      draw();
      return;
    }

    if (isDeploymentMode() && activeDeploymentDraft().length) {
      setActiveDeploymentPreview(p);
      draw();
    } else if (mode === "scale" && state.current.scaleStart) {
      state.current.scalePreview = { a: state.current.scaleStart, b: p };
      draw();
    } else if (mode === "ruler" && state.current.rulerStart) {
      state.current.rulerPreview = { a: state.current.rulerStart, b: p };
      draw();
    } else if (mode === "light" && draggingRef.current) {
      updateActiveLosMarker({ x: p.x, y: p.y });
    } else if (mode === "wall" && state.current.wallPath.length) {
      state.current.wallPreview = p;
      draw();
    }
  }

  function shouldRunInteractiveLos(dragged, point) {
    if (!dragged || !point) return true;
    const now = performance.now();
    const lastPoint = dragged.lastLosPoint;
    const moved = lastPoint ? dist(point, lastPoint) : Infinity;
    const inch = pixelsPerInch || (state.current.fit.w / boardWidthInches()) || 0;
    const smallMoveThreshold = inch ? inch * 0.1 : 7;
    const forceMoveThreshold = inch ? inch * 0.25 : 16;
    const elapsed = now - (dragged.lastLosUpdate || 0);
    if (interactivePreviewInFlightRef.current) {
      if (moved < smallMoveThreshold) return false;
      dragged.lastLosPoint = { x: point.x, y: point.y };
      return true;
    }
    const shouldRun = !dragged.lastLosUpdate || elapsed >= 24 || moved >= forceMoveThreshold;
    if (!shouldRun && moved < smallMoveThreshold) return false;
    if (!shouldRun) return false;
    dragged.lastLosUpdate = now;
    dragged.lastLosPoint = { x: point.x, y: point.y };
    return true;
  }

  function startNextInteractivePreview() {
    const pending = pendingInteractivePreviewRef.current;
    if (!pending || interactivePreviewInFlightRef.current || objectDragRef.current?.type !== "light") return;
    pendingInteractivePreviewRef.current = null;
    interactivePreviewInFlightRef.current = true;
    const requested = requestDetailedMarkerVisibilityBatch([pending.marker], {
      single: true,
      interactive: true,
      preview: true,
      forceRequest: true,
      activeMarkerIds: pending.activeMarkerIds,
      dragRevision: pending.dragRevision,
    });
    if (!requested) interactivePreviewInFlightRef.current = false;
  }

  function queueInteractivePreview(marker, activeMarkerIds, dragRevision = losDragRevisionRef.current) {
    if (!marker) return;
    pendingInteractivePreviewRef.current = { marker, activeMarkerIds, dragRevision };
    startNextInteractivePreview();
  }

  function finishInteractivePreview(request, partial) {
    if (!request?.preview || partial) return;
    interactivePreviewInFlightRef.current = false;
    if (objectDragRef.current?.type === "light") startNextInteractivePreview();
  }

  function cancelInteractivePreview() {
    pendingInteractivePreviewRef.current = null;
    interactivePreviewInFlightRef.current = false;
    losPreviewWorkerRef.current?.postMessage({ type: "cancelVisibility" });
    for (const [markerId, request] of latestLosWorkerRequestsRef.current.entries()) {
      if (request.preview) latestLosWorkerRequestsRef.current.delete(markerId);
    }
  }

  function collapseInteractivePreviewVisibility(visibility) {
    return {
      clearZones: [...(visibility?.clearZones || [])],
      oneWallZones: [],
    };
  }

  function markerPreviewPerimeterPoints(marker) {
    const { rx, ry } = getBaseRadii(1, marker);
    const points = [];
    if (marker.baseShape === "rectangle") {
      [
        { x: -rx, y: -ry },
        { x: 0, y: -ry },
        { x: rx, y: -ry },
        { x: rx, y: 0 },
        { x: rx, y: ry },
        { x: 0, y: ry },
        { x: -rx, y: ry },
        { x: -rx, y: 0 },
      ].forEach((local) => {
        const rotated = rotatePoint(local.x, local.y, marker.baseRotation || 0);
        points.push({ x: marker.x + rotated.x, y: marker.y + rotated.y });
      });
      return points;
    }
    for (let index = 0; index < 20; index += 1) {
      const angle = index / 20 * Math.PI * 2;
      const rotated = rotatePoint(Math.cos(angle) * rx, Math.sin(angle) * ry, marker.baseRotation || 0);
      points.push({ x: marker.x + rotated.x, y: marker.y + rotated.y });
    }
    return points;
  }

  function radialUnitPreviewOutline(points, center) {
    if (points.length <= 3) return points;
    const bins = new Array(36).fill(null);
    points.forEach((point) => {
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
      const index = Math.floor(normalized / (Math.PI * 2) * bins.length) % bins.length;
      const radius = dist(center, point);
      if (!bins[index] || radius > bins[index].radius) bins[index] = { point, radius };
    });
    return bins.filter(Boolean).map((entry) => entry.point);
  }

  function interactiveUnitPreviewMarker(markers, preferredMarkerId) {
    if (!markers.length) return null;
    const preferred = markers.find((marker) => marker.id === preferredMarkerId) || markers[0];
    const center = markers.reduce((total, marker) => ({ x: total.x + marker.x, y: total.y + marker.y }), { x: 0, y: 0 });
    center.x /= markers.length;
    center.y /= markers.length;
    const previewOutline = radialUnitPreviewOutline(markers.flatMap(markerPreviewPerimeterPoints), center);
    return { ...preferred, x: center.x, y: center.y, previewOutline };
  }

  function applyPendingObjectDrag() {
    const p = pendingDragPointRef.current;
    const dragged = objectDragRef.current;
    if (!p || !dragged) return;
    pendingDragPointRef.current = null;

    if (dragged.type === "light") {
      const dragRevision = ++losDragRevisionRef.current;
      latestEnemyLosWorkerRequestRef.current = null;
      if (pendingEnemyLosTimerRef.current) {
        window.clearTimeout(pendingEnemyLosTimerRef.current);
        pendingEnemyLosTimerRef.current = null;
      }
      if (dragged.multiSelection && dragged.startPoint && dragged.memberStarts) {
        const dx = p.x - dragged.startPoint.x;
        const dy = p.y - dragged.startPoint.y;
        dragged.memberStarts.forEach((start) => {
          const marker = state.current.losMarkers.find((item) => item.id === start.id);
          if (!marker) return;
          marker.x = start.x + dx;
          marker.y = start.y + dy;
          if (marker.visible === false) state.current.losVisibilityCache.delete(marker.id);
          if (marker.id === activeLosId) state.current.light = { x: marker.x, y: marker.y };
        });
        if (shouldRunInteractiveLos(dragged, p)) {
          const visibleMembers = selectedMarkers().filter((marker) => marker.visible !== false);
          const activeMarkerIds = visibleMembers.map((marker) => marker.id);
          const previewMarker = interactiveUnitPreviewMarker(visibleMembers, dragged.id);
          queueInteractivePreview(previewMarker, activeMarkerIds, dragRevision);
        }
      } else if (dragged.unitSlot && dragged.startPoint && dragged.memberStarts) {
        const dx = p.x - dragged.startPoint.x;
        const dy = p.y - dragged.startPoint.y;
        dragged.memberStarts.forEach((start) => {
          const marker = state.current.losMarkers.find((item) => item.id === start.id);
          if (!marker) return;
          marker.x = start.x + dx;
          marker.y = start.y + dy;
          if (marker.visible === false) state.current.losVisibilityCache.delete(marker.id);
          if (marker.id === activeLosId) state.current.light = { x: marker.x, y: marker.y };
        });
        if (shouldRunInteractiveLos(dragged, p)) {
          const visibleMembers = getUnitMembers(dragged.unitSlot).filter((marker) => marker.visible !== false);
          const activeMarkerIds = visibleMembers.length ? visibleMembers.map((marker) => marker.id) : [dragged.id];
          const previewMarker = interactiveUnitPreviewMarker(visibleMembers, dragged.id);
          queueInteractivePreview(previewMarker, activeMarkerIds, dragRevision);
        }
      } else {
        const markerIndex = state.current.losMarkers.findIndex((marker) => marker.id === dragged.id);
        if (markerIndex >= 0) {
          const marker = state.current.losMarkers[markerIndex];
          state.current.losMarkers[markerIndex] = { ...marker, x: p.x, y: p.y };
          if (marker.visible === false) state.current.losVisibilityCache.delete(marker.id);
          if (marker.id === activeLosId) state.current.light = { x: p.x, y: p.y };
          if (shouldRunInteractiveLos(dragged, p)) {
            queueInteractivePreview(state.current.losMarkers[markerIndex], [dragged.id], dragRevision);
          }
        }
      }
    } else if (dragged.type === "enemy") {
      const enemy = state.current.enemies[dragged.index];
      if (enemy) {
        state.current.enemies[dragged.index] = { ...enemy, x: p.x, y: p.y };
        updateEnemyLosStates(true);
      }
    } else if (dragged.type === "layoutTerrain") {
      const terrain = state.current.layoutTerrain[dragged.index];
      const inch = state.current.fit.w / boardWidthInches();
      if (terrain && inch) {
        terrain.x = dragged.startX + (p.x - dragged.startPoint.x) / inch;
        terrain.y = dragged.startY + (p.y - dragged.startPoint.y) / inch;
        syncLinkedLayoutTerrain(terrain);
        rebuildLayoutTerrainGeometry();
      }
    } else if (dragged.type === "layoutWall") {
      const wall = state.current.layoutWalls[dragged.index];
      const inch = state.current.fit.w / boardWidthInches();
      if (wall && inch) {
        wall.x = dragged.startX + (p.x - dragged.startPoint.x) / inch;
        wall.y = dragged.startY + (p.y - dragged.startPoint.y) / inch;
        syncLinkedLayoutWall(wall);
        rebuildLayoutWallGeometry();
      }
    } else if (dragged.type === "layoutFeature") {
      const feature = state.current.layoutFeaturePieces[dragged.index];
      const inch = state.current.fit.w / boardWidthInches();
      if (feature && inch) {
        feature.x = dragged.startX + (p.x - dragged.startPoint.x) / inch;
        feature.y = dragged.startY + (p.y - dragged.startPoint.y) / inch;
        syncLinkedLayoutFeature(feature);
      }
    } else if (dragged.type === "layoutObjective") {
      const objective = state.current.layoutObjectives[dragged.index];
      if (objective) {
        const battlefieldPoint = worldToBattlefieldPoint(p);
        objective.boardX = battlefieldPoint.x;
        objective.boardY = battlefieldPoint.y;
        objective.x = p.x;
        objective.y = p.y;
      }
    } else if (dragged.type === "deploymentLabel") {
      setDeploymentLabelBoardPosition(dragged.kind, worldToBattlefieldPoint(p));
    } else if (dragged.type === "layoutTerrainPoint") {
      const terrain = state.current.layoutTerrain[dragged.index];
      if (terrain?.outer?.[dragged.pointIndex]) {
        terrain.outer[dragged.pointIndex] = worldPointToTerrainLocal(terrain, p);
        rebuildLayoutTerrainGeometry();
      }
    }
    draw();
  }

  function pointerUp(e) {
    if (marqueeSelectionRef.current) {
      completeMarqueeSelection();
      if (e?.pointerId !== undefined) canvasRef.current?.releasePointerCapture?.(e.pointerId);
      return;
    }

    if (objectDragRef.current) {
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      const dragged = objectDragRef.current;
      applyPendingObjectDrag();
      if (dragged.type === "light") losDragRevisionRef.current += 1;
      if (dragged.type === "light") cancelInteractivePreview();
      objectDragRef.current = null;
      pendingDragPointRef.current = null;
      draggingRef.current = false;
      panningRef.current = false;
      panLastRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      if (dragged.type === "light") {
        if (dragged.multiSelection) {
          const visibleMembers = selectedMarkers().filter((marker) => marker.visible !== false);
          if (!requestDetailedMarkerVisibilityBatch(visibleMembers)) {
            const preparedGeometry = getPreparedVisibilityGeometry(state.current.blockers, state.current.walls, state.current.W, state.current.H);
            visibleMembers.forEach((marker) => cacheMarkerVisibility(marker.id, calculateMarkerVisibility(marker, false, preparedGeometry)));
            rebuildCombinedVisibility();
          }
          updateEnemyLosStates(false, { forceImmediate: true });
        }
        else if (dragged.unitSlot) {
          const visibleMembers = getUnitMembers(dragged.unitSlot).filter((marker) => marker.visible !== false);
          if (!requestDetailedMarkerVisibilityBatch(visibleMembers)) {
            const preparedGeometry = getPreparedVisibilityGeometry(state.current.blockers, state.current.walls, state.current.W, state.current.H);
            visibleMembers.forEach((marker) => cacheMarkerVisibility(marker.id, calculateMarkerVisibility(marker, false, preparedGeometry)));
            rebuildCombinedVisibility();
          }
          updateEnemyLosStates(false, { forceImmediate: true });
        }
        else {
          const marker = state.current.losMarkers.find((item) => item.id === dragged.id);
          if (!requestDetailedMarkerVisibility(marker)) updateVisibility(dragged.id, false);
          updateEnemyLosStates(false, { forceImmediate: true });
        }
      }
      if (dragged.type === "layoutObjective") snapObjectiveToTerrainCenter(dragged.index);
      if (dragged.type === "light") setLosVersion((v) => v + 1);
      if (dragged.type === "layoutTerrain" || dragged.type === "layoutTerrainPoint" || dragged.type === "layoutWall") updateVisibility();
      if (dragged.type === "layoutTerrain" || dragged.type === "layoutTerrainPoint") {
        setLayoutTerrainRelationVersion((version) => version + 1);
      }
      scheduleBrowserSave();
    }


    if (mode === "scale" && state.current.scaleStart && state.current.scalePreview) {
      const { a, b } = state.current.scalePreview;
      const lengthPx = dist(a, b);
      if (lengthPx > 5) {
        const ppi = lengthPx / scaleInches;
        setPixelsPerInch(ppi);
        setStatus(`Scale set: ${scaleInches}" = ${Math.round(lengthPx)} px, so 1" = ${ppi.toFixed(1)} px. Switched back to Pan mode.`);
        setMode("pan");
        scheduleBrowserSave();
      } else {
        setStatus("Scale line was too short. Try again.");
      }
      state.current.scaleStart = null;
      state.current.scalePreview = null;
      draw();
    }

    if (mode === "ruler" && state.current.rulerStart && state.current.rulerPreview) {
      const { a, b } = state.current.rulerPreview;
      const lengthPx = dist(a, b);
      if (lengthPx > 5 && pixelsPerInch) {
        state.current.rulers.push({ id: `ruler-${Date.now()}`, a, b });
        setStatus(`Ruler added: ${(lengthPx / pixelsPerInch).toFixed(1)}". Drag again to add another.`);
        scheduleBrowserSave();
      } else {
        setStatus("Ruler line was too short. Try again.");
      }
      state.current.rulerStart = null;
      state.current.rulerPreview = null;
      draw();
    }

    draggingRef.current = false;
    panningRef.current = false;
    panLastRef.current = null;
  }

  function cancelActiveDrag() {
    if (dragFrameRef.current) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    objectDragRef.current = null;
    marqueeSelectionRef.current = null;
    pendingDragPointRef.current = null;
    draggingRef.current = false;
    panningRef.current = false;
    panLastRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }

  function sameStickyTarget(a, b) {
    return Boolean(a && b && a.type === b.type && a.id === b.id);
  }

  function handleCanvasDoubleClick(e) {
    if (mode === "wall") return finishWall(e);
    if (isDeploymentMode()) return finishDeploymentLOS(e);
    if (mode === "block" || mode === "denseTF" || mode === "lightTF") return finishFootprint(e);
    const hit = findDraggableObject(screenToWorld(e));
    if (hit?.type !== "light") return;
    const marker = state.current.losMarkers.find((item) => item.id === hit.id);
    if (!marker || marker.groupingMode !== "unit") return;
    setActiveUnitSlot(null);
    selectLosMarker(marker.id);
    setStatus(`${marker.name} selected individually. Drag it to move this model only.`);
    draw();
  }

  function findStickyRulerTarget(p) {
    const hit = findDraggableObject(p);
    if (hit?.type === "light") return { type: "los", id: hit.id };
    if (hit?.type === "enemy") {
      const enemy = state.current.enemies[hit.index];
      if (enemy && !enemy.id) enemy.id = `enemy-${Date.now()}-${hit.index}`;
      return enemy ? { type: "enemy", id: enemy.id } : null;
    }
    const footprintIndex = state.current.blockers.findIndex((poly) => pointInPoly(p, poly) || pointNearPolygon(p, poly, 12 / state.current.camera.scale));
    if (footprintIndex >= 0) {
      if (!state.current.blockerIds[footprintIndex]) state.current.blockerIds[footprintIndex] = `footprint-${Date.now()}-${footprintIndex}`;
      return { type: "footprint", id: state.current.blockerIds[footprintIndex] };
    }
    return null;
  }

  function resolveStickyTarget(target) {
    if (target?.type === "los") {
      const marker = state.current.losMarkers.find((item) => item.id === target.id);
      if (!marker) return null;
      const radii = getBaseRadii(1, marker);
      return { center: marker, rx: radii.rx, ry: radii.ry, rotation: marker.baseRotation || 0 };
    }
    if (target?.type === "enemy") {
      const enemy = state.current.enemies.find((item) => item.id === target.id);
      if (!enemy) return null;
      const radius = 13 / state.current.camera.scale;
      return { center: enemy, rx: radius, ry: radius, rotation: 0 };
    }
    if (target?.type === "footprint") {
      const index = state.current.blockerIds.indexOf(target.id);
      const poly = state.current.blockers[index];
      if (!poly) return null;
      const groupKey = footprintSurfaceKey(state.current.blockers, index);
      const segments = getFootprintBoundarySegments(state.current.blockers)
        .filter((segment) => segment.groupKey === groupKey);
      return segments.length ? { segments, poly } : { poly };
    }
    if (target?.type === "unit") {
      const members = getUnitMembers(Number(target.id));
      if (!members.length) return null;
      return {
        unitMembers: members.map((marker) => {
          const radii = getBaseRadii(1, marker);
          return { center: marker, rx: radii.rx, ry: radii.ry, rotation: marker.baseRotation || 0 };
        }),
      };
    }
    return null;
  }

  function getStickyRulerGeometry(ruler) {
    const from = resolveStickyTarget(ruler.from);
    const to = resolveStickyTarget(ruler.to);
    if (!from || !to) return null;
    if (from.unitMembers) return closestUnitStickyGeometry(from.unitMembers, to, true);
    if (to.unitMembers) return closestUnitStickyGeometry(to.unitMembers, from, false);
    if (from.segments) return closestSegmentsToEllipsePoints(from.segments, to, true);
    if (to.segments) return closestSegmentsToEllipsePoints(to.segments, from, false);
    if (from.poly) return closestPolygonToEllipsePoints(from.poly, to, true);
    if (to.poly) return closestPolygonToEllipsePoints(to.poly, from, false);
    return closestEllipseEdgePoints(from, to);
  }

  function removeStickyRulersForTarget(target) {
    state.current.stickyRulers = state.current.stickyRulers.filter((ruler) => (
      !sameStickyTarget(ruler.from, target) && !sameStickyTarget(ruler.to, target)
    ));
    if (sameStickyTarget(state.current.stickyRulerStart, target)) state.current.stickyRulerStart = null;
  }

  function findDraggableObject(p) {
    const cam = state.current.camera;
    const enemyHitRadius = 18 / cam.scale;

    for (let i = state.current.enemies.length - 1; i >= 0; i--) {
      if (dist(p, state.current.enemies[i]) <= enemyHitRadius) {
        return { type: "enemy", index: i };
      }
    }

    for (let i = state.current.losMarkers.length - 1; i >= 0; i--) {
      const marker = state.current.losMarkers[i];
      const base = getBaseRadii(cam.scale, marker);
      const offsetX = p.x - marker.x;
      const offsetY = p.y - marker.y;
      const local = rotatePoint(offsetX, offsetY, -(marker.baseRotation || 0));
      if (marker.baseShape === "rectangle") {
        if (Math.abs(local.x) <= base.rx && Math.abs(local.y) <= base.ry) {
          return { type: "light", id: marker.id };
        }
        continue;
      }
      const dx = local.x / base.rx;
      const dy = local.y / base.ry;
      if (dx * dx + dy * dy <= 1) {
        return { type: "light", id: marker.id };
      }
    }

    return null;
  }

  function findLayoutTerrainAtPoint(p) {
    for (let index = state.current.layoutTerrain.length - 1; index >= 0; index--) {
      const terrain = state.current.layoutTerrain[index];
      const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
      const visualPoly = terrainLocalPolygonToWorld(terrain, terrain.outer || definition.outer);
      if (pointInPoly(p, visualPoly)) return index;
    }
    return -1;
  }

  function findLayoutWallAtPoint(p) {
    for (let index = state.current.layoutWalls.length - 1; index >= 0; index--) {
      const wall = state.current.layoutWalls[index];
      if (pointInPoly(p, layoutWallPolygonToWorld(wall))) return index;
    }
    return -1;
  }

  function findLayoutFeatureAtPoint(p) {
    for (let index = state.current.layoutFeaturePieces.length - 1; index >= 0; index--) {
      const feature = state.current.layoutFeaturePieces[index];
      if (!terrainFeatureKindVisible(LAYOUT_FEATURE_TYPES[feature.type]?.kind || "light")) continue;
      if (pointInPoly(p, layoutFeaturePolygonToWorld(feature))) return index;
    }
    return -1;
  }

  function layoutWallFloorButtons(wall) {
    const polygon = layoutWallPolygonToWorld(wall);
    const bounds = polygon.reduce((result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minY: Math.min(result.minY, point.y),
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity });
    const scale = state.current.camera.scale;
    const width = 72 / scale;
    const height = 24 / scale;
    const gap = 6 / scale;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const y = bounds.minY - height - 10 / scale;
    return [
      { floorState: "ground", label: "Ground", x: centerX - width - gap / 2, y, width, height },
      { floorState: "firstFloor", label: "1st Floor", x: centerX + gap / 2, y, width, height },
    ];
  }

  function findLayoutWallFloorButton(p) {
    const wall = state.current.layoutWalls.find((item) => item.id === selectedLayoutWallId);
    if (!wall) return null;
    const button = layoutWallFloorButtons(wall).find((item) => (
      p.x >= item.x && p.x <= item.x + item.width && p.y >= item.y && p.y <= item.y + item.height
    ));
    return button?.floorState || null;
  }

  function layoutTerrainRelationButtons(terrain) {
    const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
    const polygon = terrainLocalPolygonToWorld(terrain, terrain.outer || definition.outer);
    const bounds = polygon.reduce((result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minY: Math.min(result.minY, point.y),
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity });
    const scale = state.current.camera.scale;
    const width = 112 / scale;
    const height = 24 / scale;
    const gap = 6 / scale;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const y = bounds.minY - height - 10 / scale;
    return [
      { same: true, label: "Same footprint", x: centerX - width - gap / 2, y, width, height },
      { same: false, label: "Separate", x: centerX + gap / 2, y, width, height },
    ];
  }

  function findLayoutTerrainRelationButton(p) {
    const terrain = state.current.layoutTerrain.find((item) => item.id === selectedLayoutTerrainId);
    if (!terrain || !selectedTerrainRelation()) return null;
    const button = layoutTerrainRelationButtons(terrain).find((item) => (
      p.x >= item.x && p.x <= item.x + item.width && p.y >= item.y && p.y <= item.y + item.height
    ));
    return button ? button.same : null;
  }

  function findLayoutObjectiveAtPoint(p) {
    const pixelsPerInch = state.current.fit.w / boardWidthInches();
    const radius = Math.max(16 / state.current.camera.scale, pixelsPerInch * 1.8);
    for (let index = state.current.layoutObjectives.length - 1; index >= 0; index--) {
      if (dist(p, state.current.layoutObjectives[index]) <= radius) return index;
    }
    return -1;
  }

  function captureMovementPhaseSnapshot() {
    return {
      losMarkers: state.current.losMarkers.map((marker) => ({
        id: marker.id,
        x: marker.x,
        y: marker.y,
        baseShape: marker.baseShape,
        baseLengthMm: marker.baseLengthMm,
        baseWidthMm: marker.baseWidthMm,
        baseRotation: marker.baseRotation || 0,
        name: marker.name,
      })),
      enemies: state.current.enemies.map((enemy) => ({
        id: enemy.id,
        x: enemy.x,
        y: enemy.y,
      })),
    };
  }

  function saveActiveMovementPhaseSnapshot() {
    if (!movementPlanningEnabled || !MOVEMENT_PHASES.includes(activeMovementPhase)) return;
    state.current.movementPhases = {
      ...(state.current.movementPhases || {}),
      [activeMovementPhase]: captureMovementPhaseSnapshot(),
    };
  }

  function applyMovementPhaseSnapshot(snapshot) {
    if (!snapshot) return;
    const markerPositions = new Map((snapshot.losMarkers || []).map((marker) => [marker.id, marker]));
    state.current.losMarkers = state.current.losMarkers.map((marker) => {
      const saved = markerPositions.get(marker.id);
      return saved ? { ...marker, x: saved.x, y: saved.y, baseRotation: saved.baseRotation ?? marker.baseRotation } : marker;
    });
    const enemyPositions = new Map((snapshot.enemies || []).map((enemy) => [enemy.id, enemy]));
    state.current.enemies = state.current.enemies.map((enemy) => {
      const saved = enemyPositions.get(enemy.id);
      return saved ? { ...enemy, x: saved.x, y: saved.y } : enemy;
    });
    const active = getActiveLosMarker();
    if (active) state.current.light = { x: active.x, y: active.y };
  }

  function switchMovementPhase(phase) {
    if (!MOVEMENT_PHASES.includes(phase)) return;
    saveActiveMovementPhaseSnapshot();
    const phases = state.current.movementPhases || {};
    if (!phases[phase]) phases[phase] = captureMovementPhaseSnapshot();
    state.current.movementPhases = phases;
    applyMovementPhaseSnapshot(phases[phase]);
    setActiveMovementPhase(phase);
    setLosVersion((version) => version + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${MOVEMENT_PHASE_LABELS[phase]} planning positions shown.`);
  }

  function toggleMovementPlanning() {
    const next = !movementPlanningEnabled;
    if (next) {
      state.current.movementPhases = {
        ...(state.current.movementPhases || {}),
        [activeMovementPhase]: captureMovementPhaseSnapshot(),
      };
      setMovementPlanningEnabled(true);
      setStatus("Planning movement enabled. Choose Deployment or a turn.");
    } else {
      saveActiveMovementPhaseSnapshot();
      setMovementPlanningEnabled(false);
      setStatus("Planning movement hidden.");
    }
    draw();
    scheduleBrowserSave();
  }

  function findDeploymentLabelAtPoint(p) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const { fit, camera } = state.current;
    const labels = [
      {
        kind: "home",
        label: "Home deploy line",
        path: state.current.deploymentPath?.length >= 2
          ? state.current.deploymentPath
          : state.current.deploymentLine ? [state.current.deploymentLine.a, state.current.deploymentLine.b] : [],
        position: state.current.deploymentLabelPosition,
      },
      {
        kind: "enemy",
        label: "Enemy deploy line",
        path: state.current.enemyDeploymentPath?.length >= 2
          ? state.current.enemyDeploymentPath
          : state.current.enemyDeploymentLine ? [state.current.enemyDeploymentLine.a, state.current.enemyDeploymentLine.b] : [],
        position: state.current.enemyDeploymentLabelPosition,
      },
    ];
    for (const item of labels) {
      const rect = deploymentLineCaptionRect(ctx, item.label, item.path, fit, camera.scale, item.position, boardWidthInches(), boardHeightInches());
      if (rect && p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height) {
        return item.kind;
      }
    }
    return null;
  }

  function layoutTerrainPolygon(terrain) {
    const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
    return terrainLocalPolygonToWorld(terrain, terrain.outer || definition.outer);
  }

  function polygonBounds(polygons) {
    return polygons.flat().reduce((result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minY: Math.min(result.minY, point.y),
      maxY: Math.max(result.maxY, point.y),
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  }

  function layoutTerrainAtPoint(point) {
    return state.current.layoutTerrain.find((terrain) => pointInPoly(point, layoutTerrainPolygon(terrain)));
  }

  function touchingRightTriangleFor(terrain) {
    if (terrain?.shape !== "right_triangle") return null;
    const polygon = layoutTerrainPolygon(terrain);
    const inchesToPixels = state.current.fit.w / boardWidthInches();
    return state.current.layoutTerrain.find((candidate) => (
      candidate.id !== terrain.id
      && candidate.shape === "right_triangle"
      && polygonsTouchOrNear(polygon, layoutTerrainPolygon(candidate), inchesToPixels)
    ));
  }

  function isolatedRightTriangleCentroid(terrain) {
    const definition = TERRAIN_FOOTPRINTS.right_triangle;
    const w = definition.width / 2;
    const h = definition.height / 2;
    const cleanTriangle = [
      [-w, -h],
      [w, -h],
      [-w, h],
    ];
    const world = terrainLocalPolygonToWorld(terrain, cleanTriangle);
    return {
      x: (world[0].x + world[1].x + world[2].x) / 3,
      y: (world[0].y + world[1].y + world[2].y) / 3,
    };
  }

  function groupedLayoutTerrainPolygonsForPoint(point) {
    const containingTerrain = layoutTerrainAtPoint(point);
    if (!containingTerrain) return [];
    const group = layoutTerrainGroupFor(containingTerrain.id);
    if (group) {
      return group
        .map((id) => state.current.layoutTerrain.find((terrain) => terrain.id === id))
        .filter(Boolean)
        .map(layoutTerrainPolygon);
    }
    if (containingTerrain.shape === "right_triangle") {
      const containingPolygon = layoutTerrainPolygon(containingTerrain);
      const touchingTriangle = touchingRightTriangleFor(containingTerrain);
      if (touchingTriangle) return [containingPolygon, layoutTerrainPolygon(touchingTriangle)];
    }
    return [layoutTerrainPolygon(containingTerrain)];
  }

  function snapObjectiveToTerrainCenter(objectiveIndex) {
    const objective = state.current.layoutObjectives[objectiveIndex];
    if (!objective) return;
    const containingTerrain = layoutTerrainAtPoint(objective);
    const isolatedTriangleCenter = containingTerrain?.shape === "right_triangle"
      && !layoutTerrainGroupFor(containingTerrain.id)
      && !touchingRightTriangleFor(containingTerrain)
      ? isolatedRightTriangleCentroid(containingTerrain)
      : null;
    const groupedPolygons = groupedLayoutTerrainPolygonsForPoint(objective);
    const footprint = state.current.blockers.find((poly) => pointInPoly(objective, poly));
    if (!isolatedTriangleCenter && !groupedPolygons.length && !footprint?.length) return;
    const bounds = groupedPolygons.length ? polygonBounds(groupedPolygons) : polygonBounds([footprint]);
    const center = isolatedTriangleCenter || {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
    const boardCenter = worldToBattlefieldPoint(center);
    objective.boardX = boardCenter.x;
    objective.boardY = boardCenter.y;
    objective.x = center.x;
    objective.y = center.y;
    setStatus("Objective snapped to the centre of the terrain footprint.");
  }

  function findSelectedLayoutTerrainHandle(p) {
    if (!selectedLayoutTerrainId) return null;
    const index = state.current.layoutTerrain.findIndex((terrain) => terrain.id === selectedLayoutTerrainId);
    if (index < 0) return null;
    const terrain = state.current.layoutTerrain[index];
    if (!Array.isArray(terrain.outer)) return null;
    const handles = terrainLocalPolygonToWorld(terrain, terrain.outer);
    const radius = 10 / state.current.camera.scale;
    for (let pointIndex = handles.length - 1; pointIndex >= 0; pointIndex--) {
      if (dist(p, handles[pointIndex]) <= radius) return { index, pointIndex };
    }
    return null;
  }

  function findLosVisibilityButton(p) {
    const cam = state.current.camera;
    const r = 13 / cam.scale;
    for (const marker of state.current.losMarkers) {
      if (marker.id !== activeLosId) continue;
      const base = getBaseRadii(cam.scale, marker);
      const y = marker.y - base.ry - 18 / cam.scale;
      const show = { x: marker.x - 15 / cam.scale, y };
      const hide = { x: marker.x + 15 / cam.scale, y };
      if (dist(p, show) <= r) return { id: marker.id, visible: true };
      if (dist(p, hide) <= r) return { id: marker.id, visible: false };
    }
    return null;
  }

  function updateHoverCursor(p) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (objectDragRef.current) {
      canvas.style.cursor = "grabbing";
    } else if (selectiveFootprintRemoveMode) {
      canvas.style.cursor = findLayoutTerrainAtPoint(p) >= 0 ? "not-allowed" : "crosshair";
    } else if (layoutEditMode && findLayoutObjectiveAtPoint(p) >= 0) {
      canvas.style.cursor = "grab";
    } else if (layoutEditMode && findSelectedLayoutTerrainHandle(p)) {
      canvas.style.cursor = "crosshair";
    } else if (layoutEditMode && findLayoutFeatureAtPoint(p) >= 0) {
      canvas.style.cursor = "grab";
    } else if (findLayoutWallAtPoint(p) >= 0) {
      canvas.style.cursor = layoutEditMode ? "grab" : "pointer";
    } else if (layoutEditMode && findLayoutTerrainAtPoint(p) >= 0) {
      canvas.style.cursor = "grab";
    } else if (findLosVisibilityButton(p) && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "denseTF" && mode !== "lightTF" && mode !== "scale" && mode !== "stickyRuler" && !isDeploymentMode()) {
      canvas.style.cursor = "pointer";
    } else if (findDraggableObject(p) && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale" && mode !== "stickyRuler") {
      canvas.style.cursor = "grab";
    } else if (mode === "pan") {
      canvas.style.cursor = panningRef.current ? "grabbing" : "grab";
    } else {
      canvas.style.cursor = "crosshair";
    }
  }

  function finishWall(e) {
    if (mode !== "wall") return;
    e.preventDefault();
    const path = state.current.wallPath;
    if (path.length < 2) {
      state.current.wallPath = [];
      state.current.wallPreview = null;
      setStatus("Wall cancelled.");
      draw();
      return;
    }

    for (let i = 0; i < path.length - 1; i++) {
      if (dist(path[i], path[i + 1]) > 2) {
        state.current.walls.push({ a: path[i], b: path[i + 1] });
      }
    }

    state.current.wallPath = [];
    state.current.wallPreview = null;
    updateVisibility();
    setStatus("Continuous wall added. Click to start another wall.");
    draw();
  }

  function finishFootprint(e) {
    if (mode !== "block" && mode !== "denseTF" && mode !== "lightTF") return;
    e.preventDefault();

    const poly = state.current.currentPoly;
    if (poly.length < 3) {
      setStatus("Need at least 3 footprint points.");
      return;
    }

    if (mode === "block") {
      state.current.blockers.push([...poly]);
      state.current.blockerIds.push(`footprint-${Date.now()}`);
    } else {
      state.current.layoutTerrainFeatures.push({
        id: `layout-${mode}-${Date.now()}`,
        kind: mode === "denseTF" ? "dense" : "light",
        points: poly.map((point) => worldToBattlefieldPoint(point)),
      });
    }
    state.current.currentPoly = [];
    if (mode === "block") updateVisibility();
    setStatus(mode === "block" ? "Footprint added. White = clear, yellow = one footprint wall crossed, dark = blocked." : `${mode === "denseTF" ? "Dense" : "Light"} TF added.`);
    draw();
    scheduleBrowserSave();
  }


  function finishDeploymentLOS(e) {
    if (!isDeploymentMode()) return;
    e.preventDefault();

    const isEnemy = mode === "deployEnemy";
    const path = isEnemy ? state.current.enemyDeploymentDraft : state.current.deploymentDraft;
    if (path.length < 2) {
      if (isEnemy) {
        state.current.enemyDeploymentDraft = [];
        state.current.enemyDeploymentPreview = null;
      } else {
        state.current.deploymentDraft = [];
        state.current.deploymentPreview = null;
      }
      setStatus("Deployment LOS cancelled. Need at least 2 points.");
      draw();
      return;
    }

    if (isEnemy) {
      state.current.enemyDeploymentPath = [...path];
      state.current.enemyDeploymentLine = { a: path[0], b: path[path.length - 1] };
      state.current.enemyDeploymentDraft = [];
      state.current.enemyDeploymentPreview = null;
      state.current.enemyDeploymentVisible = true;
      state.current.enemyDeploymentNoMansSide = null;
      state.current.enemyDeploymentLabelPosition = null;
    } else {
      state.current.deploymentPath = [...path];
      state.current.deploymentLine = { a: path[0], b: path[path.length - 1] };
      state.current.deploymentDraft = [];
      state.current.deploymentPreview = null;
      state.current.deploymentVisible = true;
      state.current.deploymentNoMansSide = null;
      state.current.deploymentLabelPosition = null;
    }
    updateVisibility();
    setStatus(`${isEnemy ? "Enemy" : "Home"} deployment LOS path set. Which side is no man's land? Select an arrow.`);
    draw();
    scheduleBrowserSave();
  }

  function zoomBy(factor, anchorScreen = null) {
    const cam = state.current.camera;
    const { W, H } = state.current;
    const anchor = anchorScreen || { x: W / 2, y: H / 2 };
    const before = { x: (anchor.x - cam.x) / cam.scale, y: (anchor.y - cam.y) / cam.scale };
    const nextScale = Math.max(0.6, Math.min(4, cam.scale * factor));
    cam.scale = nextScale;
    cam.x = anchor.x - before.x * nextScale;
    cam.y = anchor.y - before.y * nextScale;
    draw();
  }

  function handleWheel(e) {
    if (e.cancelable) e.preventDefault();

    if (objectDragRef.current?.type === "layoutTerrain") {
      const terrain = state.current.layoutTerrain[objectDragRef.current.index];
      if (terrain) {
        const delta = e.deltaY < 0 ? 1 : -1;
        terrain.rotation = (terrain.rotation + delta + 360) % 360;
        syncLinkedLayoutTerrain(terrain);
        rebuildLayoutTerrainGeometry();
        draw();
      }
      setStatus("Rotating terrain while dragging. Mouse wheel up = clockwise, down = anticlockwise.");
      return;
    }

    if (objectDragRef.current?.type === "layoutWall") {
      const wall = state.current.layoutWalls[objectDragRef.current.index];
      if (wall) {
        const delta = e.deltaY < 0 ? 1 : -1;
        wall.rotation = ((wall.rotation || 0) + delta + 360) % 360;
        syncLinkedLayoutWall(wall);
        rebuildLayoutWallGeometry();
        draw();
      }
      setStatus("Rotating wall while dragging. Mouse wheel up = clockwise, down = anticlockwise.");
      return;
    }

    if (objectDragRef.current?.type === "layoutFeature") {
      const feature = state.current.layoutFeaturePieces[objectDragRef.current.index];
      if (feature) {
        const delta = e.deltaY < 0 ? 1 : -1;
        feature.rotation = ((feature.rotation || 0) + delta + 360) % 360;
        syncLinkedLayoutFeature(feature);
        draw();
      }
      setStatus("Rotating terrain feature while dragging.");
      return;
    }

    if (objectDragRef.current?.type === "light") {
      const delta = e.deltaY < 0 ? Math.PI / 36 : -Math.PI / 36;
      const marker = state.current.losMarkers.find((m) => m.id === objectDragRef.current.id);
      if (marker) {
        const nextRotation = (marker.baseRotation || 0) + delta;
        marker.baseRotation = nextRotation;
        if (marker.id === activeLosId) setBaseRotation(nextRotation);
        setLosVersion((v) => v + 1);
        updateVisibility();
        draw();
        scheduleBrowserSave();
      }
      setStatus("Rotating LOS base. Mouse wheel up = clockwise, down = anticlockwise.");
      return;
    }

    const p = screenPos(e);
    zoomBy(e.deltaY < 0 ? 1.12 : 0.89, p);
  }

  function handleKeyDown(e) {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;

    const key = e.key.toLowerCase();
    if (["l", "p", "f", "r", "e", "x", "z", "q", "w", "a", "s", "d", "+", "=", "-"].includes(key) || /^[0-9]$/.test(key)) e.preventDefault();

    if (/^[0-9]$/.test(key)) {
      if (!e.repeat) selectUnit(key === "0" ? 10 : Number(key));
      return;
    }

    if (["w", "a", "s", "d"].includes(key)) {
      panKeysRef.current.add(key);
      startKeyboardPan();
      return;
    }

    if (key === "p") setMode("pan");
    else if (key === "f") setMode("block");
    else if (key === "r") setMode("wall");
    else if (key === "e") setMode("enemy");
    else if (key === "q") setMode("deployEnemy");
    else if (key === "x") setMode("erase");
    else if (key === "z") undo();
    else if (key === "+" || key === "=") zoomBy(1.25);
    else if (key === "-") zoomBy(0.8);
    
  }

  function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (!["w", "a", "s", "d"].includes(key)) return;
    panKeysRef.current.delete(key);
    if (!panKeysRef.current.size) stopKeyboardPan();
  }

  function startKeyboardPan() {
    if (keyboardPanFrameRef.current) return;
    keyboardPanLastTimeRef.current = performance.now();

    const step = (now) => {
      const keys = panKeysRef.current;
      if (!keys.size) {
        stopKeyboardPan();
        return;
      }

      let x = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      let y = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
      const magnitude = Math.hypot(x, y);
      if (magnitude) {
        x /= magnitude;
        y /= magnitude;
        const elapsed = Math.min(32, now - (keyboardPanLastTimeRef.current ?? now));
        const pixelsPerSecond = 1040;
        state.current.camera.x -= x * pixelsPerSecond * elapsed / 1000;
        state.current.camera.y -= y * pixelsPerSecond * elapsed / 1000;
        draw();
      }

      keyboardPanLastTimeRef.current = now;
      keyboardPanFrameRef.current = requestAnimationFrame(step);
    };

    keyboardPanFrameRef.current = requestAnimationFrame(step);
  }

  function stopKeyboardPan() {
    panKeysRef.current.clear();
    keyboardPanLastTimeRef.current = null;
    if (keyboardPanFrameRef.current) cancelAnimationFrame(keyboardPanFrameRef.current);
    keyboardPanFrameRef.current = null;
  }

  function resetZoom() {
    state.current.camera = { scale: 1, x: 0, y: 0 };
    draw();
  }

  function previousMovementPhase() {
    const index = MOVEMENT_PHASES.indexOf(activeMovementPhase);
    return index > 0 ? MOVEMENT_PHASES[index - 1] : null;
  }

  function drawMovementPlanningOverlay(ctx, scale = 1) {
    if (!movementPlanningEnabled) return;
    const previousPhase = previousMovementPhase();
    if (!previousPhase) return;
    const previous = state.current.movementPhases?.[previousPhase];
    if (!previous) return;

    const currentMarkers = new Map(state.current.losMarkers.map((marker) => [marker.id, marker]));
    (previous.losMarkers || []).forEach((ghost) => {
      const current = currentMarkers.get(ghost.id);
      const ghostMarker = { ...current, ...ghost };
      const ghostBase = getBaseRadii(scale, ghostMarker);
      drawMovementBaseGhost(ctx, ghostMarker, ghostBase, scale);
      if (current) drawMovementArrow(ctx, ghostMarker, current, ghostBase, getBaseRadii(scale, current), scale, pixelsPerInch);
    });

    const currentEnemies = new Map(state.current.enemies.map((enemy) => [enemy.id, enemy]));
    (previous.enemies || []).forEach((ghost, index) => {
      const current = currentEnemies.get(ghost.id);
      const boardPpi = boardPixelsPerInch();
      const radius = enemyBaseRadius(boardPpi);
      ctx.save();
      ctx.globalAlpha = 0.15;
      drawEnemy(ctx, ghost, "blocked", false, false, index + 1, scale, 0, boardPpi);
      ctx.restore();
      if (current) drawMovementArrow(ctx, ghost, current, { rx: radius, ry: radius }, { rx: radius, ry: radius }, scale, boardPpi);
    });
  }

  function getBaseRadii(cameraScale = 1, marker = null) {
    const shape = marker?.baseShape || baseShape;
    const lengthMm = marker?.baseLengthMm ?? baseLengthMm;
    const widthMm = marker?.baseWidthMm ?? baseWidthMm;

    const fitPpi = state.current.fit?.w > 0 ? state.current.fit.w / boardWidthInches() : null;
    const resolvedPixelsPerInch = state.current.activeLayoutKey
      ? fitPpi
      : (Number.isFinite(pixelsPerInch) && pixelsPerInch > 0 ? pixelsPerInch : fitPpi);

    if (!resolvedPixelsPerInch) {
      const fallback = 15 / cameraScale;
      return { rx: fallback, ry: fallback };
    }

    const pxPerMm = resolvedPixelsPerInch / 25.4;
    if (shape === "circle") {
      const r = Math.max(1, (Number(lengthMm) || 25) * pxPerMm / 2);
      return { rx: r, ry: r };
    }

    return {
      rx: Math.max(1, (Number(lengthMm) || 60) * pxPerMm / 2),
      ry: Math.max(1, (Number(widthMm) || 35) * pxPerMm / 2),
    };
  }

  function getLOSOriginsForMarker(marker, interactive = false, targetPoint = null) {
    if (!marker) return [];
    const center = { x: marker.x, y: marker.y };
    if (!pixelsPerInch) return [center];

    const { rx, ry } = getBaseRadii(1, marker);
    const samples = interactive ? (marker.baseShape === "circle" ? 3 : 4) : (marker.baseShape === "circle" ? 20 : 28);
    const points = [center];

    if (marker.baseShape === "rectangle") {
      const perSide = interactive ? 1 : 8;
      for (let i = 0; i <= perSide; i++) {
        const t = -1 + (2 * i) / perSide;
        [
          { x: t * rx, y: -ry },
          { x: rx, y: t * ry },
          { x: -t * rx, y: ry },
          { x: -rx, y: -t * ry },
        ].forEach((local) => {
          const rotated = rotatePoint(local.x, local.y, marker.baseRotation || 0);
          points.push({ x: center.x + rotated.x, y: center.y + rotated.y });
        });
      }
      if (targetPoint) {
        addTargetFacingMarkerEdgePoints(points, marker, center, rx, ry, targetPoint, interactive);
      }
      return points;
    }

    for (let i = 0; i < samples; i++) {
      const a = (Math.PI * 2 * i) / samples;
      const localX = Math.cos(a) * rx;
      const localY = Math.sin(a) * ry;
      const rotated = rotatePoint(localX, localY, marker.baseRotation || 0);
      points.push({ x: center.x + rotated.x, y: center.y + rotated.y });
    }

    if (targetPoint) {
      addTargetFacingMarkerEdgePoints(points, marker, center, rx, ry, targetPoint, interactive);
    }

    return points;
  }

  function addTargetFacingMarkerEdgePoints(points, marker, center, rx, ry, targetPoint, interactive = false) {
    const dx = targetPoint.x - center.x;
    const dy = targetPoint.y - center.y;
    const length = Math.hypot(dx, dy);
    if (length <= 0.001) return;
    const angles = interactive ? [0] : [0, -0.16, 0.16];
    angles.forEach((offset) => {
      const rotatedDirection = rotatePoint(dx / length, dy / length, offset);
      let edge;
      if (marker.baseShape === "rectangle") {
        edge = movementEdgePoint(marker, { rx, ry }, rotatedDirection.x, rotatedDirection.y);
      } else {
        const radius = ellipseRadiusInDirection(
          { rx, ry, rotation: marker.baseRotation || 0 },
          rotatedDirection.x,
          rotatedDirection.y,
        );
        edge = {
          x: center.x + rotatedDirection.x * radius,
          y: center.y + rotatedDirection.y * radius,
        };
      }
      if (!points.some((point) => dist(point, edge) < 0.5)) points.push(edge);
    });
  }

  function getLOSOrigins() {
    const active = getActiveLosMarker();
    return getLOSOriginsForMarker(active);
  }

  function undo() {
    if (state.current.stickyRulerStart) state.current.stickyRulerStart = null;
    else if (state.current.stickyRulers.length) state.current.stickyRulers.pop();
    else if (state.current.rulerPreview) {
      state.current.rulerStart = null;
      state.current.rulerPreview = null;
    } else if (state.current.rulers.length) state.current.rulers.pop();
    else if (state.current.wallPath.length) {
      state.current.wallPath = [];
      state.current.wallPreview = null;
    } else if (state.current.currentPoly.length) state.current.currentPoly.pop();
    else if (state.current.enemies.length) {
      const removedEnemy = state.current.enemies.pop();
      removeStickyRulersForTarget({ type: "enemy", id: removedEnemy.id });
    }
    else if (state.current.walls.length) state.current.walls.pop();
    else {
      const removedId = state.current.blockerIds.pop();
      state.current.blockers.pop();
      removeStickyRulersForTarget({ type: "footprint", id: removedId });
    }
    updateVisibility();
    draw();
    scheduleBrowserSave();
  }

  function clearBlockers() {
    state.current.blockers = [];
    state.current.blockerIds = [];
    state.current.stickyRulers = state.current.stickyRulers.filter((ruler) => ruler.from.type !== "footprint" && ruler.to.type !== "footprint");
    state.current.currentPoly = [];
    updateVisibility();
    setStatus("Footprints cleared.");
    draw();
    scheduleBrowserSave();
  }

  function clearWalls() {
    state.current.walls = [];
    state.current.wallPath = [];
    state.current.wallPreview = null;
    updateVisibility();
    setStatus("Walls cleared.");
    draw();
    scheduleBrowserSave();
  }

  function clearEnemies() {
    state.current.enemies = [];
    state.current.stickyRulers = state.current.stickyRulers.filter((ruler) => ruler.from.type !== "enemy" && ruler.to.type !== "enemy");
    setStatus("Enemies cleared.");
    draw();
    scheduleBrowserSave();
  }

  function clearRulers() {
    state.current.rulerStart = null;
    state.current.rulerPreview = null;
    state.current.rulers = [];
    setStatus("Ruler lines cleared.");
    draw();
    scheduleBrowserSave();
  }

  function clearStickyRulers() {
    state.current.stickyRulerStart = null;
    state.current.stickyRulers = [];
    setStatus("Sticky ruler lines cleared.");
    draw();
    scheduleBrowserSave();
  }

  function setDeepstrikeOverlayVisibility(visible) {
    if (visible && !pixelsPerInch) {
      setStatus("Set the map scale before enabling the deepstrike overlay.");
      return;
    }
    setDeepstrikeVisible(visible);
    setStatus(`Deepstrike overlay ${visible ? "enabled" : "disabled"}.`);
  }

  function setDeploymentVisibility(kind, visible) {
    const isEnemy = kind === "enemy";
    const line = isEnemy ? state.current.enemyDeploymentLine : state.current.deploymentLine;
    if (!line) {
      setStatus(`Draw a ${isEnemy ? "enemy" : "home"} deployment LOS line first.`);
      return;
    }
    if (isEnemy) state.current.enemyDeploymentVisible = visible;
    else state.current.deploymentVisible = visible;
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${isEnemy ? "Enemy" : "Home"} deployment LOS ${visible ? "enabled" : "disabled"}.`);
  }

  function findDeploymentSideArrow(p) {
    const homePath = state.current.deploymentPath?.length >= 2
      ? state.current.deploymentPath
      : (state.current.deploymentLine ? [state.current.deploymentLine.a, state.current.deploymentLine.b] : []);
    const enemyPath = state.current.enemyDeploymentPath?.length >= 2
      ? state.current.enemyDeploymentPath
      : (state.current.enemyDeploymentLine ? [state.current.enemyDeploymentLine.a, state.current.enemyDeploymentLine.b] : []);
    const candidates = [];
    if (homePath.length >= 2 && !state.current.deploymentNoMansSide) candidates.push({ kind: "home", path: homePath });
    if (enemyPath.length >= 2 && !state.current.enemyDeploymentNoMansSide) candidates.push({ kind: "enemy", path: enemyPath });
    for (const candidate of candidates) {
      for (const arrow of deploymentSideArrowPositions(candidate.path, state.current.camera.scale)) {
        if (dist(p, arrow.point) <= 28 / state.current.camera.scale) return { kind: candidate.kind, side: arrow.side };
      }
    }
    return null;
  }

  function clearDeploymentLOS(kind) {
    const isEnemy = kind === "enemy";
    if (isEnemy) {
      state.current.enemyDeploymentLine = null;
      state.current.enemyDeploymentPath = [];
      state.current.enemyDeploymentDraft = [];
      state.current.enemyDeploymentPreview = null;
      state.current.enemyDeploymentNoMansSide = null;
      state.current.enemyDeploymentLabelPosition = null;
      state.current.enemyDeploymentVisibility = { clearZones: [], oneWallZones: [] };
    } else {
      state.current.deploymentLine = null;
      state.current.deploymentPath = [];
      state.current.deploymentDraft = [];
      state.current.deploymentPreview = null;
      state.current.deploymentNoMansSide = null;
      state.current.deploymentLabelPosition = null;
      state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
    }
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${isEnemy ? "Enemy" : "Home"} deployment LOS cleared.`);
  }

  function restorePresetDeploymentLines() {
    const preset = layoutPresetForKey(state.current.activeLayoutKey);
    if (!preset) {
      setStatus("Apply an official layout before restoring its deployment lines.");
      return;
    }
    const homeDeploymentPath = Array.isArray(preset.homeDeploymentPath) ? preset.homeDeploymentPath : [];
    const enemyDeploymentPath = Array.isArray(preset.enemyDeploymentPath) ? preset.enemyDeploymentPath : [];
    if (homeDeploymentPath.length < 2 || enemyDeploymentPath.length < 2) {
      setStatus("This layout does not have deployment lines saved yet.");
      return;
    }
    state.current.deploymentPath = homeDeploymentPath.map(([x, y]) => presetDeploymentPoint(preset, x, y));
    state.current.deploymentLine = {
      a: state.current.deploymentPath[0],
      b: state.current.deploymentPath[state.current.deploymentPath.length - 1],
    };
    state.current.enemyDeploymentPath = enemyDeploymentPath.map(([x, y]) => presetDeploymentPoint(preset, x, y));
    state.current.enemyDeploymentLine = {
      a: state.current.enemyDeploymentPath[0],
      b: state.current.enemyDeploymentPath[state.current.enemyDeploymentPath.length - 1],
    };
    state.current.deploymentVisible = false;
    state.current.enemyDeploymentVisible = false;
    state.current.deploymentNoMansSide = null;
    state.current.enemyDeploymentNoMansSide = null;
    state.current.deploymentLabelPosition = validBoardPoint(preset.deploymentLabelPosition) ? { ...preset.deploymentLabelPosition } : null;
    state.current.enemyDeploymentLabelPosition = validBoardPoint(preset.enemyDeploymentLabelPosition) ? { ...preset.enemyDeploymentLabelPosition } : null;
    setPixelsPerInch(state.current.fit.w / boardWidthInches());
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus("Official deployment lines restored. Choose the no man's land side; deployment LOS starts hidden.");
  }

  function resetPoint() {
    updateActiveLosMarker({ x: state.current.W / 2, y: state.current.H / 2 });
  }

  function calculateUnitCoherency() {
    const results = new Map();
    if (!pixelsPerInch) return results;
    for (let slot = 1; slot <= 20; slot++) {
      const members = getUnitMembers(slot);
      if (!members.length) continue;
      const neighbourLimit = 2 * pixelsPerInch;
      const neighbourFailures = new Set();
      if (members.length > 1) {
        members.forEach((member) => {
          const memberEllipse = markerEllipse(member);
          const hasNeighbour = members.some((other) => {
            if (other.id === member.id) return false;
            const edge = closestEllipseEdgePoints(memberEllipse, markerEllipse(other));
            return dist(edge.a, edge.b) <= neighbourLimit + 0.01;
          });
          if (!hasNeighbour) neighbourFailures.add(member.id);
        });
      }

      let furthestPair = null;
      let furthestEdgeDistance = 0;
      for (let first = 0; first < members.length; first++) {
        for (let second = first + 1; second < members.length; second++) {
          const edge = closestEllipseEdgePoints(markerEllipse(members[first]), markerEllipse(members[second]));
          const edgeDistance = dist(edge.a, edge.b);
          if (edgeDistance >= furthestEdgeDistance) {
            furthestEdgeDistance = edgeDistance;
            furthestPair = { ...edge, first: members[first], second: members[second] };
          }
        }
      }
      const withinNine = furthestEdgeDistance + 0.01 < 9 * pixelsPerInch;
      results.set(slot, {
        coherent: neighbourFailures.size === 0 && withinNine,
        neighbourFailures,
        withinNine,
        furthestEdgeDistance,
        furthestPair,
        members,
      });
    }
    return results;
  }

  function unitCoherencyCircleCenter(members) {
    if (!members?.length) return null;
    if (members.length === 1) return { x: members[0].x, y: members[0].y };
    let furthest = null;
    let furthestDistance = -1;
    for (let first = 0; first < members.length; first++) {
      for (let second = first + 1; second < members.length; second++) {
        const edge = closestEllipseEdgePoints(markerEllipse(members[first]), markerEllipse(members[second]));
        const edgeDistance = dist(edge.a, edge.b);
        if (edgeDistance > furthestDistance) {
          furthestDistance = edgeDistance;
          furthest = edge;
        }
      }
    }
    return furthest
      ? { x: (furthest.a.x + furthest.b.x) / 2, y: (furthest.a.y + furthest.b.y) / 2 }
      : { x: members[0].x, y: members[0].y };
  }

  function markerEllipse(marker) {
    const base = getBaseRadii(1, marker);
    return { center: marker, rx: base.rx, ry: base.ry, rotation: marker.baseRotation || 0 };
  }

  function markerRangeRadius(marker) {
    if (!pixelsPerInch || !marker) return Infinity;
    const value = marker.groupingMode === "unit"
      ? getUnitRange(marker.unitSlot)
      : marker.rangeInches;
    const numeric = Number(value);
    return !numeric || numeric <= 0 ? Infinity : numeric * pixelsPerInch;
  }

  function boardPixelsPerInch() {
    const fitPpi = state.current.fit?.w ? state.current.fit.w / boardWidthInches() : null;
    return Number.isFinite(fitPpi) && fitPpi > 0
      ? fitPpi
      : Number.isFinite(pixelsPerInch) && pixelsPerInch > 0 ? pixelsPerInch : null;
  }

  function enemyLosMarkerKey(marker) {
    return [
      marker.id,
      Math.round(marker.x * 10) / 10,
      Math.round(marker.y * 10) / 10,
      marker.baseShape || "circle",
      marker.baseLengthMm || 40,
      marker.baseWidthMm || marker.baseLengthMm || 40,
      Math.round((marker.baseRotation || 0) * 1000) / 1000,
    ].join(",");
  }

  function enemyLosEnemyKey(enemy) {
    return [
      enemy.id || "",
      Math.round(enemy.x * 10) / 10,
      Math.round(enemy.y * 10) / 10,
    ].join(",");
  }

  function combineEnemyLosStates(states) {
    if (states.includes("clear")) return "clear";
    if (states.includes("oneWall")) return "oneWall";
    return "blocked";
  }

  function normalizePairEnemyLosResult(result) {
    return typeof result === "string" ? { state: result, ray: null } : {
      state: result?.state || "blocked",
      ray: result?.ray || null,
    };
  }

  function findConfirmedEnemyLosRay(enemy, enemyRadius, origins, blockers, walls, interactive, preparedGeometry) {
    const targetSamples = interactive ? 8 : 16;
    let oneWallRay = null;
    const targets = [{ x: enemy.x, y: enemy.y }];
    for (let index = 0; index < targetSamples; index += 1) {
      const angle = index / targetSamples * Math.PI * 2;
      targets.push({
        x: enemy.x + Math.cos(angle) * enemyRadius,
        y: enemy.y + Math.sin(angle) * enemyRadius,
      });
    }
    for (const origin of origins) {
      for (const target of targets) {
        const state = classifySightSegment(origin, target, blockers, walls, preparedGeometry);
        if (state === "clear") return { state, ray: { a: origin, b: target } };
        if (state === "oneWall" && !oneWallRay) oneWallRay = { state, ray: { a: origin, b: target } };
      }
    }
    return oneWallRay || { state: "blocked", ray: null };
  }

  function enemyLosPreviewSamples(enemy, radius) {
    const samples = [{ x: enemy.x, y: enemy.y }];
    const sampleCount = 12;
    for (let index = 0; index < sampleCount; index += 1) {
      const angle = index / sampleCount * Math.PI * 2;
      samples.push({
        x: enemy.x + Math.cos(angle) * radius,
        y: enemy.y + Math.sin(angle) * radius,
      });
    }
    return samples;
  }

  function pointInAnyVisibilityZone(point, zones) {
    return (zones || []).some((zone) => zone?.length >= 3 && pointInPoly(point, zone));
  }

  function calculateEnemyLosPreviewStates() {
    const enemies = state.current.enemies || [];
    if (!enemies.length) return [];
    const visibility = state.current.visibility || {};
    const clearZones = visibility.clearZones || [];
    const oneWallZones = visibility.oneWallZones || [];
    const hasZones = clearZones.some((zone) => zone?.length >= 3)
      || oneWallZones.some((zone) => zone?.length >= 3);
    if (!hasZones) {
      return enemies.map((_, index) => state.current.enemyLosStates[index] || "blocked");
    }
    const radius = enemyBaseRadius(boardPixelsPerInch());
    const blockers = state.current.blockers || [];
    return enemies.map((enemy) => {
      const samples = enemyLosPreviewSamples(enemy, radius);
      if (samples.some((sample) => pointInAnyVisibilityZone(sample, clearZones))) {
        return enemyBaseTouchesFootprint(enemy, radius, blockers) ? "oneWall" : "clear";
      }
      if (
        enemyBaseTouchesFootprint(enemy, radius, blockers)
        && samples.some((sample) => pointInAnyVisibilityZone(sample, oneWallZones))
      ) return "oneWall";
      return "blocked";
    });
  }

  function updateEnemyLosPreviewStates() {
    state.current.enemyLosStates = calculateEnemyLosPreviewStates();
    state.current.enemyLosRays = [];
    state.current.enemyLosPendingIndexes = new Set();
  }

  function trimMarkerEnemyLosCache(limit = 6000) {
    const cache = markerEnemyLosCacheRef.current;
    if (cache.size <= limit) return;
    const removeCount = cache.size - limit;
    let removed = 0;
    for (const key of cache.keys()) {
      cache.delete(key);
      removed += 1;
      if (removed >= removeCount) break;
    }
  }

  function calculateEnemyLosStatesFromPairCache(interactive, sceneKey, boardPpi, visibleMarkers, enemyVisibilityGeometry) {
    const pairCache = markerEnemyLosCacheRef.current;
    const radius = enemyBaseRadius(boardPpi);
    const rays = [];
    const states = state.current.enemies.map((enemy) => {
      const pairResults = visibleMarkers.map((marker) => {
        const pairKey = [
          sceneKey,
          interactive ? "interactive" : "settled",
          Math.round((boardPpi || 0) * 100) / 100,
          enemyLosMarkerKey(marker),
          enemyLosEnemyKey(enemy),
        ].join("::");
        if (pairCache.has(pairKey)) return normalizePairEnemyLosResult(pairCache.get(pairKey));
        const origins = getLOSOriginsForMarker(marker, interactive, enemy);
        const losState = directEnemyLOSState(
          enemy,
          radius,
          origins,
          state.current.blockers,
          state.current.walls,
          interactive,
          enemyVisibilityGeometry,
        );
        const result = losState === "blocked"
          ? { state: losState, ray: null }
          : findConfirmedEnemyLosRay(enemy, radius, origins, state.current.blockers, state.current.walls, interactive, enemyVisibilityGeometry);
        pairCache.set(pairKey, result);
        return result;
      });
      const finalState = combineEnemyLosStates(pairResults.map((result) => result.state));
      const ray = pairResults.find((result) => result.state === finalState && result.ray)?.ray || null;
      rays.push(ray ? { ...ray, state: finalState } : null);
      return finalState;
    });
    state.current.enemyLosRays = rays;
    trimMarkerEnemyLosCache();
    return states;
  }

  function updateEnemyLosStates(interactive = false, options = {}) {
    const startedAt = performance.now();
    const forceImmediate = options.forceImmediate === true;
    if (options.deferred && !interactive) {
      if (pendingEnemyLosTimerRef.current) window.clearTimeout(pendingEnemyLosTimerRef.current);
      pendingEnemyLosTimerRef.current = window.setTimeout(() => {
        pendingEnemyLosTimerRef.current = null;
        updateEnemyLosStates(false, { forceImmediate: true });
      }, options.delayMs ?? 120);
      return;
    }
    const cacheKey = enemyLosCacheKey(interactive);
    if (!forceImmediate && enemyLosCacheRef.current.key === cacheKey) {
      state.current.enemyLosStates = enemyLosCacheRef.current.states;
      state.current.enemyLosPendingIndexes = new Set();
      return;
    }
    if (interactive) {
      const now = performance.now();
      if (now - lastInteractiveEnemyLosRef.current < 32) return;
      lastInteractiveEnemyLosRef.current = now;
      updateEnemyLosPreviewStates();
      recordPerf("enemyLos", startedAt);
      return;
    }
    if (requestEnemyLosStates(interactive, cacheKey)) {
      recordPerf("enemyLos", startedAt);
      return;
    }
    const boardPpi = boardPixelsPerInch();
    const visibleMarkers = state.current.losMarkers.filter((marker) => marker.visible !== false);
    const enemyVisibilityGeometry = getPreparedVisibilityGeometry(
      state.current.blockers,
      state.current.walls,
      state.current.W,
      state.current.H,
    );
    state.current.enemyLosStates = calculateEnemyLosStatesFromPairCache(
      interactive,
      currentVisibilitySceneKey(),
      boardPpi,
      visibleMarkers,
      enemyVisibilityGeometry,
    );
    state.current.enemyLosPendingIndexes = new Set();
    enemyLosCacheRef.current = { key: cacheKey, states: state.current.enemyLosStates };
    recordPerf("enemyLos", startedAt);
  }

  function terrainFeatureKindVisible(kind) {
    return kind === "dense" ? showDenseTerrainFeatures : showLightTerrainFeatures;
  }

  function roundedNumber(value, places = 2) {
    if (!Number.isFinite(value)) return value;
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
  }

  function roundedPoint(point) {
    return point ? { x: roundedNumber(point.x), y: roundedNumber(point.y) } : null;
  }

  function roundedPoints(points = []) {
    return points.map(roundedPoint);
  }

  function battlefieldRenderPixelRatio(cameraScale) {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(4, Math.max(1, dpr * Math.max(1, cameraScale || 1)));
  }

  function ensureRenderCanvas(canvas, W, H, pixelRatio = 1) {
    const target = canvas || document.createElement("canvas");
    const width = Math.max(1, Math.round(W * pixelRatio));
    const height = Math.max(1, Math.round(H * pixelRatio));
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
    const context = target.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    return target;
  }

  function battlefieldBaseRenderKey(cameraScale) {
    const { W, H, fit, deploymentPath, deploymentLine, enemyDeploymentPath, enemyDeploymentLine } = state.current;
    const pixelRatio = battlefieldRenderPixelRatio(cameraScale);
    const homeDeployPath = deploymentPath?.length >= 2 ? deploymentPath : (deploymentLine ? [deploymentLine.a, deploymentLine.b] : []);
    const enemyDeployPath = enemyDeploymentPath?.length >= 2 ? enemyDeploymentPath : (enemyDeploymentLine ? [enemyDeploymentLine.a, enemyDeploymentLine.b] : []);
    return JSON.stringify({
      W,
      H,
      version: state.current.battlefieldBaseVersion,
      fit: { x: roundedNumber(fit.x), y: roundedNumber(fit.y), w: roundedNumber(fit.w), h: roundedNumber(fit.h) },
      boardW: boardWidthInches(),
      boardH: boardHeightInches(),
      scale: roundedNumber(cameraScale, 3),
      pixelRatio: roundedNumber(pixelRatio, 3),
      image: Boolean(imgRef.current),
      imageSrc: state.current.savedImageSrc ? String(state.current.savedImageSrc).slice(0, 128) : "",
      homeDeployPathLength: homeDeployPath.length,
      homeNoMans: state.current.deploymentNoMansSide || "",
      enemyDeployPathLength: enemyDeployPath.length,
      enemyNoMans: state.current.enemyDeploymentNoMansSide || "",
    });
  }

  function battlefieldForegroundRenderKey(cameraScale) {
    const { W, H } = state.current;
    const pixelRatio = battlefieldRenderPixelRatio(cameraScale);
    return JSON.stringify({
      W,
      H,
      version: state.current.battlefieldForegroundVersion,
      scale: roundedNumber(cameraScale, 3),
      pixelRatio: roundedNumber(pixelRatio, 3),
      boardPpi: roundedNumber(boardPixelsPerInch(), 3),
      lightVisible: terrainFeatureKindVisible("light"),
      denseVisible: terrainFeatureKindVisible("dense"),
      objectivesVisible: showObjectives,
      terrainCount: state.current.layoutTerrain.length,
      terrain: state.current.layoutTerrain.map((terrain) => [
        terrain.id,
        terrain.shape,
        roundedNumber(terrain.x),
        roundedNumber(terrain.y),
        roundedNumber(terrain.rotation, 4),
        terrain.mirrored === true,
      ]),
      blockerCount: state.current.blockers.length,
      wallCount: state.current.layoutWalls.length,
      walls: state.current.layoutWalls.map((wall) => [
        wall.id,
        wall.type,
        roundedNumber(wall.x),
        roundedNumber(wall.y),
        roundedNumber(wall.rotation, 4),
        wall.mirrored === true,
        wall.floorState || "ground",
      ]),
      terrainFeatureCount: state.current.layoutTerrainFeatures.length,
      terrainFeatures: state.current.layoutTerrainFeatures.map((feature) => [
        feature.id,
        feature.kind,
        roundedPoints(feature.points),
      ]),
      featurePieceCount: state.current.layoutFeaturePieces.length,
      featurePieces: state.current.layoutFeaturePieces.map((feature) => [
        feature.id,
        feature.type,
        roundedNumber(feature.x),
        roundedNumber(feature.y),
        roundedNumber(feature.rotation, 4),
        feature.mirrored === true,
      ]),
      objectiveCount: state.current.layoutObjectives.length,
      objectives: state.current.layoutObjectives.map((objective) => [
        objective.id,
        objective.type,
        roundedNumber(objective.x),
        roundedNumber(objective.y),
        objective.visible !== false,
      ]),
      deploymentPathLength: state.current.deploymentPath?.length || 0,
      deploymentVisible: state.current.deploymentVisible,
      deploymentLabelPosition: roundedPoint(state.current.deploymentLabelPosition),
      enemyDeploymentPathLength: state.current.enemyDeploymentPath?.length || 0,
      enemyDeploymentVisible: state.current.enemyDeploymentVisible,
      enemyDeploymentLabelPosition: roundedPoint(state.current.enemyDeploymentLabelPosition),
      noMans: state.current.deploymentNoMansSide || "",
      enemyNoMans: state.current.enemyDeploymentNoMansSide || "",
    });
  }

  function drawBattlefieldBaseLayer(targetCtx, cameraScale) {
    const { W, H, fit, blockers, deploymentLine, deploymentPath, enemyDeploymentLine, enemyDeploymentPath } = state.current;
    const img = imgRef.current;
    const homeDeployPath = deploymentPath?.length >= 2 ? deploymentPath : (deploymentLine ? [deploymentLine.a, deploymentLine.b] : []);
    const enemyDeployPath = enemyDeploymentPath?.length >= 2 ? enemyDeploymentPath : (enemyDeploymentLine ? [enemyDeploymentLine.a, enemyDeploymentLine.b] : []);

    targetCtx.clearRect(0, 0, W, H);
    targetCtx.fillStyle = "#151515";
    targetCtx.fillRect(0, 0, W, H);
    targetCtx.fillStyle = "#24272b";
    targetCtx.fillRect(fit.x, fit.y, fit.w, fit.h);
    if (img) {
      targetCtx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
      targetCtx.fillStyle = "rgba(15,18,22,.72)";
      targetCtx.fillRect(fit.x, fit.y, fit.w, fit.h);
    }
    drawBattlefieldGrid(targetCtx, fit, cameraScale, boardWidthInches(), boardHeightInches());

    if (homeDeployPath.length >= 2 && state.current.deploymentNoMansSide) {
      drawDeploymentAreaWash(targetCtx, homeDeployPath, state.current.deploymentNoMansSide, W, H, fit, blockers, "rgba(125,211,252,.18)");
    }
    if (enemyDeployPath.length >= 2 && state.current.enemyDeploymentNoMansSide) {
      drawDeploymentAreaWash(targetCtx, enemyDeployPath, state.current.enemyDeploymentNoMansSide, W, H, fit, blockers, "rgba(248,113,113,.18)");
    }
  }

  function getBattlefieldBaseRender(cameraScale) {
    const { W, H } = state.current;
    const pixelRatio = battlefieldRenderPixelRatio(cameraScale);
    const key = battlefieldBaseRenderKey(cameraScale);
    if (state.current.battlefieldBaseRender && state.current.battlefieldBaseRenderKey === key) {
      return state.current.battlefieldBaseRender;
    }
    const canvas = ensureRenderCanvas(state.current.battlefieldBaseRender, W, H, pixelRatio);
    drawBattlefieldBaseLayer(canvas.getContext("2d"), cameraScale);
    state.current.battlefieldBaseRender = canvas;
    state.current.battlefieldBaseRenderKey = key;
    return canvas;
  }

  function drawBattlefieldForegroundLayer(targetCtx, cameraScale) {
    const { W, H, fit, blockers, deploymentLine, deploymentPath, enemyDeploymentLine, enemyDeploymentPath, layoutObjectives } = state.current;
    targetCtx.clearRect(0, 0, W, H);

    state.current.layoutTerrain.forEach((layoutTerrain) => {
      const definition = TERRAIN_FOOTPRINTS[layoutTerrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
      const visualPoly = terrainLocalPolygonToWorld(layoutTerrain, layoutTerrain.outer || definition.outer);
      const grouped = Boolean(layoutTerrainGroupFor(layoutTerrain.id));
      drawPoly(targetCtx, visualPoly, "rgba(196,152,43,.30)", grouped ? "rgba(0,0,0,0)" : "rgba(255,255,255,.84)", true, cameraScale, false);
      const lightPoly = terrainLocalPolygonToWorld(layoutTerrain, definition.light);
      const densePoly = terrainLocalPolygonToWorld(layoutTerrain, definition.dense);
      if (lightPoly.length) drawPoly(targetCtx, lightPoly, "rgba(222,145,25,.42)", "rgba(250,204,21,.75)", true, cameraScale, false);
      if (densePoly.length) drawPoly(targetCtx, densePoly, "rgba(15,118,110,.52)", "rgba(16,185,129,.88)", true, cameraScale, false);
    });

    blockers.forEach((poly, index) => {
      const blockerId = state.current.blockerIds[index] || "";
      const generatedLayoutFootprint = blockerId.startsWith("layout-");
      drawPoly(
        targetCtx,
        poly,
        generatedLayoutFootprint ? "rgba(0,0,0,0)" : "rgba(18,18,18,.38)",
        generatedLayoutFootprint && String(poly.footprintGroupId || "").startsWith("layout-group:")
          ? "rgba(0,0,0,0)"
          : generatedLayoutFootprint ? "rgba(255,255,255,.96)" : "rgba(255,255,255,.22)",
        true,
        cameraScale,
        !generatedLayoutFootprint,
      );
    });
    drawGroupedTerrainOutlines(targetCtx, blockers, cameraScale);

    state.current.layoutWalls.forEach((wall) => {
      const polygon = layoutWallPolygonToWorld(wall);
      targetCtx.save();
      if (wall.floorState === "firstFloor") targetCtx.setLineDash([7 / cameraScale, 5 / cameraScale]);
      drawPoly(targetCtx, polygon, wall.floorState === "firstFloor" ? "rgba(168,85,247,.24)" : "rgba(168,85,247,.82)", "#c084fc", true, cameraScale, false);
      targetCtx.restore();
    });

    state.current.layoutTerrainFeatures.filter((feature) => terrainFeatureKindVisible(feature.kind)).forEach((feature) => {
      const poly = feature.points.map((point) => battlefieldPoint(point.x, point.y));
      drawDecorativeTerrainFeature(targetCtx, poly, feature.kind, cameraScale);
    });
    state.current.layoutFeaturePieces.filter((feature) => terrainFeatureKindVisible(LAYOUT_FEATURE_TYPES[feature.type]?.kind || "light")).forEach((feature) => {
      const definition = LAYOUT_FEATURE_TYPES[feature.type];
      const polygon = layoutFeaturePolygonToWorld(feature);
      drawDecorativeTerrainFeature(targetCtx, polygon, definition?.kind || "light", cameraScale);
    });

    if (deploymentPath?.length >= 2) drawDeploymentPath(targetCtx, deploymentPath, cameraScale, state.current.deploymentVisible, false, "home", fit, state.current.deploymentLabelPosition);
    else if (deploymentLine) drawDeploymentLine(targetCtx, deploymentLine, cameraScale, state.current.deploymentVisible, false, "home", fit, state.current.deploymentLabelPosition);
    if (enemyDeploymentPath?.length >= 2) drawDeploymentPath(targetCtx, enemyDeploymentPath, cameraScale, state.current.enemyDeploymentVisible, false, "enemy", fit, state.current.enemyDeploymentLabelPosition);
    else if (enemyDeploymentLine) drawDeploymentLine(targetCtx, enemyDeploymentLine, cameraScale, state.current.enemyDeploymentVisible, false, "enemy", fit, state.current.enemyDeploymentLabelPosition);

    const homeDeployPath = deploymentPath?.length >= 2 ? deploymentPath : (deploymentLine ? [deploymentLine.a, deploymentLine.b] : []);
    const enemyDeployPath = enemyDeploymentPath?.length >= 2 ? enemyDeploymentPath : (enemyDeploymentLine ? [enemyDeploymentLine.a, enemyDeploymentLine.b] : []);
    if (homeDeployPath.length >= 2 && !state.current.deploymentNoMansSide) drawDeploymentSideArrows(targetCtx, homeDeployPath, cameraScale, "home");
    if (enemyDeployPath.length >= 2 && !state.current.enemyDeploymentNoMansSide) drawDeploymentSideArrows(targetCtx, enemyDeployPath, cameraScale, "enemy");

    if (showObjectives) {
      layoutObjectives.forEach((objective) => {
        drawLayoutObjective(targetCtx, objective, pixelsPerInch || fit.w / boardWidthInches(), cameraScale);
      });
    }
  }

  function getBattlefieldForegroundRender(cameraScale) {
    const { W, H } = state.current;
    const pixelRatio = battlefieldRenderPixelRatio(cameraScale);
    const key = battlefieldForegroundRenderKey(cameraScale);
    if (state.current.battlefieldForegroundRender && state.current.battlefieldForegroundRenderKey === key) {
      return state.current.battlefieldForegroundRender;
    }
    if (LOS_PERF_DIAGNOSTICS && state.current.battlefieldForegroundRenderKey && state.current.battlefieldForegroundRenderKey !== key) {
      console.info("[LOS perf] foreground cache miss", {
        foregroundVersion: state.current.battlefieldForegroundVersion,
        scale: roundedNumber(cameraScale, 3),
        previousKeyLength: state.current.battlefieldForegroundRenderKey.length,
        nextKeyLength: key.length,
      });
    }
    const canvas = ensureRenderCanvas(state.current.battlefieldForegroundRender, W, H, pixelRatio);
    drawBattlefieldForegroundLayer(canvas.getContext("2d"), cameraScale);
    state.current.battlefieldForegroundRender = canvas;
    state.current.battlefieldForegroundRenderKey = key;
    return canvas;
  }

  function drawDynamicLayoutSelectionOverlays(ctx, cameraScale) {
    const selectedTerrain = state.current.layoutTerrain.find((terrain) => terrain.id === selectedLayoutTerrainId);
    if (layoutEditMode && selectedTerrain) {
      const definition = TERRAIN_FOOTPRINTS[selectedTerrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
      const visualPoly = terrainLocalPolygonToWorld(selectedTerrain, selectedTerrain.outer || definition.outer);
      drawPoly(ctx, visualPoly, "rgba(0,0,0,0)", "#60a5fa", true, cameraScale, false);
    }
    const selectedWall = state.current.layoutWalls.find((wall) => wall.id === selectedLayoutWallId);
    if (layoutEditMode && selectedWall) {
      const polygon = layoutWallPolygonToWorld(selectedWall);
      ctx.save();
      if (selectedWall.floorState === "firstFloor") ctx.setLineDash([7 / cameraScale, 5 / cameraScale]);
      drawPoly(ctx, polygon, "rgba(0,0,0,0)", "#f8fafc", true, cameraScale, false);
      ctx.restore();
    }
    const selectedFeature = state.current.layoutFeaturePieces.find((feature) => feature.id === selectedLayoutFeatureId);
    if (layoutEditMode && selectedFeature) {
      drawPoly(ctx, layoutFeaturePolygonToWorld(selectedFeature), "rgba(0,0,0,0)", "#f8fafc", true, cameraScale, false);
    }
    const selectedObjective = state.current.layoutObjectives.find((objective) => objective.id === selectedLayoutObjectiveId);
    if (selectedObjective) {
      const radius = Math.max(17 / cameraScale, (pixelsPerInch || state.current.fit.w / boardWidthInches()) * 1.8);
      ctx.save();
      ctx.beginPath();
      ctx.arc(selectedObjective.x, selectedObjective.y, radius, 0, Math.PI * 2);
      ctx.lineWidth = 2.5 / cameraScale;
      ctx.strokeStyle = "#f8fafc";
      ctx.stroke();
      ctx.restore();
    }
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drawStartedAt = performance.now();
    const ctx = canvas.getContext("2d");
    const { W, H, fit, camera, blockers, walls, enemies, layoutObjectives, currentPoly, wallPath, wallPreview, visibility, scalePreview, rulerPreview, rulers, stickyRulers, deploymentLine, deploymentPath, deploymentDraft, deploymentPreview, deploymentVisible, deploymentLabelPosition, deploymentVisibility, enemyDeploymentLine, enemyDeploymentPath, enemyDeploymentDraft, enemyDeploymentPreview, enemyDeploymentVisible, enemyDeploymentLabelPosition, enemyDeploymentVisibility } = state.current;
    const light = getActiveLosPoint();
    const clearZones = visibility.clearZones || [];
    const oneWallZones = visibility.oneWallZones || [];
    const selectedUnitMembers = activeUnitSlot ? getUnitMembers(activeUnitSlot) : [];
    const selectedRangeValue = selectedUnitMembers.length ? getUnitRange(activeUnitSlot, selectedUnitMembers) : rangeInches;
    const numericRange = Number(selectedRangeValue);
    const boardPpi = boardPixelsPerInch();
    const rangeRadius = !pixelsPerInch || !numericRange || numericRange <= 0 ? Infinity : numericRange * pixelsPerInch;
    const homeDeploymentNumericRange = Number(homeDeploymentRangeInches);
    const homeDeploymentRangeRadius = !pixelsPerInch || !homeDeploymentNumericRange || homeDeploymentNumericRange <= 0 ? Infinity : homeDeploymentNumericRange * pixelsPerInch;
    const enemyDeploymentNumericRange = Number(enemyDeploymentRangeInches);
    const enemyDeploymentRangeRadius = !pixelsPerInch || !enemyDeploymentNumericRange || enemyDeploymentNumericRange <= 0 ? Infinity : enemyDeploymentNumericRange * pixelsPerInch;
    const homeDeployPath = deploymentPath?.length >= 2 ? deploymentPath : (deploymentLine ? [deploymentLine.a, deploymentLine.b] : []);
    const enemyDeployPath = enemyDeploymentPath?.length >= 2 ? enemyDeploymentPath : (enemyDeploymentLine ? [enemyDeploymentLine.a, enemyDeploymentLine.b] : []);
    const deepstrikeNumericRange = Number(deepstrikeRangeInches);
    const deepstrikeRangeRadius = pixelsPerInch && deepstrikeNumericRange >= 0 ? deepstrikeNumericRange * pixelsPerInch : null;
    const unitCoherency = calculateUnitCoherency();
    const rangedMarkers = state.current.losMarkers
      .map((marker) => ({ marker, radius: markerRangeRadius(marker) }))
      .filter((entry) => Number.isFinite(entry.radius));
    const markerIdsInRange = new Set();
    const enemyRangeCounts = enemies.map((enemy) => {
      let count = 0;
      rangedMarkers.forEach(({ marker, radius }) => {
        if (!enemyInRange(enemy, marker, radius, boardPpi)) return;
        count += 1;
        markerIdsInRange.add(marker.id);
      });
      return count;
    });

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    const battlefieldBaseRender = getBattlefieldBaseRender(camera.scale);
    ctx.drawImage(
      battlefieldBaseRender,
      0,
      0,
      battlefieldBaseRender.width,
      battlefieldBaseRender.height,
      0,
      0,
      W,
      H,
    );

    const rangeMarkers = Number.isFinite(rangeRadius)
      ? (selectedUnitMembers.length ? selectedUnitMembers : [getActiveLosMarker()].filter(Boolean))
      : [];

    // Filled tactical overlays are confined to the playable 44" x 60" battlefield.
    // Measurement and coherency guides are drawn after this clip is released.
    ctx.save();
    ctx.beginPath();
    ctx.rect(fit.x, fit.y, fit.w, fit.h);
    ctx.clip();

    const compositedLosRender = getCompositedLosRender([
      state.current.stationaryLosRender,
      state.current.movingLosRender,
      state.current.combinedLosRender,
    ], W, H, state.current.compositedLosBuffers, state.current.losRenderRevision, blockers);
    state.current.compositedLosRender = compositedLosRender;
    if (compositedLosRender.oneWall) ctx.drawImage(compositedLosRender.oneWall, 0, 0);
    if (compositedLosRender.clear) {
      ctx.save();
      clipOutsidePolygons(ctx, blockers, W, H);
      ctx.drawImage(compositedLosRender.clear, 0, 0);
      ctx.restore();
    }

    if (Number.isFinite(rangeRadius)) {
      const activeZones = rangeMarkers.flatMap((marker) => {
        const activeVisibility = getCachedMarkerVisibility(marker, false);
        return activeVisibility ? [...activeVisibility.oneWallZones, ...activeVisibility.clearZones] : [];
      });
      drawMultiRangeZoneMask(ctx, activeZones, W, H, rangeMarkers, rangeRadius, "rgba(34,197,94,.18)");
    }

    if (deploymentVisible && deploymentLine) {
      const side = state.current.deploymentNoMansSide;
      drawDeploymentZoneMask(ctx, deploymentVisibility.oneWallZones || [], W, H, homeDeployPath, homeDeploymentRangeRadius, side, "rgba(0,76,153,.65)");
      drawDeploymentZoneMask(ctx, deploymentVisibility.clearZones || [], W, H, homeDeployPath, homeDeploymentRangeRadius, side, "rgba(0,76,153,.65)");
    }
    if (enemyDeploymentVisible && enemyDeploymentLine) {
      const side = state.current.enemyDeploymentNoMansSide;
      drawDeploymentZoneMask(ctx, enemyDeploymentVisibility.oneWallZones || [], W, H, enemyDeployPath, enemyDeploymentRangeRadius, side, "rgba(153,20,23,.65)");
      drawDeploymentZoneMask(ctx, enemyDeploymentVisibility.clearZones || [], W, H, enemyDeployPath, enemyDeploymentRangeRadius, side, "rgba(153,20,23,.65)");
    }

    if (deepstrikeVisible && deepstrikeRangeRadius !== null) {
      const exclusions = state.current.losMarkers.map((marker) => ({
        x: marker.x,
        y: marker.y,
        rotation: marker.baseRotation || 0,
        ...getBaseRadii(1, marker),
      }));
      drawDeepstrikeOverlay(ctx, exclusions, deepstrikeRangeRadius, W, H);
    }

    ctx.restore();

    if (Number.isFinite(rangeRadius)) {
      ctx.save();
      ctx.setLineDash([8 / camera.scale, 8 / camera.scale]);
      ctx.lineWidth = 2 / camera.scale;
      ctx.strokeStyle = "rgba(34,197,94,.90)";
      rangeMarkers.forEach((marker) => {
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, rangeRadius, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    const battlefieldForegroundRender = getBattlefieldForegroundRender(camera.scale);
    ctx.drawImage(
      battlefieldForegroundRender,
      0,
      0,
      battlefieldForegroundRender.width,
      battlefieldForegroundRender.height,
      0,
      0,
      W,
      H,
    );
    drawDynamicLayoutSelectionOverlays(ctx, camera.scale);

    if (scalePreview) drawMeasurementLine(ctx, scalePreview.a, scalePreview.b, `${scaleInches}"`, camera.scale);
    rulers.forEach((ruler) => drawRulerLine(ctx, ruler.a, ruler.b, pixelsPerInch, camera.scale));
    if (rulerPreview) drawRulerLine(ctx, rulerPreview.a, rulerPreview.b, pixelsPerInch, camera.scale, true);
    stickyRulers.forEach((ruler) => {
      const geometry = getStickyRulerGeometry(ruler);
      if (geometry) drawStickyRulerLine(ctx, geometry.a, geometry.b, pixelsPerInch, camera.scale);
    });
    const movementDrag = objectDragRef.current;
    if (movementDrag?.type === "light" && movementDrag.multiSelection) {
      movementDrag.movementMeasureGroups?.forEach((group) => {
        const currentPoint = group.kind === "unit"
          ? unitCoherencyCircleCenter(getUnitMembers(group.slot))
          : (() => {
            const marker = state.current.losMarkers.find((item) => item.id === group.id);
            return marker ? { x: marker.x, y: marker.y } : null;
          })();
        if (currentPoint) drawRulerLine(ctx, group.start, currentPoint, pixelsPerInch, camera.scale, true);
      });
    } else if (movementDrag?.type === "light" && movementDrag.movementMeasureStart) {
      const currentPoint = movementDrag.unitSlot
        ? unitCoherencyCircleCenter(getUnitMembers(movementDrag.unitSlot))
        : (() => {
          const marker = state.current.losMarkers.find((item) => item.id === movementDrag.id);
          return marker ? { x: marker.x, y: marker.y } : null;
        })();
      if (currentPoint) drawRulerLine(ctx, movementDrag.movementMeasureStart, currentPoint, pixelsPerInch, camera.scale, true);
    }
    if (currentPoly.length) {
      const fill = mode === "denseTF" ? "rgba(34,197,94,.28)" : mode === "lightTF" ? "rgba(250,204,21,.30)" : "rgba(255,255,255,.10)";
      const stroke = mode === "denseTF" ? "#22c55e" : mode === "lightTF" ? "#facc15" : "#fff";
      drawPoly(ctx, currentPoly, fill, stroke, false, camera.scale);
    }

    walls.filter((wall) => !wall.generatedLayoutWall).forEach((wall) => drawWall(ctx, wall, camera.scale));
    if (wallPath.length) {
      for (let i = 0; i < wallPath.length - 1; i++) {
        drawWall(ctx, { a: wallPath[i], b: wallPath[i + 1] }, camera.scale, true);
      }
      if (wallPreview && dist(wallPath[wallPath.length - 1], wallPreview) > 1) {
        drawWall(ctx, { a: wallPath[wallPath.length - 1], b: wallPreview }, camera.scale, true);
      }
    }

    if (deploymentDraft?.length) drawDeploymentPath(ctx, deploymentPreview ? [...deploymentDraft, deploymentPreview] : deploymentDraft, camera.scale, true, true, "home", fit);
    if (enemyDeploymentDraft?.length) drawDeploymentPath(ctx, enemyDeploymentPreview ? [...enemyDeploymentDraft, enemyDeploymentPreview] : enemyDeploymentDraft, camera.scale, true, true, "enemy", fit);

    drawMovementPlanningOverlay(ctx, camera.scale);

    drawConfirmedEnemyLosRays(ctx, state.current.enemyLosRays || [], camera.scale);

    enemies.forEach((enemy, index) => {
      const losState = state.current.enemyLosStates[index] || "blocked";
      const displayLosState = losState;
      const rangeActive = Number.isFinite(rangeRadius);
      const inRange = selectedUnitMembers.length
        ? selectedUnitMembers.some((marker) => enemyInRange(enemy, marker, rangeRadius, boardPpi))
        : enemyInRange(enemy, light, rangeRadius, boardPpi);
      drawEnemy(ctx, enemy, displayLosState, inRange, rangeActive, index + 1, camera.scale, enemyRangeCounts[index], boardPpi);
    });

    state.current.losMarkers.forEach((marker) => {
      const base = getBaseRadii(camera.scale, marker);
      const isPrimaryActive = marker.id === activeLosId;
      const isActiveUnitMember = activeUnitSlot && marker.groupingMode === "unit" && marker.unitSlot === activeUnitSlot;
      const isMultiSelected = multiSelectedMarkerIdsRef.current.has(marker.id);
      const isActive = isPrimaryActive || isActiveUnitMember || isMultiSelected;
      const isStickyStart = sameStickyTarget(state.current.stickyRulerStart, { type: "los", id: marker.id });
      const isUnitStickyStart = marker.groupingMode === "unit" && sameStickyTarget(state.current.stickyRulerStart, { type: "unit", id: String(marker.unitSlot) });
      const coherency = marker.groupingMode === "unit" ? unitCoherency.get(marker.unitSlot) : null;
      const unitFailed = coherency && !coherency.coherent;

      ctx.save();
      ctx.beginPath();
      if (marker.baseShape === "rectangle") {
        ctx.save();
        ctx.translate(marker.x, marker.y);
        ctx.rotate(marker.baseRotation || 0);
        ctx.rect(-base.rx, -base.ry, base.rx * 2, base.ry * 2);
        ctx.restore();
      } else {
        ctx.ellipse(marker.x, marker.y, base.rx, base.ry, marker.baseRotation || 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = marker.visible ? "#f5f7fa" : "rgba(245,247,250,.45)";
      ctx.fill();
      ctx.lineWidth = isUnitStickyStart || isStickyStart ? 6 / camera.scale : unitFailed ? 6 / camera.scale : isActive ? 5 / camera.scale : 4 / camera.scale;
      ctx.strokeStyle = isUnitStickyStart || isStickyStart ? "rgb(222,145,25)" : unitFailed ? "#ef4444" : isActive ? "#22c55e" : marker.visible ? "#2563eb" : "#64748b";
      if (!marker.visible) ctx.setLineDash([6 / camera.scale, 5 / camera.scale]);
      ctx.stroke();

      if (markerIdsInRange.has(marker.id)) drawMarkerRangeTick(ctx, marker, base, camera.scale);

      const unitMembers = marker.groupingMode === "unit" ? getUnitMembers(marker.unitSlot) : [];
      drawLosMarkerLabel(ctx, marker, base, camera.scale, unitMembers.length > 2);

      if (isPrimaryActive && !activeUnitSlot) {
        ctx.setLineDash([]);
        const iconY = marker.y - base.ry - 18 / camera.scale;
        const showX = marker.x - 15 / camera.scale;
        const hideX = marker.x + 15 / camera.scale;
        const iconR = 11 / camera.scale;

        ctx.beginPath();
        ctx.arc(showX, iconY, iconR, 0, Math.PI * 2);
        ctx.fillStyle = marker.visible ? "rgba(34,197,94,.95)" : "rgba(100,116,139,.95)";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${11 / camera.scale}px system-ui`;
        ctx.fillText("👁", showX, iconY);

        ctx.beginPath();
        ctx.arc(hideX, iconY, iconR, 0, Math.PI * 2);
        ctx.fillStyle = marker.visible ? "rgba(100,116,139,.95)" : "rgba(239,68,68,.95)";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2 / camera.scale;
        ctx.beginPath();
        ctx.moveTo(hideX - 7 / camera.scale, iconY + 7 / camera.scale);
        ctx.lineTo(hideX + 7 / camera.scale, iconY - 7 / camera.scale);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${10 / camera.scale}px system-ui`;
        ctx.fillText("👁", hideX, iconY);
      }

      ctx.restore();
    });

    if (marqueeSelectionRef.current) {
      const rect = normalizedSelectionRect(marqueeSelectionRef.current.start, marqueeSelectionRef.current.current);
      ctx.save();
      ctx.fillStyle = "rgba(59,130,246,.16)";
      ctx.strokeStyle = "rgba(96,165,250,.95)";
      ctx.lineWidth = 1.5 / camera.scale;
      ctx.setLineDash([6 / camera.scale, 4 / camera.scale]);
      ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
      ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
      ctx.restore();
    }

    if (activeUnitSlot && pixelsPerInch) {
      const coherency = unitCoherency.get(activeUnitSlot);
      if (coherency) {
        const center = coherency.furthestPair
          ? {
            x: (coherency.furthestPair.a.x + coherency.furthestPair.b.x) / 2,
            y: (coherency.furthestPair.a.y + coherency.furthestPair.b.y) / 2,
          }
          : coherency.members[0];
        ctx.save();
        ctx.setLineDash([8 / camera.scale, 7 / camera.scale]);
        ctx.lineWidth = 3 / camera.scale;
        ctx.strokeStyle = coherency.coherent ? "rgba(34,197,94,.95)" : "rgba(239,68,68,.95)";
        ctx.beginPath();
        ctx.arc(center.x, center.y, 4.5 * pixelsPerInch, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Interactive wall controls are an overlay and must stay above objectives,
    // LOS markers, unit labels, and other battlefield artwork.
    const selectedWall = state.current.layoutWalls.find((wall) => wall.id === selectedLayoutWallId);
    if (selectedWall) {
      drawLayoutWallFloorControls(ctx, layoutWallFloorButtons(selectedWall), selectedWall.floorState || "ground", camera.scale);
    }
    const selectedTerrain = state.current.layoutTerrain.find((terrain) => terrain.id === selectedLayoutTerrainId);
    const terrainRelation = selectedTerrain ? selectedTerrainRelation() : null;
    if (selectedTerrain && terrainRelation) {
      drawLayoutTerrainRelationControls(ctx, layoutTerrainRelationButtons(selectedTerrain), terrainRelation.same, camera.scale);
    }

    ctx.restore();
    recordPerf("draw", drawStartedAt);
  }

  function calculateMarkerVisibility(marker, interactive = false, preparedGeometry = null) {
    const startedAt = performance.now();
    const clearZones = [];
    const oneWallZones = [];
    if (!marker || marker.visible === false) {
      recordPerf("markerVisibility", startedAt);
      return { clearZones, oneWallZones };
    }
    const visibleMarkerCount = state.current.losMarkers.filter((item) => item.visible !== false).length;
    const useReducedSamples = interactive || visibleMarkerCount > 5;
    const origins = interactive
      ? [{ x: marker.x, y: marker.y }]
      : getLOSOriginsForMarker(marker, useReducedSamples);
    const blockers = interactive && state.current.interactiveBlockers.length
      ? state.current.interactiveBlockers
      : state.current.blockers;
    const visibilityGeometry = preparedGeometry || getPreparedVisibilityGeometry(
      blockers,
      state.current.walls,
      state.current.W,
      state.current.H,
    );
    origins.forEach((origin) => {
      clearZones.push(computeVisibilityByFootprintWallLimit(origin, blockers, state.current.walls, state.current.W, state.current.H, 0, visibilityGeometry));
      oneWallZones.push(computeVisibilityByFootprintWallLimit(origin, blockers, state.current.walls, state.current.W, state.current.H, 1, visibilityGeometry));
    });
    recordPerf("markerVisibility", startedAt);
    return { clearZones, oneWallZones };
  }

  function cacheMarkerVisibility(markerId, visibility, interactive = false) {
    const marker = state.current.losMarkers.find((item) => item.id === markerId);
    state.current.losVisibilityCache.set(markerId, {
      key: marker ? markerVisibilityCacheKey(marker, interactive) : "",
      visibility,
    });
  }

  function markerVisibilityCacheKey(marker, interactive = false) {
    if (!marker) return "";
    return [
      state.current.visibilitySceneVersion,
      interactive ? "interactive" : "settled",
      marker.id,
      roundedNumber(marker.x, 2),
      roundedNumber(marker.y, 2),
      marker.baseShape || "circle",
      marker.baseLengthMm || 40,
      marker.baseWidthMm || marker.baseLengthMm || 40,
      roundedNumber(marker.baseRotation || 0, 4),
      marker.visible !== false,
      state.current.losMarkers.filter((item) => item.visible !== false).length > 5 ? "reduced" : "full",
    ].join(":");
  }

  function getCachedMarkerVisibility(marker, interactive = false) {
    const cached = state.current.losVisibilityCache.get(marker?.id);
    if (!cached) return null;
    if (cached.clearZones || cached.oneWallZones) return cached;
    return cached.key === markerVisibilityCacheKey(marker, interactive) ? cached.visibility : null;
  }

  function losRenderCacheKey(excludedMarkerIds) {
    const excluded = new Set(Array.isArray(excludedMarkerIds) ? excludedMarkerIds : [excludedMarkerIds].filter(Boolean));
    const visibleIds = state.current.losMarkers
      .filter((marker) => marker.visible !== false && !excluded.has(marker.id))
      .map((marker) => marker.id)
      .join("|");
    return `${[...excluded].sort().join("|")}:${visibleIds}:${currentVisibilitySceneKey()}`;
  }

  function zonesForMarkers(markers, interactive = false) {
    let clearZones = [];
    let oneWallZones = [];
    markers.forEach((marker) => {
      if (marker.visible === false) return;
      const cached = getCachedMarkerVisibility(marker, interactive);
      if (!cached) return;
      clearZones.push(...cached.clearZones);
      oneWallZones.push(...cached.oneWallZones);
    });
    return { clearZones, oneWallZones };
  }

  function rebuildCombinedVisibility(interactive = false, activeMarkerId = null) {
    const allVisibleMarkers = state.current.losMarkers.filter((marker) => marker.visible !== false);
    const activeMarkerIds = new Set(Array.isArray(activeMarkerId) ? activeMarkerId : [activeMarkerId].filter(Boolean));
    const activeMarkers = activeMarkerIds.size
      ? allVisibleMarkers.filter((marker) => activeMarkerIds.has(marker.id))
      : [];
    const stationaryMarkers = activeMarkerIds.size
      ? allVisibleMarkers.filter((marker) => !activeMarkerIds.has(marker.id))
      : allVisibleMarkers;
    const { clearZones, oneWallZones } = zonesForMarkers(allVisibleMarkers);
    state.current.visibility = { clearZones, oneWallZones };

    if (interactive && activeMarkerIds.size) {
      state.current.combinedLosRender = { clear: null, oneWall: null };
      const stationaryZones = zonesForMarkers(stationaryMarkers);
      const stationaryKey = losRenderCacheKey([...activeMarkerIds]);
      if (state.current.stationaryLosRenderKey !== stationaryKey) {
        state.current.stationaryLosRender = createCombinedLosLayers(
          stationaryZones.clearZones,
          stationaryZones.oneWallZones,
          state.current.W,
          state.current.H,
          0.7,
          state.current.stationaryLosBuffers,
          state.current.blockers,
        );
        state.current.stationaryLosRenderKey = stationaryKey;
      }
      let movingZones = zonesForMarkers(activeMarkers, true);
      if (!movingZones.clearZones.length && !movingZones.oneWallZones.length) {
        movingZones = zonesForMarkers(activeMarkers, false);
      }
      state.current.visibility = {
        clearZones: [...stationaryZones.clearZones, ...movingZones.clearZones],
        oneWallZones: [...stationaryZones.oneWallZones, ...movingZones.oneWallZones],
      };
      state.current.movingLosRender = createCombinedLosLayers(
        movingZones.clearZones,
        movingZones.oneWallZones,
        state.current.W,
        state.current.H,
        0.7,
        state.current.movingLosBuffers,
        state.current.blockers,
      );
      state.current.losRenderRevision += 1;
      return;
    }

    state.current.stationaryLosRender = { clear: null, oneWall: null };
    state.current.movingLosRender = { clear: null, oneWall: null };
    state.current.stationaryLosRenderKey = "";
    const renderScale = interactive ? 0.7 : 1;
    state.current.combinedLosRender = createCombinedLosLayers(
      clearZones,
      oneWallZones,
      state.current.W,
      state.current.H,
      renderScale,
      state.current.combinedLosBuffers,
      state.current.blockers,
    );
    state.current.losRenderRevision += 1;
  }

  function updateVisibility(markerId = null, recomputeDeployment = true, interactive = false) {
    const startedAt = performance.now();
    if (markerId) {
      const marker = state.current.losMarkers.find((item) => item.id === markerId);
      if (marker?.visible !== false) {
        const blockers = interactive && state.current.interactiveBlockers.length
          ? state.current.interactiveBlockers
          : state.current.blockers;
        const preparedGeometry = getPreparedVisibilityGeometry(blockers, state.current.walls, state.current.W, state.current.H);
        cacheMarkerVisibility(markerId, calculateMarkerVisibility(marker, interactive, preparedGeometry), interactive);
      }
      else rebuildCombinedVisibility();
    } else {
      const currentIds = new Set(state.current.losMarkers.map((marker) => marker.id));
      for (const cachedId of state.current.losVisibilityCache.keys()) {
        if (!currentIds.has(cachedId)) {
          state.current.losVisibilityCache.delete(cachedId);
        }
      }
      const visibleMarkers = state.current.losMarkers.filter((marker) => marker.visible !== false);
      state.current.losMarkers.forEach((marker) => {
        if (marker.visible === false) state.current.losVisibilityCache.delete(marker.id);
      });
      if (!requestDetailedMarkerVisibilityBatch(visibleMarkers)) {
        const preparedGeometry = getPreparedVisibilityGeometry(state.current.blockers, state.current.walls, state.current.W, state.current.H);
        visibleMarkers.forEach((marker) => {
          cacheMarkerVisibility(marker.id, calculateMarkerVisibility(marker, false, preparedGeometry));
        });
      }
    }

    rebuildCombinedVisibility(interactive, interactive ? markerId : null);
    if (interactive) updateEnemyLosPreviewStates();
    else updateEnemyLosStates(false, { forceImmediate: Boolean(markerId) });
    if (!recomputeDeployment) {
      recordPerf("visibility", startedAt);
      return;
    }

    recomputeDeploymentVisibility();
    recordPerf("visibility", startedAt);
  }

  function recomputeDeploymentVisibility() {
    const deployPath = state.current.deploymentPath?.length >= 2
      ? state.current.deploymentPath
      : (state.current.deploymentLine ? [state.current.deploymentLine.a, state.current.deploymentLine.b] : []);

    if (deployPath.length >= 2 && state.current.deploymentVisible) {
      const deploymentOrigins = samplePathPoints(deployPath, 8);
      const deploymentGeometry = getPreparedVisibilityGeometry(state.current.blockers, state.current.walls, state.current.W, state.current.H);
      state.current.deploymentVisibility = {
        clearZones: deploymentOrigins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 0, deploymentGeometry)),
        oneWallZones: deploymentOrigins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 1, deploymentGeometry)),
      };
    } else {
      state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
    }

    const enemyDeployPath = state.current.enemyDeploymentPath?.length >= 2
      ? state.current.enemyDeploymentPath
      : (state.current.enemyDeploymentLine ? [state.current.enemyDeploymentLine.a, state.current.enemyDeploymentLine.b] : []);

    if (enemyDeployPath.length >= 2 && state.current.enemyDeploymentVisible) {
      const deploymentOrigins = samplePathPoints(enemyDeployPath, 8);
      const deploymentGeometry = getPreparedVisibilityGeometry(state.current.blockers, state.current.walls, state.current.W, state.current.H);
      state.current.enemyDeploymentVisibility = {
        clearZones: deploymentOrigins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 0, deploymentGeometry)),
        oneWallZones: deploymentOrigins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 1, deploymentGeometry)),
      };
    } else {
      state.current.enemyDeploymentVisibility = { clearZones: [], oneWallZones: [] };
    }
  }

  function battlefieldPoint(x, y) {
    const { fit } = state.current;
    return {
      x: fit.x + (x / boardWidthInches()) * fit.w,
      y: fit.y + (y / boardHeightInches()) * fit.h,
    };
  }

  function worldToBattlefieldPoint(point) {
    const { fit } = state.current;
    return {
      x: (point.x - fit.x) / fit.w * boardWidthInches(),
      y: (point.y - fit.y) / fit.h * boardHeightInches(),
    };
  }

  function validBoardPoint(point) {
    return Number.isFinite(point?.x) && Number.isFinite(point?.y);
  }

  function mirroredBoardPoint(point) {
    return {
      x: boardWidthInches() - point.x,
      y: boardHeightInches() - point.y,
    };
  }

  function setDeploymentLabelBoardPosition(kind, point) {
    const mirrored = mirroredBoardPoint(point);
    if (kind === "enemy") {
      state.current.enemyDeploymentLabelPosition = { ...point };
      state.current.deploymentLabelPosition = mirrored;
    } else {
      state.current.deploymentLabelPosition = { ...point };
      state.current.enemyDeploymentLabelPosition = mirrored;
    }
  }

  function rotateLayoutPoint(x, y) {
    return { x: y, y: SOURCE_LAYOUT_WIDTH_INCHES - x };
  }

  function presetDeploymentPoint(preset, x, y) {
    const usesPortraitCoordinates = preset?.deploymentCoordinates === "portrait"
      || (preset?.deploymentCoordinates !== "landscape" && preset?.portraitCoordinates === true);
    const point = usesPortraitCoordinates ? { x, y } : rotateLayoutPoint(x, y);
    return battlefieldPoint(point.x, point.y);
  }

  function terrainLocalPolygonToWorld(terrain, localPolygon) {
    const angle = (terrain.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const mirror = terrain.mirrored ? -1 : 1;
    return localPolygon.map(([rawX, y]) => {
      const x = rawX * mirror;
      return battlefieldPoint(
        terrain.x + x * cos - y * sin,
        terrain.y + x * sin + y * cos,
      );
    });
  }

  function worldPointToTerrainLocal(terrain, point) {
    const { fit } = state.current;
    const battlefieldX = (point.x - fit.x) / fit.w * boardWidthInches();
    const battlefieldY = (point.y - fit.y) / fit.h * boardHeightInches();
    const dx = battlefieldX - terrain.x;
    const dy = battlefieldY - terrain.y;
    const angle = -(terrain.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const localX = dx * cos - dy * sin;
    return [terrain.mirrored ? -localX : localX, dx * sin + dy * cos];
  }

  function layoutWallLocalPolygon(wall) {
    const definition = LAYOUT_WALL_TYPES[wall.type] || LAYOUT_WALL_TYPES.AB;
    const halfWidth = definition.width / 2;
    const halfHeight = definition.height / 2;
    const thickness = definition.thickness;
    return [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [halfWidth - thickness, halfHeight],
      [halfWidth - thickness, -halfHeight + thickness],
      [-halfWidth, -halfHeight + thickness],
    ];
  }

  function layoutWallPolygonToWorld(wall) {
    return terrainLocalPolygonToWorld(wall, layoutWallLocalPolygon(wall));
  }

  function layoutFeatureLocalPolygon(feature) {
    const definition = LAYOUT_FEATURE_TYPES[feature.type] || LAYOUT_FEATURE_TYPES.rapidLight1;
    if (Array.isArray(definition.points) && definition.points.length >= 3) {
      return definition.points;
    }
    const halfWidth = definition.width / 2;
    const halfHeight = definition.height / 2;
    if (definition.shape === "l") {
      const thickness = definition.thickness;
      return [[-halfWidth, -halfHeight], [halfWidth, -halfHeight], [halfWidth, -halfHeight + thickness], [-halfWidth + thickness, -halfHeight + thickness], [-halfWidth + thickness, halfHeight], [-halfWidth, halfHeight]];
    }
    if (definition.shape === "u") {
      const thickness = definition.thickness;
      return [[-halfWidth, -halfHeight], [halfWidth, -halfHeight], [halfWidth, halfHeight], [halfWidth - thickness, halfHeight], [halfWidth - thickness, -halfHeight + thickness], [-halfWidth + thickness, -halfHeight + thickness], [-halfWidth + thickness, halfHeight], [-halfWidth, halfHeight]];
    }
    return [[-halfWidth, -halfHeight], [halfWidth, -halfHeight], [halfWidth, halfHeight], [-halfWidth, halfHeight]];
  }

  function layoutFeaturePolygonToWorld(feature) {
    return terrainLocalPolygonToWorld(feature, layoutFeatureLocalPolygon(feature));
  }

  function rebuildLayoutWallGeometry({ clearVisibility = true } = {}) {
    const manualWalls = state.current.walls.filter((wall) => !wall.generatedLayoutWall);
    const generatedWalls = [];
    state.current.layoutWalls.forEach((wall) => {
      if (wall.floorState === "firstFloor") return;
      const polygon = layoutWallPolygonToWorld(wall);
      polygon.forEach((point, index) => {
        generatedWalls.push({
          a: point,
          b: polygon[(index + 1) % polygon.length],
          generatedLayoutWall: true,
          wallPieceId: wall.id,
        });
      });
    });
    state.current.walls = [...manualWalls, ...generatedWalls];
    markVisibilityGeometryChanged({ base: false, foreground: true, clearVisibility });
  }

  function polygonsOverlapOrTouch(first, second) {
    if (!first?.length || !second?.length) return false;
    if (first.some((point) => pointInPoly(point, second))) return true;
    if (second.some((point) => pointInPoly(point, first))) return true;
    for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
      const firstA = first[firstIndex];
      const firstB = first[(firstIndex + 1) % first.length];
      for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
        const secondA = second[secondIndex];
        const secondB = second[(secondIndex + 1) % second.length];
        if (segmentIntersectionParameters(firstA, firstB, secondA, secondB)) return true;
      }
    }
    return false;
  }

  function markerVisibilityTouchesWall(marker, wallPolygon) {
    const visibility = getCachedMarkerVisibility(marker, false);
    if (!visibility) return true;
    return [...(visibility.clearZones || []), ...(visibility.oneWallZones || [])]
      .some((zone) => polygonsOverlapOrTouch(zone, wallPolygon));
  }

  function setSelectedWallFloorState(floorState) {
    const wall = state.current.layoutWalls.find((item) => item.id === selectedLayoutWallId);
    if (!wall) return;
    if ((wall.floorState || "ground") === floorState) {
      setSelectedLayoutWallId(null);
      draw();
      return;
    }
    const wallPolygon = layoutWallPolygonToWorld(wall);
    const visibleMarkers = state.current.losMarkers.filter((marker) => marker.visible !== false);
    const affectedMarkers = visibleMarkers.filter((marker) => markerVisibilityTouchesWall(marker, wallPolygon));
    const affectedIds = new Set(affectedMarkers.map((marker) => marker.id));
    const preservedVisibility = visibleMarkers
      .filter((marker) => !affectedIds.has(marker.id))
      .map((marker) => [marker.id, getCachedMarkerVisibility(marker, false)])
      .filter(([, visibility]) => visibility);
    wall.floorState = floorState;
    rebuildLayoutWallGeometry({ clearVisibility: false });
    preservedVisibility.forEach(([markerId, visibility]) => cacheMarkerVisibility(markerId, visibility, false));
    affectedMarkers.forEach((marker) => state.current.losVisibilityCache.delete(marker.id));
    rebuildCombinedVisibility(false);
    recomputeDeploymentVisibility();
    if (affectedMarkers.length) {
      if (!requestDetailedMarkerVisibilityBatch(affectedMarkers, { forceRequest: true })) {
        const preparedGeometry = getPreparedVisibilityGeometry(state.current.blockers, state.current.walls, state.current.W, state.current.H);
        affectedMarkers.forEach((marker) => {
          cacheMarkerVisibility(marker.id, calculateMarkerVisibility(marker, false, preparedGeometry), false);
        });
        rebuildCombinedVisibility(false);
        updateEnemyLosStates(false, { forceImmediate: true });
      }
    }
    setSelectedLayoutWallId(null);
    setSelectedLayoutFeatureId(null);
    draw();
    scheduleBrowserSave();
    setStatus(`${wall.type} wall set to ${floorState === "firstFloor" ? "1st Floor" : "Ground"}.`);
  }

  function rebuildLayoutTerrainGeometry() {
    const blockers = [];
    const blockerIds = [];
    const trianglePolys = [];
    const boundaryTolerance = state.current.fit.w / boardWidthInches() * 0.08;

    state.current.layoutTerrain.forEach((terrain) => {
      const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
      const exactOutline = terrainLocalPolygonToWorld(terrain, terrain.outer || definition.outer);
      const group = state.current.layoutTerrainGroups.find((items) => items.includes(terrain.id));
      exactOutline.footprintGroupId = group
        ? `layout-group:${[...group].sort().join("|")}`
        : terrain.id;
      exactOutline.sharedBoundaryTolerance = boundaryTolerance;
      if (terrain.shape === "right_triangle" && !group) trianglePolys.push({ id: terrain.id, poly: exactOutline });
      else {
        blockers.push(exactOutline);
        blockerIds.push(terrain.id);
      }
    });

    if (trianglePolys.length === 2 && polygonsTouchOrNear(
      trianglePolys[0].poly,
      trianglePolys[1].poly,
      state.current.fit.w / boardWidthInches(),
    )) {
      const trianglePair = unionPolygonBoundary(trianglePolys[0].poly, trianglePolys[1].poly);
      trianglePair.footprintGroupId = "layout-triangle-pair";
      blockers.push(trianglePair);
      blockerIds.push("layout-triangle-pair");
    } else trianglePolys.forEach((terrain) => {
      blockers.push(terrain.poly);
      blockerIds.push(terrain.id);
    });

    sealTouchingPolygonVertices(blockers, boundaryTolerance);
    state.current.blockers = blockers;
    state.current.blockerIds = blockerIds;
    state.current.interactiveBlockers = blockers.map((poly) => {
      const simplified = simplifyClosedPolygon(poly, 5);
      simplified.footprintGroupId = poly.footprintGroupId;
      simplified.sharedBoundaryTolerance = poly.sharedBoundaryTolerance;
      return simplified;
    });
    markVisibilityGeometryChanged({ base: true, foreground: true });
  }

  function refreshActiveLayoutGeometry() {
    const preset = layoutPresetForKey(state.current.activeLayoutKey);
    if (!preset) return;
    rebuildLayoutTerrainGeometry();
    rebuildLayoutWallGeometry();
    const existingObjectives = state.current.layoutObjectives;
    state.current.layoutObjectives = (preset.objectives || []).map((objective, index) => {
      const fallbackId = objective.id || `layout-objective-${index}`;
      const existing = existingObjectives.find((item) => item.id === fallbackId || item.id === `layout-objective-${index}`);
      const point = existing && Number.isFinite(existing.boardX) && Number.isFinite(existing.boardY)
        ? { x: existing.boardX, y: existing.boardY }
        : Number.isFinite(objective.boardX) && Number.isFinite(objective.boardY)
          ? { x: objective.boardX, y: objective.boardY }
        : preset.portraitCoordinates && Number.isFinite(objective.x) && Number.isFinite(objective.y)
          ? { x: objective.x, y: objective.y }
          : rotateLayoutPoint(objective.x, objective.y);
      return {
        id: fallbackId,
        ...battlefieldPoint(point.x, point.y),
        boardX: point.x,
        boardY: point.y,
        allegiance: objective.allegiance || "neutral",
        shape: objective.shape || (objective.allegiance === "neutral" && index !== 2 ? "diamond" : "circle"),
        visible: objective.visible !== false,
      };
    });
    const homeDeploymentPath = Array.isArray(preset.homeDeploymentPath) ? preset.homeDeploymentPath : [];
    const enemyDeploymentPath = Array.isArray(preset.enemyDeploymentPath) ? preset.enemyDeploymentPath : [];
    state.current.deploymentPath = homeDeploymentPath.map(([x, y]) => presetDeploymentPoint(preset, x, y));
    state.current.deploymentLine = state.current.deploymentPath.length >= 2
      ? { a: state.current.deploymentPath[0], b: state.current.deploymentPath[state.current.deploymentPath.length - 1] }
      : null;
    state.current.enemyDeploymentPath = enemyDeploymentPath.map(([x, y]) => presetDeploymentPoint(preset, x, y));
    state.current.enemyDeploymentLine = state.current.enemyDeploymentPath.length >= 2
      ? { a: state.current.enemyDeploymentPath[0], b: state.current.enemyDeploymentPath[state.current.enemyDeploymentPath.length - 1] }
      : null;
  }

  function rotateSelectedLayoutTerrain(deltaDegrees) {
    const feature = state.current.layoutFeaturePieces.find((item) => item.id === selectedLayoutFeatureId);
    if (feature) {
      feature.rotation = ((feature.rotation || 0) + deltaDegrees + 360) % 360;
      syncLinkedLayoutFeature(feature);
      draw();
      scheduleBrowserSave();
      return;
    }
    const wall = state.current.layoutWalls.find((item) => item.id === selectedLayoutWallId);
    if (wall) {
      wall.rotation = ((wall.rotation || 0) + deltaDegrees + 360) % 360;
      syncLinkedLayoutWall(wall);
      rebuildLayoutWallGeometry();
      updateVisibility();
      draw();
      scheduleBrowserSave();
      return;
    }
    const terrain = state.current.layoutTerrain.find((item) => item.id === selectedLayoutTerrainId);
    if (!terrain) {
      setStatus("Select a terrain footprint in Edit Layout mode first.");
      return;
    }
    terrain.rotation = (terrain.rotation + deltaDegrees + 360) % 360;
    syncLinkedLayoutTerrain(terrain);
    rebuildLayoutTerrainGeometry();
    updateVisibility();
    draw();
    scheduleBrowserSave();
  }

  function mirrorSelectedLayoutTerrain() {
    const feature = state.current.layoutFeaturePieces.find((item) => item.id === selectedLayoutFeatureId);
    if (feature) {
      feature.mirrored = !feature.mirrored;
      syncLinkedLayoutFeature(feature, true);
      draw();
      scheduleBrowserSave();
      setStatus(`${LAYOUT_FEATURE_TYPES[feature.type]?.label || "Terrain feature"} ${feature.mirrored ? "mirrored" : "restored"}.`);
      return;
    }
    const wall = state.current.layoutWalls.find((item) => item.id === selectedLayoutWallId);
    if (wall) {
      wall.mirrored = !wall.mirrored;
      syncLinkedLayoutWall(wall, true);
      rebuildLayoutWallGeometry();
      updateVisibility();
      draw();
      scheduleBrowserSave();
      setStatus(`${wall.type} wall ${wall.mirrored ? "mirrored" : "restored"}.`);
      return;
    }
    const terrain = state.current.layoutTerrain.find((item) => item.id === selectedLayoutTerrainId);
    if (!terrain) {
      setStatus("Select a terrain footprint in Edit Layout mode first.");
      return;
    }
    terrain.mirrored = !terrain.mirrored;
    syncLinkedLayoutTerrain(terrain, true);
    rebuildLayoutTerrainGeometry();
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`Selected terrain ${terrain.mirrored ? "mirrored" : "restored"}.`);
  }

  function linkedLayoutTerrainId(id) {
    const link = state.current.layoutTerrainLinks.find(([firstId, secondId]) => firstId === id || secondId === id);
    if (!link) return null;
    return link[0] === id ? link[1] : link[0];
  }

  function layoutTerrainGroupFor(id) {
    return state.current.layoutTerrainGroups.find((group) => group.includes(id)) || null;
  }

  function adjacentLayoutTerrainFor(id) {
    const terrain = state.current.layoutTerrain.find((item) => item.id === id);
    if (!terrain) return null;
    const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
    const polygon = terrainLocalPolygonToWorld(terrain, terrain.outer || definition.outer);
    const inchesToPixels = state.current.fit.w / boardWidthInches();
    const tolerance = inchesToPixels * 0.08;
    const minimumContact = inchesToPixels * 0.25;
    let best = null;
    state.current.layoutTerrain.forEach((candidate) => {
      if (candidate.id === id) return;
      const candidateDefinition = TERRAIN_FOOTPRINTS[candidate.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
      const candidatePolygon = terrainLocalPolygonToWorld(candidate, candidate.outer || candidateDefinition.outer);
      const contact = approximatePolygonBoundaryContact(polygon, candidatePolygon, tolerance, inchesToPixels * 0.05);
      if (contact >= minimumContact && (!best || contact > best.contact)) best = { terrain: candidate, contact };
    });
    return best?.terrain || null;
  }

  function selectedTerrainRelation() {
    if (!selectedLayoutTerrainId) return null;
    const group = layoutTerrainGroupFor(selectedLayoutTerrainId);
    if (group) {
      const partnerId = group.find((id) => id !== selectedLayoutTerrainId);
      return { same: true, partner: state.current.layoutTerrain.find((terrain) => terrain.id === partnerId) || null };
    }
    const partner = adjacentLayoutTerrainFor(selectedLayoutTerrainId);
    return partner ? { same: false, partner } : null;
  }

  function setSelectedTerrainFootprintRelation(sameFootprint) {
    const relation = selectedTerrainRelation();
    if (!selectedLayoutTerrainId || !relation?.partner) {
      setStatus("Place two footprint outlines together for at least 0.25 inches first.");
      return;
    }
    const selectedId = selectedLayoutTerrainId;
    const partnerId = relation.partner.id;
    const involvedGroups = state.current.layoutTerrainGroups.filter((group) => group.includes(selectedId) || group.includes(partnerId));
    state.current.layoutTerrainGroups = state.current.layoutTerrainGroups.filter((group) => !involvedGroups.includes(group));
    if (sameFootprint) {
      const merged = [...new Set([selectedId, partnerId, ...involvedGroups.flat()])];
      state.current.layoutTerrainGroups.push(merged);
    } else {
      involvedGroups.forEach((group) => {
        const remainder = group.filter((id) => id !== selectedId);
        if (remainder.length >= 2) state.current.layoutTerrainGroups.push(remainder);
      });
    }
    rebuildLayoutTerrainGeometry();
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setLayoutTerrainRelationVersion((version) => version + 1);
    setStatus(sameFootprint ? "The touching pieces now count as one footprint for LOS." : "The touching pieces now count as separate footprints for LOS.");
  }

  function linkedLayoutWallId(id) {
    const link = state.current.layoutWallLinks.find(([firstId, secondId]) => firstId === id || secondId === id);
    if (!link) return null;
    return link[0] === id ? link[1] : link[0];
  }

  function linkedLayoutFeatureId(id) {
    const link = state.current.layoutFeatureLinks.find(([firstId, secondId]) => firstId === id || secondId === id);
    if (!link) return null;
    return link[0] === id ? link[1] : link[0];
  }

  function syncLinkedLayoutTerrain(source, syncMirrored = false) {
    const linkedId = linkedLayoutTerrainId(source.id);
    if (!linkedId) return;
    const linked = state.current.layoutTerrain.find((terrain) => terrain.id === linkedId);
    if (!linked) return;
    linked.x = boardWidthInches() - source.x;
    linked.y = boardHeightInches() - source.y;
    linked.rotation = ((source.rotation || 0) + 180) % 360;
    if (syncMirrored) linked.mirrored = source.mirrored === true;
  }

  function syncLinkedLayoutWall(source, syncMirrored = false) {
    const linkedId = linkedLayoutWallId(source.id);
    if (!linkedId) return;
    const linked = state.current.layoutWalls.find((wall) => wall.id === linkedId);
    if (!linked) return;
    linked.x = boardWidthInches() - source.x;
    linked.y = boardHeightInches() - source.y;
    linked.rotation = ((source.rotation || 0) + 180) % 360;
    if (syncMirrored) linked.mirrored = source.mirrored === true;
  }

  function syncLinkedLayoutFeature(source, syncMirrored = false) {
    const linkedId = linkedLayoutFeatureId(source.id);
    if (!linkedId) return;
    const linked = state.current.layoutFeaturePieces.find((feature) => feature.id === linkedId);
    if (!linked) return;
    linked.x = boardWidthInches() - source.x;
    linked.y = boardHeightInches() - source.y;
    linked.rotation = ((source.rotation || 0) + 180) % 360;
    if (syncMirrored) linked.mirrored = source.mirrored === true;
  }

  function beginLayoutTerrainLinking() {
    if (!layoutEditMode || !state.current.layoutTerrain.length) {
      setStatus("Apply a layout and enter Edit Layout mode before linking footprints.");
      return;
    }
    const nextActive = !layoutLinkMode;
    setLayoutLinkMode(nextActive);
    setFirstLinkedTerrainId(null);
    setFirstLinkedWallId(null);
    setFirstLinkedFeatureId(null);
    setStatus(nextActive ? "Link mode: select the controlling footprint, wall, or terrain feature first." : "Link mode cancelled.");
  }

  function selectTerrainForLink(terrain) {
    if (firstLinkedWallId || firstLinkedFeatureId) {
      setStatus("The linked pair must both be the same category and type.");
      return;
    }
    if (linkedLayoutTerrainId(terrain.id)) {
      setStatus("That terrain footprint is already linked. Remove links before pairing it again.");
      return;
    }
    if (!firstLinkedTerrainId) {
      setFirstLinkedTerrainId(terrain.id);
      setSelectedLayoutTerrainId(terrain.id);
      setStatus("First terrain selected. Now select its matching partner.");
      draw();
      return;
    }
    const first = state.current.layoutTerrain.find((item) => item.id === firstLinkedTerrainId);
    if (!first || first.id === terrain.id) {
      setStatus("Select a different matching terrain footprint as the partner.");
      return;
    }
    if (first.shape !== terrain.shape || (first.mirrored === true) !== (terrain.mirrored === true)) {
      setStatus("Only matching footprint types with the same mirrored state can be linked.");
      return;
    }
    state.current.layoutTerrainLinks.push([first.id, terrain.id]);
    syncLinkedLayoutTerrain(first);
    rebuildLayoutTerrainGeometry();
    updateVisibility();
    setSelectedLayoutTerrainId(terrain.id);
    setFirstLinkedTerrainId(null);
    setLayoutLinkMode(false);
    setStatus("Terrain footprints linked. Moving or rotating either one will update its partner.");
    draw();
    scheduleBrowserSave();
  }

  function selectWallForLink(wall) {
    if (firstLinkedTerrainId || firstLinkedFeatureId) {
      setStatus("The linked pair must both be the same category and type.");
      return;
    }
    if (linkedLayoutWallId(wall.id)) {
      setStatus("That wall is already linked. Remove links before pairing it again.");
      return;
    }
    if (!firstLinkedWallId) {
      setFirstLinkedWallId(wall.id);
      setSelectedLayoutWallId(wall.id);
      setStatus("First wall selected. Now select its matching partner.");
      draw();
      return;
    }
    const first = state.current.layoutWalls.find((item) => item.id === firstLinkedWallId);
    if (!first || first.id === wall.id) {
      setStatus("Select a different matching wall as the partner.");
      return;
    }
    if (first.type !== wall.type || (first.mirrored === true) !== (wall.mirrored === true)) {
      setStatus("Only matching wall types with the same mirrored state can be linked.");
      return;
    }
    state.current.layoutWallLinks.push([first.id, wall.id]);
    syncLinkedLayoutWall(first);
    rebuildLayoutWallGeometry();
    updateVisibility();
    setSelectedLayoutWallId(wall.id);
    setFirstLinkedWallId(null);
    setLayoutLinkMode(false);
    setStatus("Walls linked. Moving or rotating either one will update its partner.");
    draw();
    scheduleBrowserSave();
  }

  function selectFeatureForLink(feature) {
    if (firstLinkedTerrainId || firstLinkedWallId) {
      setStatus("The linked pair must both be the same category and type.");
      return;
    }
    if (linkedLayoutFeatureId(feature.id)) {
      setStatus("That terrain feature is already linked. Remove links before pairing it again.");
      return;
    }
    if (!firstLinkedFeatureId) {
      setFirstLinkedFeatureId(feature.id);
      setSelectedLayoutFeatureId(feature.id);
      setStatus("First terrain feature selected. Now select its matching partner.");
      draw();
      return;
    }
    const first = state.current.layoutFeaturePieces.find((item) => item.id === firstLinkedFeatureId);
    if (!first || first.id === feature.id) {
      setStatus("Select a different matching terrain feature as the partner.");
      return;
    }
    if (first.type !== feature.type || (first.mirrored === true) !== (feature.mirrored === true)) {
      setStatus("Only matching terrain feature types with the same mirrored state can be linked.");
      return;
    }
    state.current.layoutFeatureLinks.push([first.id, feature.id]);
    syncLinkedLayoutFeature(first);
    setSelectedLayoutFeatureId(feature.id);
    setFirstLinkedFeatureId(null);
    setLayoutLinkMode(false);
    setStatus("Terrain features linked. Moving or rotating either one will update its partner.");
    draw();
    scheduleBrowserSave();
  }

  function removeLayoutTerrainLinks() {
    state.current.layoutTerrainLinks = [];
    state.current.layoutWallLinks = [];
    state.current.layoutFeatureLinks = [];
    setLayoutLinkMode(false);
    setFirstLinkedTerrainId(null);
    setFirstLinkedWallId(null);
    setFirstLinkedFeatureId(null);
    setStatus("All layout links removed. Existing positions were kept.");
    draw();
    scheduleBrowserSave();
  }

  function removeLayoutTerrainById(id) {
    const index = state.current.layoutTerrain.findIndex((terrain) => terrain.id === id);
    if (index < 0) return null;
    const [removed] = state.current.layoutTerrain.splice(index, 1);
    state.current.layoutTerrainLinks = state.current.layoutTerrainLinks.filter((link) => !link.includes(removed.id));
    state.current.layoutTerrainGroups = state.current.layoutTerrainGroups
      .map((group) => group.filter((terrainId) => terrainId !== removed.id))
      .filter((group) => group.length >= 2);
    removeStickyRulersForTarget({ type: "footprint", id: removed.id });
    if (selectedLayoutTerrainId === removed.id) setSelectedLayoutTerrainId(null);
    if (firstLinkedTerrainId === removed.id) setFirstLinkedTerrainId(null);
    setLayoutTerrainRelationVersion((version) => version + 1);
    rebuildLayoutTerrainGeometry();
    updateVisibility();
    return removed;
  }

  function addLayoutTerrainFootprint(shape) {
    const definition = TERRAIN_FOOTPRINTS[shape];
    if (!definition) return;
    const stagingPosition = nextLayoutStagingPosition(definition.width);
    const terrain = {
      id: `layout-terrain-${shape}-${Date.now()}-${state.current.layoutTerrain.length}`,
      shape,
      x: stagingPosition.x,
      y: stagingPosition.y,
      rotation: 0,
      mirrored: false,
      footprint: definition.footprint,
      outer: definition.outer,
    };
    state.current.layoutTerrain.push(terrain);
    setSelectedLayoutTerrainId(terrain.id);
    setSelectedLayoutWallId(null);
    setSelectedLayoutFeatureId(null);
    setSelectedLayoutObjectiveId(null);
    setLayoutEditMode(true);
    setLayoutTerrainRelationVersion((version) => version + 1);
    rebuildLayoutTerrainGeometry();
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${definition.label} footprint added to the staging area left of the battlefield. Drag it into position.`);
  }

  function removeOneLayoutTerrainFootprint(shape) {
    const index = state.current.layoutTerrain.findLastIndex((terrain) => terrain.shape === shape);
    if (index < 0) {
      const definition = TERRAIN_FOOTPRINTS[shape];
      setStatus(`${definition?.label || "That"} footprint is not on this layout.`);
      return;
    }
    const removed = removeLayoutTerrainById(state.current.layoutTerrain[index].id);
    if (!removed) return;
    draw();
    scheduleBrowserSave();
    const definition = TERRAIN_FOOTPRINTS[shape];
    setStatus(`${definition?.label || "Terrain"} footprint removed.`);
  }

  function addLayoutWall(type) {
    const definition = LAYOUT_WALL_TYPES[type];
    if (!definition) return;
    const stagingPosition = nextLayoutStagingPosition(definition.width);
    const wall = {
      id: `layout-wall-${type}-${Date.now()}-${state.current.layoutWalls.length}`,
      type,
      x: stagingPosition.x,
      y: stagingPosition.y,
      rotation: 0,
      mirrored: false,
      floorState: "ground",
    };
    state.current.layoutWalls.push(wall);
    setSelectedLayoutWallId(wall.id);
    setSelectedLayoutTerrainId(null);
    setSelectedLayoutObjectiveId(null);
    setLayoutEditMode(true);
    rebuildLayoutWallGeometry();
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${definition.label} wall added to the staging area left of the battlefield. Drag it into position.`);
  }

  function addLayoutFeature(type) {
    const definition = LAYOUT_FEATURE_TYPES[type];
    if (!definition) return;
    const stagingPosition = nextLayoutStagingPosition(definition.width);
    const feature = {
      id: `layout-feature-${type}-${Date.now()}-${state.current.layoutFeaturePieces.length}`,
      type,
      x: stagingPosition.x,
      y: stagingPosition.y,
      rotation: 0,
      mirrored: false,
    };
    state.current.layoutFeaturePieces.push(feature);
    setSelectedLayoutFeatureId(feature.id);
    setSelectedLayoutWallId(null);
    setSelectedLayoutTerrainId(null);
    setSelectedLayoutObjectiveId(null);
    setLayoutEditMode(true);
    draw();
    scheduleBrowserSave();
    setStatus(`${definition.button.replace("Add ", "")} added to the staging area left of the battlefield. Drag it into position.`);
  }

  function addLayoutObjective(allegiance, shape, label) {
    if (!state.current.activeLayoutKey) {
      setStatus("Apply the selected layout before adding objective markers.");
      return;
    }
    const stagingPosition = nextLayoutStagingPosition(2.5);
    const position = battlefieldPoint(stagingPosition.x, stagingPosition.y);
    const objective = {
      id: `layout-objective-${Date.now()}-${state.current.layoutObjectives.length}`,
      ...position,
      boardX: stagingPosition.x,
      boardY: stagingPosition.y,
      allegiance,
      shape,
      visible: true,
    };
    state.current.layoutObjectives.push(objective);
    setSelectedLayoutObjectiveId(objective.id);
    setSelectedLayoutTerrainId(null);
    setSelectedLayoutWallId(null);
    setSelectedLayoutFeatureId(null);
    setLayoutEditMode(true);
    draw();
    scheduleBrowserSave();
    setStatus(`${label} added to the staging area left of the battlefield. Drag it onto a terrain footprint.`);
  }

  function nextLayoutStagingPosition(pieceWidth = 2) {
    const index = state.current.layoutStagingIndex || 0;
    state.current.layoutStagingIndex = index + 1;
    return {
      x: -(pieceWidth / 2 + 0.75),
      y: 5 + (index % 9) * 6,
    };
  }

  function currentLayoutFixture() {
    return {
      version: 11,
      type: "layout",
      exportedAt: new Date().toISOString(),
      battlefieldOrientation: "portrait-44x60",
      boardWidthInches: boardWidthInches(),
      boardHeightInches: boardHeightInches(),
      defenderForceDisposition,
      attackerForceDisposition,
      selectedLayoutVariant,
      activeLayoutKey: state.current.activeLayoutKey,
      terrain: state.current.layoutTerrain.map(({ id, shape, x, y, rotation, mirrored }) => ({ id, shape, x, y, rotation, mirrored: mirrored === true })),
      terrainLinks: state.current.layoutTerrainLinks.map((link) => [...link]),
      terrainGroups: state.current.layoutTerrainGroups.map((group) => [...group]),
      wallPieces: state.current.layoutWalls.map(({ id, type, x, y, rotation, mirrored, floorState }) => ({ id, type, x, y, rotation, mirrored: mirrored === true, floorState: floorState === "firstFloor" ? "firstFloor" : "ground" })),
      wallLinks: state.current.layoutWallLinks.map((link) => [...link]),
      terrainFeatures: state.current.layoutTerrainFeatures.map((feature) => ({ ...feature, points: feature.points.map((point) => ({ ...point })) })),
      featurePieces: state.current.layoutFeaturePieces.map(({ id, type, x, y, rotation, mirrored }) => ({ id, type, x, y, rotation, mirrored: mirrored === true })),
      featureLinks: state.current.layoutFeatureLinks.map((link) => [...link]),
      deploymentLabelPosition: state.current.deploymentLabelPosition ? { ...state.current.deploymentLabelPosition } : null,
      enemyDeploymentLabelPosition: state.current.enemyDeploymentLabelPosition ? { ...state.current.enemyDeploymentLabelPosition } : null,
      homeDeploymentPath: state.current.deploymentPath.map((point) => {
        const boardPoint = worldToBattlefieldPoint(point);
        return [boardPoint.x, boardPoint.y];
      }),
      enemyDeploymentPath: state.current.enemyDeploymentPath.map((point) => {
        const boardPoint = worldToBattlefieldPoint(point);
        return [boardPoint.x, boardPoint.y];
      }),
      objectives: state.current.layoutObjectives.map((objective) => ({
        id: objective.id,
        boardX: Number.isFinite(objective.boardX) ? objective.boardX : worldToBattlefieldPoint(objective).x,
        boardY: Number.isFinite(objective.boardY) ? objective.boardY : worldToBattlefieldPoint(objective).y,
        allegiance: objective.allegiance,
        shape: objective.shape,
        visible: objective.visible !== false,
      })),
      walls: state.current.walls.filter((wall) => !wall.generatedLayoutWall).map((wall) => ({
        a: worldToBattlefieldPoint(wall.a),
        b: worldToBattlefieldPoint(wall.b),
      })),
    };
  }

  function downloadJsonFile(data, fallbackName) {
    const fileSafeName = fallbackName
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileSafeName || "warhammer-los-export"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function saveLayoutFixture() {
    if (!state.current.layoutTerrain.length) {
      setStatus("Apply a layout before saving its fixture positions.");
      return;
    }
    const key = `warhammer-layout-fixture:v11:${defenderForceDisposition}|${attackerForceDisposition}|${selectedLayoutVariant}`;
    const fixture = currentLayoutFixture();
    localStorage.setItem(key, JSON.stringify(fixture));
    setStatus("Terrain, reusable walls, and objective fixture positions saved.");
  }

  function downloadLayoutFixture() {
    if (!state.current.layoutTerrain.length && !state.current.layoutWalls.length && !state.current.layoutFeaturePieces.length && !state.current.layoutObjectives.length) {
      setStatus("Load or create a layout before downloading it.");
      return;
    }
    const fixture = currentLayoutFixture();
    const fileSafeName = `${defenderForceDisposition}-${attackerForceDisposition}-Layout-${selectedLayoutVariant}`
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "");
    downloadJsonFile(fixture, fileSafeName || "layout-fixture");
    setStatus("Layout JSON exported.");
  }

  function exportGameJson() {
    const data = {
      ...buildSaveData(),
      savedImageSrc: state.current.savedImageSrc || null,
      saveName,
    };
    const fileSafeName = `${saveName || defenderForceDisposition + "-" + attackerForceDisposition + "-Game"}`
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "");
    downloadJsonFile(data, fileSafeName || "warhammer-los-game");
    setStatus("Game JSON exported.");
  }

  function isLayoutJsonPayload(data) {
    if (!data || typeof data !== "object") return false;
    if (data.type === "layout") return true;
    return Array.isArray(data.terrain)
      && !Array.isArray(data.losMarkers)
      && !Array.isArray(data.enemies);
  }

  function applyImportedLayoutData(data) {
    const fixture = data.layout || data.fixture || data;
    if (!fixture || typeof fixture !== "object" || !Array.isArray(fixture.terrain)) {
      setStatus("That JSON does not look like a layout export.");
      return;
    }
    const hasExistingLayout = state.current.layoutTerrain.length
      || state.current.layoutWalls.length
      || state.current.layoutFeaturePieces.length
      || state.current.layoutObjectives.length
      || state.current.deploymentPath.length
      || state.current.enemyDeploymentPath.length;
    if (hasExistingLayout && !window.confirm("Importing this layout will replace the current map layout. Continue?")) return;

    state.current.boardWidthInches = Number(fixture.boardWidthInches) || BATTLEFIELD_WIDTH_INCHES;
    state.current.boardHeightInches = Number(fixture.boardHeightInches) || BATTLEFIELD_HEIGHT_INCHES;
    setCustomGridLength(state.current.boardWidthInches);
    setCustomGridWidth(state.current.boardHeightInches);
    calculateFit();
    if (FORCE_DISPOSITIONS.includes(fixture.defenderForceDisposition)) setDefenderForceDisposition(fixture.defenderForceDisposition);
    if (FORCE_DISPOSITIONS.includes(fixture.attackerForceDisposition)) setAttackerForceDisposition(fixture.attackerForceDisposition);
    if (["A", "B", "C"].includes(fixture.selectedLayoutVariant)) setSelectedLayoutVariant(fixture.selectedLayoutVariant);

    imgRef.current = null;
    state.current.savedImageSrc = null;
    state.current.blockers = [];
    state.current.blockerIds = [];
    state.current.walls = Array.isArray(fixture.walls)
      ? fixture.walls.map((wall) => ({
        a: battlefieldPoint(wall.a.x, wall.a.y),
        b: battlefieldPoint(wall.b.x, wall.b.y),
      }))
      : [];
    state.current.layoutTerrain = fixture.terrain.map((terrain, index) => {
      const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
      return {
        id: terrain.id || `layout-footprint-${index}`,
        shape: terrain.shape,
        x: Number(terrain.x) || 0,
        y: Number(terrain.y) || 0,
        rotation: Number(terrain.rotation) || 0,
        mirrored: terrain.mirrored === true,
        width: definition.width,
        height: definition.height,
        outer: undefined,
      };
    });
    state.current.layoutTerrainLinks = Array.isArray(fixture.terrainLinks) ? fixture.terrainLinks.filter((link) => Array.isArray(link) && link.length === 2).map((link) => [...link]) : [];
    state.current.layoutTerrainGroups = Array.isArray(fixture.terrainGroups) ? fixture.terrainGroups.filter((group) => Array.isArray(group) && group.length >= 2).map((group) => [...group]) : [];
    state.current.layoutWalls = Array.isArray(fixture.wallPieces) ? fixture.wallPieces.map((wall, index) => ({
      id: wall.id || `layout-wall-${wall.type || "AB"}-${index}`,
      type: wall.type || "AB",
      x: Number(wall.x) || 0,
      y: Number(wall.y) || 0,
      rotation: Number(wall.rotation) || 0,
      mirrored: wall.mirrored === true,
      floorState: wall.floorState === "firstFloor" ? "firstFloor" : "ground",
    })) : [];
    state.current.layoutWallLinks = Array.isArray(fixture.wallLinks) ? fixture.wallLinks.filter((link) => Array.isArray(link) && link.length === 2).map((link) => [...link]) : [];
    state.current.layoutTerrainFeatures = Array.isArray(fixture.terrainFeatures)
      ? fixture.terrainFeatures.map((feature) => ({ ...feature, points: Array.isArray(feature.points) ? feature.points.map((point) => ({ ...point })) : [] }))
      : [];
    state.current.layoutFeaturePieces = Array.isArray(fixture.featurePieces) ? fixture.featurePieces.map((feature, index) => ({
      id: feature.id || `layout-feature-${feature.type || "rapidLight1"}-${index}`,
      type: feature.type || "rapidLight1",
      x: Number(feature.x) || 0,
      y: Number(feature.y) || 0,
      rotation: Number(feature.rotation) || 0,
      mirrored: feature.mirrored === true,
    })) : [];
    state.current.layoutFeatureLinks = Array.isArray(fixture.featureLinks) ? fixture.featureLinks.filter((link) => Array.isArray(link) && link.length === 2).map((link) => [...link]) : [];
    state.current.layoutObjectives = Array.isArray(fixture.objectives) ? fixture.objectives.map((objective, index) => {
      const boardX = Number.isFinite(objective.boardX) ? objective.boardX : Number(objective.x) || 0;
      const boardY = Number.isFinite(objective.boardY) ? objective.boardY : Number(objective.y) || 0;
      return {
        id: objective.id || `layout-objective-${index}`,
        ...battlefieldPoint(boardX, boardY),
        boardX,
        boardY,
        allegiance: objective.allegiance || "neutral",
        shape: objective.shape || "circle",
        visible: objective.visible !== false,
      };
    }) : [];
    state.current.activeLayoutKey = typeof fixture.activeLayoutKey === "string" ? fixture.activeLayoutKey : null;
    state.current.deploymentPath = Array.isArray(fixture.homeDeploymentPath)
      ? fixture.homeDeploymentPath.map(([x, y]) => battlefieldPoint(x, y))
      : [];
    state.current.deploymentLine = state.current.deploymentPath.length >= 2
      ? { a: state.current.deploymentPath[0], b: state.current.deploymentPath[state.current.deploymentPath.length - 1] }
      : null;
    state.current.enemyDeploymentPath = Array.isArray(fixture.enemyDeploymentPath)
      ? fixture.enemyDeploymentPath.map(([x, y]) => battlefieldPoint(x, y))
      : [];
    state.current.enemyDeploymentLine = state.current.enemyDeploymentPath.length >= 2
      ? { a: state.current.enemyDeploymentPath[0], b: state.current.enemyDeploymentPath[state.current.enemyDeploymentPath.length - 1] }
      : null;
    state.current.deploymentLabelPosition = validBoardPoint(fixture.deploymentLabelPosition) ? { ...fixture.deploymentLabelPosition } : null;
    state.current.enemyDeploymentLabelPosition = validBoardPoint(fixture.enemyDeploymentLabelPosition) ? { ...fixture.enemyDeploymentLabelPosition } : null;
    state.current.deploymentVisible = false;
    state.current.enemyDeploymentVisible = false;
    state.current.deploymentNoMansSide = fixture.deploymentNoMansSide === -1 ? -1 : fixture.deploymentNoMansSide === 1 ? 1 : null;
    state.current.enemyDeploymentNoMansSide = fixture.enemyDeploymentNoMansSide === -1 ? -1 : fixture.enemyDeploymentNoMansSide === 1 ? 1 : null;
    state.current.currentPoly = [];
    state.current.wallPath = [];
    state.current.wallPreview = null;
    state.current.layoutStagingIndex = 0;
    setLayoutEditMode(false);
    setSelectedLayoutTerrainId(null);
    setSelectedLayoutWallId(null);
    setSelectedLayoutFeatureId(null);
    setSelectedLayoutObjectiveId(null);
    setLayoutLinkMode(false);
    setImageReady(false);
    rebuildLayoutTerrainGeometry();
    rebuildLayoutWallGeometry();
    setPixelsPerInch(state.current.fit.w / boardWidthInches());
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus("Imported layout JSON.");
  }

  async function importGameOrLayoutJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (isLayoutJsonPayload(data)) {
        applyImportedLayoutData(data);
        return;
      }
      if (!window.confirm("Importing this game will replace the current game state. Continue?")) return;
      await applySaveData({ ...data, exactLayoutState: data.exactLayoutState !== false }, "Imported game JSON.");
      setSaveName(data.saveName || data.name || file.name.replace(/\.json$/i, "") || "Imported game");
    } catch (err) {
      console.warn("Import failed", err);
      setStatus("Could not import that JSON file.");
    }
  }

  function applySelectedLayout(editable = false) {
    const selectedLayout = layoutPresetFor(defenderForceDisposition, attackerForceDisposition, selectedLayoutVariant);
    const layoutKey = selectedLayout.key;
    const preset = selectedLayout.preset;
    if (!preset) {
      setStatus("This layout preset has not been added yet. Layouts A and B are currently available for Take and Hold versus Take and Hold.");
      return;
    }

    const hasExistingLayout = state.current.blockers.length
      || state.current.walls.length
      || state.current.deploymentPath.length
      || state.current.enemyDeploymentPath.length
      || state.current.layoutObjectives.length;
    if (hasExistingLayout && !window.confirm("Replace the current terrain, objectives, and deployment lines with this layout preset? Armies and planning tools will remain in place.")) return;

    state.current.boardWidthInches = BATTLEFIELD_WIDTH_INCHES;
    state.current.boardHeightInches = BATTLEFIELD_HEIGHT_INCHES;
    setCustomGridLength(BATTLEFIELD_WIDTH_INCHES);
    setCustomGridWidth(BATTLEFIELD_HEIGHT_INCHES);
    calculateFit();
    const fixtureKey = `warhammer-layout-fixture:v11:${layoutKey}`;
    let savedFixture = null;
    if (editable) {
      try {
        const savedFixtureText = localStorage.getItem(fixtureKey);
        savedFixture = JSON.parse(savedFixtureText || "null");
      } catch {}
    }
    const savedTerrain = Array.isArray(savedFixture) ? savedFixture : savedFixture?.terrain;
    const savedTerrainLinks = Array.isArray(savedFixture?.terrainLinks) ? savedFixture.terrainLinks : (preset.terrainLinks || []);
    const savedTerrainGroups = Array.isArray(savedFixture?.terrainGroups) ? savedFixture.terrainGroups : (preset.terrainGroups || []);
    const savedWallLinks = Array.isArray(savedFixture?.wallLinks) ? savedFixture.wallLinks : (preset.wallLinks || []);
    const savedFeatureLinks = Array.isArray(savedFixture?.featureLinks) ? savedFixture.featureLinks : (preset.featureLinks || []);
    const presetObjectives = preset.objectives || [];
    const savedObjectives = Array.isArray(savedFixture?.objectives) && savedFixture.objectives.length
      ? savedFixture.objectives
      : presetObjectives;
    const savedWalls = Array.isArray(savedFixture?.walls) ? savedFixture.walls : (preset.walls || []);
    const savedWallPieces = Array.isArray(savedFixture?.wallPieces) ? savedFixture.wallPieces : null;
    const savedTerrainFeatures = [];
    const savedFeaturePieces = Array.isArray(savedFixture?.featurePieces) ? savedFixture.featurePieces : (preset.featurePieces || []);
    const savedDeploymentLabelPosition = validBoardPoint(savedFixture?.deploymentLabelPosition)
      ? savedFixture.deploymentLabelPosition
      : validBoardPoint(preset.deploymentLabelPosition) ? preset.deploymentLabelPosition : null;
    const savedEnemyDeploymentLabelPosition = validBoardPoint(savedFixture?.enemyDeploymentLabelPosition)
      ? savedFixture.enemyDeploymentLabelPosition
      : validBoardPoint(preset.enemyDeploymentLabelPosition) ? preset.enemyDeploymentLabelPosition : null;
    const legacyFixture = Array.isArray(savedFixture);
    state.current.layoutTerrain = Array.isArray(savedTerrain) && savedTerrain.length === preset.terrain.length
      ? savedTerrain.map((terrain) => {
        const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
        return {
          ...terrain,
          x: legacyFixture ? terrain.x * 44 / 60 : terrain.x,
          y: legacyFixture ? terrain.y * 60 / 44 : terrain.y,
          width: definition.width,
          height: definition.height,
          mirrored: terrain.mirrored === true,
          outer: undefined,
        };
      })
      : preset.terrain.map((terrain, index) => {
        const center = preset.portraitCoordinates ? { x: terrain.x, y: terrain.y } : rotateLayoutPoint(terrain.x, terrain.y);
        const definition = TERRAIN_FOOTPRINTS[terrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
        return {
          id: `layout-footprint-${index}`,
          shape: terrain.shape,
          x: center.x,
          y: center.y,
          rotation: preset.portraitCoordinates ? terrain.rotation : (terrain.rotation - 90 + 360) % 360,
          width: definition.width,
          height: definition.height,
          mirrored: terrain.mirrored === true,
        };
      });
    state.current.layoutTerrainLinks = savedTerrainLinks
      .filter((link) => Array.isArray(link) && link.length === 2)
      .map((link) => [...link]);
    state.current.layoutTerrainGroups = savedTerrainGroups
      .filter((group) => Array.isArray(group) && group.length >= 2)
      .map((group) => [...group]);
    state.current.layoutObjectives = savedObjectives.length
      ? savedObjectives.map((objective, index) => {
        const fallback = presetObjectives[index] || objective;
        return {
        id: objective.id || `layout-objective-${index}`,
        boardX: Number.isFinite(objective.boardX) ? objective.boardX : fallback.boardX ?? fallback.x,
        boardY: Number.isFinite(objective.boardY) ? objective.boardY : fallback.boardY ?? fallback.y,
        allegiance: objective.allegiance || fallback.allegiance,
        shape: objective.shape || (fallback.allegiance === "neutral" && index !== 2 ? "diamond" : "circle"),
        visible: objective.visible !== false,
      };
      })
      : [];
    const presetWallPieces = preset.wallPieces || DEFAULT_LAYOUT_WALL_SET;
    state.current.layoutWalls = savedWallPieces?.length
      ? savedWallPieces.map((wall, index) => ({
        id: wall.id || `layout-wall-${wall.type}-${index}`,
        type: wall.type,
        x: wall.x,
        y: wall.y,
        rotation: wall.rotation || 0,
        mirrored: wall.mirrored === true,
        floorState: wall.floorState === "firstFloor" ? "firstFloor" : "ground",
      }))
      : presetWallPieces.map((wall, index) => ({
        id: `layout-wall-${wall.type}-${index}`,
        type: wall.type,
        x: wall.x,
        y: wall.y,
        rotation: wall.rotation || 0,
        mirrored: wall.mirrored === true,
        floorState: "ground",
      }));
    state.current.layoutWallLinks = savedWallLinks
      .filter((link) => Array.isArray(link) && link.length === 2)
      .map((link) => [...link]);
    state.current.layoutTerrainFeatures = savedTerrainFeatures.map((feature) => ({
      ...feature,
      points: feature.points.map((point) => ({ ...point })),
    }));
    state.current.layoutFeaturePieces = savedFeaturePieces.map((feature) => ({
      ...feature,
      mirrored: feature.mirrored === true,
    }));
    state.current.layoutFeatureLinks = savedFeatureLinks
      .filter((link) => Array.isArray(link) && link.length === 2)
      .map((link) => [...link]);
    state.current.activeLayoutKey = layoutKey;
    refreshActiveLayoutGeometry();
    state.current.walls = savedWalls.map((wall) => ({
      a: battlefieldPoint(wall.a.x, wall.a.y),
      b: battlefieldPoint(wall.b.x, wall.b.y),
    }));
    rebuildLayoutWallGeometry();
    state.current.deploymentVisible = false;
    state.current.deploymentNoMansSide = null;
    state.current.deploymentLabelPosition = savedDeploymentLabelPosition ? { ...savedDeploymentLabelPosition } : null;
    state.current.deploymentDraft = [];
    state.current.deploymentPreview = null;

    state.current.enemyDeploymentVisible = false;
    state.current.enemyDeploymentNoMansSide = null;
    state.current.enemyDeploymentLabelPosition = savedEnemyDeploymentLabelPosition ? { ...savedEnemyDeploymentLabelPosition } : null;
    state.current.enemyDeploymentDraft = [];
    state.current.enemyDeploymentPreview = null;

    setHomeDeploymentRangeInches("unlimited");
    setEnemyDeploymentRangeInches("unlimited");
    setPixelsPerInch(state.current.fit.w / boardWidthInches());
    setLayoutEditMode(editable);
    setSelectedLayoutTerrainId(null);
    setSelectedLayoutWallId(null);
    setSelectedLayoutObjectiveId(null);
    setLayoutLinkMode(false);
    setFirstLinkedTerrainId(null);
    setFirstLinkedWallId(null);
    setFirstLinkedFeatureId(null);
    state.current.camera = { scale: 1, x: 0, y: 0 };
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${preset.source} applied${selectedLayout.reversed ? " using the reversed force disposition map" : ""}${editable ? " for editing" : ""}. Existing armies, rulers, and LOS markers were kept.`);
  }

  function createBlankMapFromGridInputs() {
    const width = Math.max(1, Number(customGridLength) || BATTLEFIELD_WIDTH_INCHES);
    const height = Math.max(1, Number(customGridWidth) || BATTLEFIELD_HEIGHT_INCHES);
    imgRef.current = null;
    state.current.boardWidthInches = width;
    state.current.boardHeightInches = height;
    state.current.activeLayoutKey = null;
    state.current.blockers = [];
    state.current.blockerIds = [];
    state.current.interactiveBlockers = [];
    state.current.walls = [];
    state.current.layoutTerrain = [];
    state.current.layoutTerrainLinks = [];
    state.current.layoutTerrainGroups = [];
    state.current.layoutWalls = [];
    state.current.layoutWallLinks = [];
    state.current.layoutTerrainFeatures = [];
    state.current.layoutFeaturePieces = [];
    state.current.layoutFeatureLinks = [];
    state.current.layoutObjectives = [];
    state.current.deploymentLine = null;
    state.current.deploymentPath = [];
    state.current.deploymentDraft = [];
    state.current.deploymentPreview = null;
    state.current.enemyDeploymentLine = null;
    state.current.enemyDeploymentPath = [];
    state.current.enemyDeploymentDraft = [];
    state.current.enemyDeploymentPreview = null;
    state.current.currentPoly = [];
    state.current.wallPath = [];
    state.current.wallPreview = null;
    state.current.camera = { scale: 1, x: 0, y: 0 };
    calculateFit();
    setPixelsPerInch(state.current.fit.w / boardWidthInches());
    setLayoutEditMode(true);
    setSelectedLayoutTerrainId(null);
    setSelectedLayoutWallId(null);
    setSelectedLayoutFeatureId(null);
    setSelectedLayoutObjectiveId(null);
    setMode("pan");
    setImageReady(false);
    if (fileRef.current) fileRef.current.value = "";
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`Created a blank ${height}\" x ${width}\" grid. Each square is 1 inch.`);
  }

  function toggleLayoutEditing() {
    if (layoutEditMode) {
      setLayoutEditMode(false);
      setSelectiveFootprintRemoveMode(false);
      setSelectedLayoutTerrainId(null);
      setSelectedLayoutWallId(null);
      setSelectedLayoutFeatureId(null);
      setSelectedLayoutObjectiveId(null);
      setLayoutLinkMode(false);
      setFirstLinkedTerrainId(null);
      setFirstLinkedWallId(null);
      setFirstLinkedFeatureId(null);
      saveLayoutFixture();
      return;
    }
    if (!state.current.layoutTerrain.length && !state.current.layoutWalls.length && !state.current.layoutFeaturePieces.length && !state.current.layoutObjectives.length) {
      setStatus("Create, upload, or display a layout before editing layout objects.");
      return;
    }
    setScaleInches(1);
    setPixelsPerInch(state.current.fit.w / boardWidthInches());
    setLayoutEditMode(true);
  }

  const sortedMarkers = sortedLosMarkers();
  const unresolvedArmyResults = armyResults.filter((result) => !result.markerId);
  const normalizedModelSearch = normaliseName(modelSearch);
  const modelSearchResults = normalizedModelSearch
    ? Object.entries(BASE_DATABASE)
      .map(([name, base]) => ({ name, base, normalized: normaliseName(name) }))
      .filter((entry) => entry.normalized.includes(normalizedModelSearch))
      .sort((a, b) => {
        const aStarts = a.normalized.startsWith(normalizedModelSearch) ? 0 : 1;
        const bStarts = b.normalized.startsWith(normalizedModelSearch) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, 8)
    : [];
  const sortedUnits = Array.from({ length: 20 }, (_, index) => index + 1)
    .map((slot) => ({ slot, members: getUnitMembers(slot) }))
    .filter((unit) => unit.members.length);
  const displayedSaveName = selectedSave || saveName || "Unsaved game";
  const selectedPrimaryMission = FORCE_DISPOSITION_MISSIONS[defenderForceDisposition]?.[attackerForceDisposition] || "Unknown mission";
  const opponentPrimaryMission = FORCE_DISPOSITION_MISSIONS[attackerForceDisposition]?.[defenderForceDisposition] || "Unknown mission";
  const selectedMissionCards = missionCardsFor(selectedPrimaryMission);
  const opponentMissionCards = missionCardsFor(opponentPrimaryMission);
  const selectedLayoutPreset = layoutPresetFor(defenderForceDisposition, attackerForceDisposition, selectedLayoutVariant).preset;
  const activeTerrainRelation = layoutTerrainRelationVersion >= 0 ? selectedTerrainRelation() : null;
  const layoutTerrainCounts = GW_TERRAIN_FOOTPRINT_ROWS.reduce((counts, row) => {
    counts[row.shape] = state.current.layoutTerrain.filter((terrain) => terrain.shape === row.shape).length;
    return counts;
  }, {});

  return (
    <div style={styles.appShell}>
      <div style={styles.body}>
        <div style={{ ...styles.sidebarShell, width: sidebarCollapsed ? 0 : 360 }}>
          <aside style={{ ...styles.sidebar, transform: sidebarCollapsed ? "translateX(-100%)" : "translateX(0)" }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadImage} />
          <input ref={importJsonRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={importGameOrLayoutJson} />

          <div style={{ ...styles.sidebarSection, order: 1 }}>
            <SidebarSectionHeader title="Save Game" open={sectionOpen.game} onToggle={() => toggleSidebarSection("game")} onHelp={(event) => toggleSidebarHelp("game", event)} helpOpen={activeSidebarHelp?.key === "game"} />
            {sectionOpen.game && (
              <div style={styles.sectionContent}>
                <div style={styles.sidebarRow}>
                  <select value={selectedSave} onChange={(e) => handleSelectedSaveChange(e.target.value)} style={{ ...styles.select, flex: 1, minWidth: 0 }}>
                    <option value="">Choose Game</option>
                    <option value="__new_game__">New game save</option>
                    {saveSlots.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ToolButton onClick={loadNamedSlot}>Load game</ToolButton>
                </div>

                <div style={styles.sidebarRow}>
                  {editingSaveName ? (
                    <input
                      autoFocus
                      value={saveName}
                      onChange={(e) => handleSaveNameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitSaveNameRename();
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelSaveNameRename();
                        }
                      }}
                      style={{ ...styles.saveNameDisplayInput, flex: 1 }}
                      title="Click Save name to save the name"
                    />
                  ) : (
                    <button
                      type="button"
                      onDoubleClick={() => {
                        setSaveName(displayedSaveName);
                        setEditingSaveName(true);
                      }}
                      style={{ ...styles.saveNameDisplay, flex: 1 }}
                      title="Double-click or use Edit name to rename this save"
                    >
                      {displayedSaveName}
                    </button>
                  )}
                  <ToolButton onClick={() => {
                    if (editingSaveName) commitSaveNameRename();
                    else {
                      setSaveName(displayedSaveName);
                      setEditingSaveName(true);
                    }
                  }}>
                    {editingSaveName ? "Save name" : "Edit name"}
                  </ToolButton>
                </div>

                <div style={styles.sidebarRow}>
                  <ToolButton onClick={saveNamedSlot}>Save game</ToolButton>
                  <ToolButton onClick={deleteNamedSlot}>Delete game</ToolButton>
                </div>
                <div style={styles.storageNote}>
                  {imageReady ? "Map image included in saves" : "No map image loaded"}
                </div>
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 2 }}>
            <SidebarSectionHeader title="Layout" open={sectionOpen.layout} onToggle={() => toggleSidebarSection("layout")} onHelp={(event) => toggleSidebarHelp("layout", event)} helpOpen={activeSidebarHelp?.key === "layout"} />
            {sectionOpen.layout && (
              <div style={styles.sectionContent}>
                <div style={styles.layoutField}>
                  <span style={styles.markerDetailLabel}>My Force Disposition</span>
                  <ForceDispositionSelect value={defenderForceDisposition} onChange={setDefenderForceDisposition} label="Your Force Disposition" />
                </div>
                <div style={styles.layoutField}>
                  <span style={styles.markerDetailLabel}>Opponent&apos;s Force Disposition</span>
                  <ForceDispositionSelect value={attackerForceDisposition} onChange={setAttackerForceDisposition} label="Opponent's Force Disposition" />
                </div>
                <label style={styles.layoutField}>
                  <span style={styles.markerDetailLabel}>Layout A/B/C</span>
                  <select value={selectedLayoutVariant} onChange={(event) => setSelectedLayoutVariant(event.target.value)} style={styles.fullInput}>
                    {['A', 'B', 'C'].map((variant) => <option key={variant} value={variant}>Layout {variant}</option>)}
                  </select>
                </label>
                <ToolButton active={Boolean(selectedLayoutPreset)} onClick={() => applySelectedLayout(false)}>
                  {selectedLayoutPreset ? "Apply Layout" : "Layout coming soon"}
                </ToolButton>
                <div style={styles.layoutMissionSummary}>
                  <div style={styles.layoutMissionText}>
                    <span style={styles.layoutMissionLabel}>My Primary Mission</span>
                    <strong>{selectedPrimaryMission}</strong>
                  </div>
                  <ToolButton active={missionCardsVisible} onClick={() => setMissionCardsVisible((visible) => !visible)}>
                    {missionCardsVisible ? "Hide" : "Display"}
                  </ToolButton>
                </div>
                {missionCardsVisible && (
                  <div style={styles.missionCardList}>
                    {selectedMissionCards.map((card) => (
                      <button
                        key={card.side}
                        type="button"
                        onClick={() => setExpandedMissionCards({ mission: selectedPrimaryMission, cards: selectedMissionCards })}
                        style={styles.missionCardButton}
                        title={`Open ${selectedPrimaryMission} card${selectedMissionCards.length > 1 ? "s" : ""}`}
                      >
                        <img
                          src={card.src}
                          alt={`${selectedPrimaryMission} ${card.side}`}
                          loading="lazy"
                          style={styles.missionCardImage}
                        />
                        <span style={styles.missionCardSide}>{card.side}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ ...styles.layoutMissionSummary, ...styles.opponentMissionSummary }}>
                  <div style={styles.layoutMissionText}>
                    <span style={{ ...styles.layoutMissionLabel, ...styles.opponentMissionLabel }}>Opponent&apos;s Primary Mission</span>
                    <strong>{opponentPrimaryMission}</strong>
                  </div>
                  <ToolButton active={opponentMissionCardsVisible} onClick={() => setOpponentMissionCardsVisible((visible) => !visible)}>
                    {opponentMissionCardsVisible ? "Hide" : "Display"}
                  </ToolButton>
                </div>
                {opponentMissionCardsVisible && (
                  <div style={styles.missionCardList}>
                    {opponentMissionCards.map((card) => (
                      <button
                        key={card.side}
                        type="button"
                        onClick={() => setExpandedMissionCards({ mission: opponentPrimaryMission, cards: opponentMissionCards })}
                        style={styles.missionCardButton}
                        title={`Open ${opponentPrimaryMission} card${opponentMissionCards.length > 1 ? "s" : ""}`}
                      >
                        <img
                          src={card.src}
                          alt={`${opponentPrimaryMission} ${card.side}`}
                          loading="lazy"
                          style={styles.missionCardImage}
                        />
                        <span style={styles.missionCardSide}>{card.side}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 3 }}>
            <SidebarSectionHeader title="Import Game/Layout" open={sectionOpen.importGame} onToggle={() => toggleSidebarSection("importGame")} onHelp={(event) => toggleSidebarHelp("importGame", event)} helpOpen={activeSidebarHelp?.key === "importGame"} />
            {sectionOpen.importGame && (
              <div style={styles.sectionContent}>
                <div style={styles.storageNote}>
                  Import a layout JSON or a full game JSON shared from this app.
                </div>
                <ToolButton onClick={() => importJsonRef.current?.click()}>Import Game/Layout</ToolButton>
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 9 }}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("createUpload")}>
              <span style={styles.sectionTriangle}>{sectionOpen.createUpload ? "▾" : "▸"}</span>
              <span>Create/Upload Map</span>
            </button>
            {sectionOpen.createUpload && (
              <div style={styles.sectionContent}>
                <MapSubsection
                  title="Modify layout"
                  summary="Load a preset, then unlock it if you want to change it."
                  open={mapSectionOpen.modify}
                  onToggle={() => toggleMapSection("modify")}
                  onHelp={(event) => toggleSidebarHelp("mapModify", event)}
                  helpOpen={activeSidebarHelp?.key === "mapModify"}
                >
                  <div style={styles.layoutField}>
                    <span style={styles.markerDetailLabel}>Defender&apos;s Force Disposition</span>
                    <ForceDispositionSelect value={defenderForceDisposition} onChange={setDefenderForceDisposition} label="Your Force Disposition" />
                  </div>
                  <div style={styles.layoutField}>
                    <span style={styles.markerDetailLabel}>Attacker&apos;s Force Disposition</span>
                    <ForceDispositionSelect value={attackerForceDisposition} onChange={setAttackerForceDisposition} label="Opponent's Force Disposition" />
                  </div>
                  <label style={styles.layoutField}>
                    <span style={styles.markerDetailLabel}>Layout A/B/C</span>
                    <select value={selectedLayoutVariant} onChange={(event) => setSelectedLayoutVariant(event.target.value)} style={styles.fullInput}>
                      {['A', 'B', 'C'].map((variant) => <option key={variant} value={variant}>Layout {variant}</option>)}
                    </select>
                  </label>
                  <div style={styles.layoutEditorControls}>
                    <ToolButton active={Boolean(selectedLayoutPreset)} onClick={() => applySelectedLayout(false)}>
                      {selectedLayoutPreset ? "Display layout to modify" : "Layout coming soon"}
                    </ToolButton>
                    <ToolButton active={layoutEditMode} onClick={() => {
                      if (!state.current.activeLayoutKey) applySelectedLayout(true);
                      else toggleLayoutEditing();
                    }}>
                      Modify Layout
                    </ToolButton>
                  </div>
                </MapSubsection>

                <MapSubsection
                  title="Upload Map"
                  summary="Use a custom image as the map background."
                  open={mapSectionOpen.upload}
                  onToggle={() => toggleMapSection("upload")}
                  onHelp={(event) => toggleSidebarHelp("mapUpload", event)}
                  helpOpen={activeSidebarHelp?.key === "mapUpload"}
                >
                  <ToolButton onClick={() => fileRef.current?.click()}>Upload map</ToolButton>
                </MapSubsection>

                <MapSubsection
                  title="Create Map"
                  summary="Build a blank grid where every square is 1 inch."
                  open={mapSectionOpen.create}
                  onToggle={() => toggleMapSection("create")}
                  onHelp={(event) => toggleSidebarHelp("mapCreate", event)}
                  helpOpen={activeSidebarHelp?.key === "mapCreate"}
                >
                  <div style={styles.sidebarRow}>
                    <label style={styles.inlineNumberLabel}>
                      W
                      <input type="number" min="1" step="1" value={customGridWidth} onChange={(event) => setCustomGridWidth(Number(event.target.value))} style={styles.smallInput} title="Grid height from bottom to top" />
                    </label>
                    <label style={styles.inlineNumberLabel}>
                      L
                      <input type="number" min="1" step="1" value={customGridLength} onChange={(event) => setCustomGridLength(Number(event.target.value))} style={styles.smallInput} title="Grid length from left to right" />
                    </label>
                    <ToolButton onClick={createBlankMapFromGridInputs}>Create map</ToolButton>
                  </div>
                </MapSubsection>

                <MapSubsection
                  title="Edit Layout"
                  summary="Move, add, rotate, mirror, link, and save layout objects."
                  open={mapSectionOpen.edit}
                  onToggle={() => toggleMapSection("edit")}
                  onHelp={(event) => toggleSidebarHelp("mapEdit", event)}
                  helpOpen={activeSidebarHelp?.key === "mapEdit"}
                >
                  <div style={styles.layoutEditorControls}>
                    <ToolButton active={layoutEditMode} onClick={toggleLayoutEditing}>{layoutEditMode ? "Finish editing" : "Start editing"}</ToolButton>
                    <ToolButton active={mode === "scale"} disabled={state.current.activeLayoutKey || !imgRef.current} onClick={() => setMode("scale")}>Set scale</ToolButton>
                  </div>
                  <EditControlSection title="Add in GW terrain footprints" open={editSubsectionOpen.footprints} onToggle={() => toggleEditSubsection("footprints")}>
                    <div style={styles.gwFootprintTable}>
                      <div style={{ ...styles.gwFootprintCell, ...styles.gwFootprintHeaderCell }}>GW Footprint Size</div>
                      <div style={{ ...styles.gwFootprintCell, ...styles.gwFootprintHeaderCell }}>Quantity (recommended no.)</div>
                      {GW_TERRAIN_FOOTPRINT_ROWS.map((row) => (
                        <Fragment key={row.shape}>
                          <div style={styles.gwFootprintCell}>{row.label}</div>
                          <div style={{ ...styles.gwFootprintCell, ...styles.gwFootprintQuantityCell }}>
                            <button type="button" style={styles.gwFootprintCounterButton} onClick={() => removeOneLayoutTerrainFootprint(row.shape)} aria-label={`Remove ${row.label} footprint`}>-</button>
                            <span style={styles.gwFootprintCount}>{layoutTerrainCounts[row.shape] || 0}</span>
                            <button type="button" style={styles.gwFootprintCounterButton} onClick={() => addLayoutTerrainFootprint(row.shape)} aria-label={`Add ${row.label} footprint`}>+</button>
                            <span style={styles.gwFootprintRecommended}>({row.recommended})</span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    <ToolButton active={selectiveFootprintRemoveMode} onClick={() => {
                      const next = !selectiveFootprintRemoveMode;
                      setSelectiveFootprintRemoveMode(next);
                      setLayoutEditMode(true);
                      setLayoutLinkMode(false);
                      setFirstLinkedTerrainId(null);
                      setFirstLinkedWallId(null);
                      setFirstLinkedFeatureId(null);
                      setSelectedLayoutTerrainId(null);
                      setSelectedLayoutWallId(null);
                      setSelectedLayoutFeatureId(null);
                      setSelectedLayoutObjectiveId(null);
                      setStatus(next ? "Selective footprint removal is on. Click a GW terrain footprint to remove it." : "Selective footprint removal stopped.");
                      draw();
                    }}>
                      {selectiveFootprintRemoveMode ? "Stop selectively removing terrain footprint(s)" : "Selectively remove terrain footprint(s)"}
                    </ToolButton>
                  </EditControlSection>
                  <EditControlSection title="Preset light and dense terrain features" open={editSubsectionOpen.features} onToggle={() => toggleEditSubsection("features")}>
                    <div style={styles.layoutEditorControls}>
                      {Object.entries(LAYOUT_FEATURE_TYPES).map(([type, definition]) => (
                        <ToolButton key={type} onClick={() => addLayoutFeature(type)}>{definition.button}</ToolButton>
                      ))}
                    </div>
                  </EditControlSection>
                  <EditControlSection title="Preset walls" open={editSubsectionOpen.walls} onToggle={() => toggleEditSubsection("walls")}>
                    <div style={styles.layoutEditorControls}>
                      {Object.keys(LAYOUT_WALL_TYPES).map((type) => (
                        <ToolButton key={type} onClick={() => addLayoutWall(type)}>Add {type} wall</ToolButton>
                      ))}
                    </div>
                  </EditControlSection>
                  <EditControlSection title="Free draw" open={editSubsectionOpen.freeDraw} onToggle={() => toggleEditSubsection("freeDraw")}>
                    <div style={styles.layoutEditorControls}>
                      <ToolButton active={mode === "wall"} onClick={() => { setLayoutEditMode(true); setMode("wall"); }}>Draw Wall (R)</ToolButton>
                      <ToolButton active={mode === "block"} onClick={() => { setLayoutEditMode(true); setMode("block"); }}>Draw Footprint (F)</ToolButton>
                      <ToolButton onClick={clearBlockers}>Clear footprints</ToolButton>
                      <ToolButton onClick={clearWalls}>Clear walls</ToolButton>
                    </div>
                  </EditControlSection>
                  <EditControlSection title="Manipulation" open={editSubsectionOpen.manipulation} onToggle={() => toggleEditSubsection("manipulation")}>
                    <div style={styles.layoutEditorControls}>
                      <ToolButton onClick={mirrorSelectedLayoutTerrain}>Mirror</ToolButton>
                      <ToolButton active={layoutLinkMode} onClick={beginLayoutTerrainLinking}>Link</ToolButton>
                      <ToolButton onClick={removeLayoutTerrainLinks}>Remove links</ToolButton>
                      <ToolButton onClick={() => rotateSelectedLayoutTerrain(1)}>Rotate right 1 degree</ToolButton>
                      <ToolButton onClick={() => rotateSelectedLayoutTerrain(-1)}>Rotate left 1 degree</ToolButton>
                      {selectedLayoutTerrainId && activeTerrainRelation && (
                        <>
                          <ToolButton active={activeTerrainRelation.same} onClick={() => setSelectedTerrainFootprintRelation(true)}>Same footprint</ToolButton>
                          <ToolButton active={!activeTerrainRelation.same} onClick={() => setSelectedTerrainFootprintRelation(false)}>Separate footprints</ToolButton>
                        </>
                      )}
                      {selectedLayoutWallId && (
                        <>
                          <ToolButton onClick={() => setSelectedWallFloorState("ground")}>Ground</ToolButton>
                          <ToolButton onClick={() => setSelectedWallFloorState("firstFloor")}>1st Floor</ToolButton>
                        </>
                      )}
                    </div>
                  </EditControlSection>
                  <EditControlSection title="Deployment line" open={editSubsectionOpen.deployment} onToggle={() => toggleEditSubsection("deployment")}>
                    <div style={styles.deploymentLineEditControls}>
                      <div style={styles.actionPairRow}>
                        <ToolButton active={mode === "deployHome"} onClick={() => { setLayoutEditMode(true); setMode("deployHome"); }}>Draw Home Deploy Line</ToolButton>
                        <ToolButton onClick={() => clearDeploymentLOS("home")}>Clear Home Line</ToolButton>
                      </div>
                      <div style={styles.actionPairRow}>
                        <ToolButton active={mode === "deployEnemy"} onClick={() => { setLayoutEditMode(true); setMode("deployEnemy"); }}>Draw Opponent&apos;s Deploy Line</ToolButton>
                        <ToolButton onClick={() => clearDeploymentLOS("enemy")}>Clear Opp&apos;s line</ToolButton>
                      </div>
                      <ToolButton onClick={restorePresetDeploymentLines}>Restore deploy lines</ToolButton>
                    </div>
                  </EditControlSection>
                  <EditControlSection title="Objectives" open={editSubsectionOpen.objectives} onToggle={() => toggleEditSubsection("objectives")}>
                    <div style={styles.layoutEditorControls}>
                      <ToolButton onClick={() => addLayoutObjective("home", "circle", "Home objective marker")}>Home objective</ToolButton>
                      <ToolButton onClick={() => addLayoutObjective("enemy", "circle", "Enemy objective marker")}>Enemy objective</ToolButton>
                      <ToolButton onClick={() => addLayoutObjective("neutral", "diamond", "Expansion objective marker")}>Expansion objective</ToolButton>
                      <ToolButton onClick={() => addLayoutObjective("neutral", "circle", "Central objective marker")}>Central objective</ToolButton>
                    </div>
                  </EditControlSection>
                  <EditControlSection title="Export/Download" open={editSubsectionOpen.exportDownload} onToggle={() => toggleEditSubsection("exportDownload")}>
                    <div style={styles.layoutEditorControls}>
                      <ToolButton onClick={downloadLayoutFixture}>Export Layout</ToolButton>
                      <ToolButton onClick={exportGameJson}>Export Game</ToolButton>
                    </div>
                  </EditControlSection>
                </MapSubsection>
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 7 }}>
            <SidebarSectionHeader title="Rulers & Deepstrike" open={sectionOpen.scale} onToggle={() => toggleSidebarSection("scale")} onHelp={(event) => toggleSidebarHelp("scale", event)} helpOpen={activeSidebarHelp?.key === "scale"} />
            {sectionOpen.scale && (
              <div style={styles.sectionContent}>
                <div style={styles.sidebarRow}>
                  <ToolButton active={mode === "ruler"} onClick={() => setMode("ruler")}>Ruler</ToolButton>
                  <ToolButton onClick={clearRulers}>Clear rulers</ToolButton>
                </div>
                <div style={styles.sidebarRow}>
                  <ToolButton active={mode === "stickyRuler"} onClick={() => { state.current.stickyRulerStart = null; setMode("stickyRuler"); setStatus("Choose a LOS marker or enemy to start a sticky ruler."); }}>Sticky ruler</ToolButton>
                  <ToolButton onClick={clearStickyRulers}>Clear sticky rulers</ToolButton>
                </div>
                <div style={styles.deploymentControlGroup}>
                  <div style={styles.deepstrikeRow}>
                    <button
                      type="button"
                      onClick={() => setDeepstrikeOverlayVisibility(!deepstrikeVisible)}
                      style={{
                        ...styles.deploymentDrawButton,
                        border: deepstrikeVisible ? "1px solid rgb(222,145,25)" : "1px solid rgba(255,255,255,.18)",
                        background: deepstrikeVisible ? "rgba(222,145,25,.28)" : "rgba(255,255,255,.08)",
                      }}
                    >Deepstrike</button>
                    <MarkerVisibilityButton
                      active={deepstrikeVisible}
                      kind="show"
                      label="Enable deepstrike overlay"
                      onClick={() => setDeepstrikeOverlayVisibility(true)}
                    />
                    <MarkerVisibilityButton
                      active={!deepstrikeVisible}
                      kind="hide"
                      label="Disable deepstrike overlay"
                      onClick={() => setDeepstrikeOverlayVisibility(false)}
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deepstrikeRangeInches}
                    onChange={(e) => setDeepstrikeRangeInches(e.target.value)}
                    style={styles.fullInput}
                    placeholder="Deepstrike range in inches"
                    title="Minimum deepstrike distance from your units in inches"
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 4 }}>
            <SidebarSectionHeader title="Army List" open={sectionOpen.army} onToggle={() => toggleSidebarSection("army")} onHelp={(event) => toggleSidebarHelp("army", event)} helpOpen={activeSidebarHelp?.key === "army"} />
            {sectionOpen.army && (
              <div style={styles.sectionContent}>
                <div style={styles.sidebarRow}>
                  <select
                    value={selectedArmyPreset || "__new__"}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        startNewArmyPreset();
                        return;
                      }
                      setSelectedArmyPreset(e.target.value);
                      if (e.target.value) setArmyPresetName(e.target.value);
                    }}
                    style={{ ...styles.select, flex: 1, minWidth: 0 }}
                  >
                    <option value="__new__">New army</option>
                    {armyPresetNames.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ToolButton onClick={loadArmyPreset}>Load</ToolButton>
                </div>
                <div style={styles.sidebarRow}>
                  {editingArmyPresetName ? (
                    <input
                      value={armyPresetName}
                      onChange={(e) => setArmyPresetName(e.target.value)}
                      style={{ ...styles.fullInput, flex: 1 }}
                      placeholder="Army preset name"
                      title="Name used when saving this army preset"
                    />
                  ) : (
                    <button
                      type="button"
                      onDoubleClick={() => setEditingArmyPresetName(true)}
                      style={styles.armyNameDisplay}
                      title="Double-click or use Edit name to rename this army"
                    >{armyPresetName || "New army"}</button>
                  )}
                  <ToolButton onClick={() => editingArmyPresetName ? saveArmyPresetName() : setEditingArmyPresetName(true)}>
                    {editingArmyPresetName ? "Save name" : "Edit name"}
                  </ToolButton>
                </div>
                <div style={styles.sidebarRow}>
                  <ToolButton onClick={saveArmyPreset}>Save army</ToolButton>
                  <ToolButton onClick={deleteArmyPreset}>Delete</ToolButton>
                </div>
                <textarea
                  value={armyListText}
                  onChange={(e) => setArmyListText(e.target.value)}
                  placeholder={"Paste Warhammer app army list here...\n\nUnit lines should look like:\nTyrannofex (200 Points)\n  • 1x Rupture cannon"}
                  style={styles.armyTextArea}
                />
                <ToolButton onClick={parseArmyList}>Match models</ToolButton>
                <ToolButton onClick={clearArmyGeneratedLosMarkers}>Remove generated LOS marker(s)</ToolButton>

                {unresolvedArmyResults.length > 0 && (
                  <div style={styles.armyResultList}>
                    {unresolvedArmyResults.map((result) => (
                      <div key={result.id} style={styles.armyResultItem}>
                        <input
                          value={result.unit}
                          onChange={(e) => updateArmyResult(result.id, { unit: e.target.value })}
                          style={styles.armyUnitInput}
                          title={`Original text: ${result.original}`}
                        />
                        <div style={styles.armyBaseLine}>{formatBase(result)}</div>
                        <div style={styles.sidebarRow}>
                          <button
                            type="button"
                            onClick={() => addArmyResultLosMarker(result.id)}
                            style={{ ...styles.iconChoiceButton, background: result.accepted ? "rgba(34,197,94,.35)" : "rgba(255,255,255,.08)" }}
                            title="Add as LOS marker"
                          >✓</button>
                          <button
                            type="button"
                            onClick={() => {
                              removeArmyGeneratedMarkersForResult(result);
                              updateArmyResult(result.id, { accepted: false, editing: true, markerId: null, markerIds: [] });
                              setLosVersion((v) => v + 1);
                              updateVisibility();
                              draw();
                              scheduleBrowserSave();
                            }}
                            style={{ ...styles.iconChoiceButton, background: result.editing ? "rgba(239,68,68,.35)" : "rgba(255,255,255,.08)" }}
                            title="Correct base size manually"
                          >✕</button>
                          <span style={styles.armyMatchLabel}>{result.markerId ? "LOS made" : result.matched ? "matched" : "manual"}</span>
                        </div>
                        <div style={styles.sidebarRow}>
                          <ToolButton onClick={() => rematchArmyResult(result.id)}>Rematch</ToolButton>
                          <ToolButton onClick={() => deleteArmyResult(result.id)}>Delete</ToolButton>
                        </div>
                        {result.editing && (
                          <div style={styles.armyManualGrid}>
                            <select
                              value={result.baseShape}
                              onChange={(e) => {
                                const shape = e.target.value;
                                updateArmyResult(result.id, {
                                  baseShape: shape,
                                  baseWidthMm: shape === "circle" ? result.baseLengthMm : result.baseWidthMm,
                                  accepted: true,
                                });
                              }}
                              style={styles.select}
                            >
                              <option value="circle">Circle</option>
                              <option value="oval">Oval</option>
                              <option value="rectangle">Rectangle</option>
                            </select>
                            <input
                              type="number"
                              min="1"
                              value={result.baseLengthMm}
                              onChange={(e) => updateArmyResult(result.id, { baseLengthMm: Number(e.target.value), baseWidthMm: result.baseShape === "circle" ? Number(e.target.value) : result.baseWidthMm, accepted: true })}
                              style={styles.smallInput}
                              title={result.baseShape === "circle" ? "Diameter mm" : "Length mm"}
                            />
                            <input
                              type="number"
                              min="1"
                              value={result.baseShape === "circle" ? result.baseLengthMm : result.baseWidthMm}
                              disabled={result.baseShape === "circle"}
                              onChange={(e) => updateArmyResult(result.id, { baseWidthMm: Number(e.target.value), accepted: true })}
                              style={{ ...styles.smallInput, opacity: result.baseShape === "circle" ? 0.45 : 1 }}
                              title="Width mm"
                            />
                            <ToolButton onClick={() => addArmyResultLosMarker(result.id)}>Add</ToolButton>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 5 }}>
            <SidebarSectionHeader title="Your Model(s)/LOS Marker(s)" open={sectionOpen.markers} onToggle={() => toggleSidebarSection("markers")} onHelp={(event) => toggleSidebarHelp("markers", event)} helpOpen={activeSidebarHelp?.key === "markers"} />
            {sectionOpen.markers && (
              <div style={styles.sectionContent}>
                <ToolButton onClick={addLosMarker}>Add LOS</ToolButton>
                <div style={styles.modelSearchWrap}>
                  <input
                    value={modelSearch}
                    onChange={(event) => {
                      setModelSearch(event.target.value);
                      setModelSearchIndex(0);
                    }}
                    onKeyDown={(event) => {
                      if (!modelSearchResults.length) return;
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setModelSearchIndex((index) => Math.min(index + 1, modelSearchResults.length - 1));
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setModelSearchIndex((index) => Math.max(index - 1, 0));
                      } else if (event.key === "Enter") {
                        event.preventDefault();
                        const selected = modelSearchResults[Math.min(modelSearchIndex, modelSearchResults.length - 1)];
                        if (selected) addDatabaseLosMarker(selected.name, selected.base);
                      }
                    }}
                    style={styles.fullInput}
                    placeholder="Search models by name..."
                    aria-label="Search the base-size database"
                  />
                  {modelSearchResults.length > 0 && (
                    <div style={styles.modelSearchResults}>
                      {modelSearchResults.map((entry, index) => (
                        <button
                          key={entry.name}
                          type="button"
                          onMouseEnter={() => setModelSearchIndex(index)}
                          onClick={() => addDatabaseLosMarker(entry.name, entry.base)}
                          style={{
                            ...styles.modelSearchResult,
                            background: index === modelSearchIndex ? "#2563eb" : "#111827",
                          }}
                        >
                          <span>{entry.name}</span>
                          <span style={styles.modelSearchBase}>{formatBase(resultBaseFromMatch({ name: entry.name, base: entry.base }))}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!sortedMarkers.length && (
                  <div style={styles.emptyMarkerNote}>No LOS markers on this map.</div>
                )}
                <div style={styles.markerList}>
                  {sortedMarkers.map((marker) => (
                    <div key={marker.id} style={{ ...styles.markerItem, borderColor: marker.id === activeLosId ? "#22c55e" : "rgba(255,255,255,.12)", background: marker.id === activeLosId ? "rgba(34,197,94,.14)" : "rgba(255,255,255,.05)" }} onClick={() => selectLosMarker(marker.id)}>
                      <div style={styles.markerHeader}>
                        <input value={marker.name || "LOS"} onFocus={() => selectLosMarker(marker.id)} onChange={(e) => renameLosMarker(marker.id, e.target.value)} style={styles.markerNameInput} />
                        <MarkerVisibilityButton
                          active={marker.visible !== false}
                          kind="show"
                          label={`Enable LOS for ${marker.name || "LOS"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLosMarkerVisibility(marker.id, true);
                          }}
                        />
                        <MarkerVisibilityButton
                          active={marker.visible === false}
                          kind="hide"
                          label={`Disable LOS for ${marker.name || "LOS"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLosMarkerVisibility(marker.id, false);
                          }}
                        />
                      </div>
                      {marker.id === activeLosId && (
                        <div style={styles.markerDetails} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.markerDetailLabel}>Base</div>
                          <div style={styles.sidebarRow}>
                            <ToolButton active={baseShape === "circle"} onClick={() => updateActiveLosMarker({ baseShape: "circle", baseWidthMm: baseLengthMm })}>○</ToolButton>
                            <ToolButton active={baseShape === "oval"} onClick={() => updateActiveLosMarker({ baseShape: "oval" })}>⬭</ToolButton>
                            <ToolButton active={baseShape === "rectangle"} onClick={() => updateActiveLosMarker({ baseShape: "rectangle" })}>▭</ToolButton>
                            <ToolButton onClick={deleteActiveLosMarker}>Delete</ToolButton>
                          </div>
                          <div style={styles.sidebarRow}>
                            <input type="number" min="1" value={baseLengthMm} onChange={(e) => { const v = Number(e.target.value); updateActiveLosMarker(baseShape === "circle" ? { baseLengthMm: v, baseWidthMm: v } : { baseLengthMm: v }); }} style={styles.smallInput} title={baseShape === "circle" ? "Base diameter in mm" : "Base length in mm"} />
                            <input type="number" min="1" value={baseShape === "circle" ? baseLengthMm : baseWidthMm} disabled={baseShape === "circle"} onChange={(e) => updateActiveLosMarker({ baseWidthMm: Number(e.target.value) })} style={{ ...styles.smallInput, opacity: baseShape === "circle" ? 0.45 : 1 }} title="Base width in mm" />
                          </div>
                          <div style={styles.markerDetailLabel}>Range</div>
                          <input type="number" min="0" step="1" value={rangeInches === "unlimited" ? "" : rangeInches} onChange={(e) => updateActiveLosMarker({ rangeInches: e.target.value || "unlimited" })} style={styles.fullInput} placeholder="0/blank = unlimited" title="Weapon range in inches; blank or 0 means unlimited" />
                          <div style={styles.markerDetailLabel}>Model or Unit</div>
                          <div style={styles.sidebarRow}>
                            <ToolButton active={markerGroupingMode === "model"} onClick={setActiveMarkerAsModel}>Model</ToolButton>
                            <ToolButton active={markerGroupingMode === "unit"} onClick={() => setMarkerGroupingMode("unit")}>Unit</ToolButton>
                          </div>
                          {markerGroupingMode === "unit" && (
                            <div style={styles.unitAssignmentPanel}>
                              <div style={styles.markerDetailLabel}>Models of this type</div>
                              <input type="number" min="1" max="20" value={unitModelCount} onChange={(e) => setUnitModelCount(e.target.value)} style={styles.fullInput} />
                              <div style={styles.markerDetailLabel}>Which unit</div>
                              <select value={selectedUnitSlot} onChange={(e) => setSelectedUnitSlot(Number(e.target.value))} style={styles.fullInput}>
                                {Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>Unit {index + 1}</option>)}
                              </select>
                              <ToolButton onClick={applyActiveMarkerToUnit}>Apply unit</ToolButton>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ ...styles.sidebarSection, order: 6 }}>
            <SidebarSectionHeader title="Units" open={sectionOpen.units} onToggle={() => toggleSidebarSection("units")} onHelp={(event) => toggleSidebarHelp("units", event)} helpOpen={activeSidebarHelp?.key === "units"} />
            {sectionOpen.units && (
              <div style={styles.sectionContent}>
                {!sortedUnits.length && <div style={styles.emptyMarkerNote}>No units created yet.</div>}
                <div style={styles.markerList}>
                  {sortedUnits.map(({ slot, members }) => {
                    const allVisible = members.every((member) => member.visible !== false);
                    const allHidden = members.every((member) => member.visible === false);
                    const selected = activeUnitSlot === slot;
                    const unitRange = getUnitRange(slot, members);
                    return (
                      <div
                        key={slot}
                        style={{ ...styles.markerItem, borderColor: selected ? "#22c55e" : "rgba(255,255,255,.12)", background: selected ? "rgba(34,197,94,.14)" : "rgba(255,255,255,.05)" }}
                        onClick={() => selectUnit(slot)}
                      >
                        <div style={styles.markerHeader}>
                          <input
                            value={getUnitDisplayName(slot, members)}
                            onFocus={() => selectUnit(slot)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => renameUnit(slot, event.target.value)}
                            onWheel={(event) => { event.currentTarget.scrollLeft += event.deltaY; }}
                            style={styles.unitNameInput}
                            title={getUnitDisplayName(slot, members)}
                          />
                          <MarkerVisibilityButton
                            active={allVisible}
                            kind="show"
                            label={`Enable LOS for ${getUnitDisplayName(slot, members)}`}
                            onClick={(event) => { event.stopPropagation(); setUnitVisibility(slot, true); }}
                          />
                          <MarkerVisibilityButton
                            active={allHidden}
                            kind="hide"
                            label={`Disable LOS for ${getUnitDisplayName(slot, members)}`}
                            onClick={(event) => { event.stopPropagation(); setUnitVisibility(slot, false); }}
                          />
                        </div>
                        {selected && (
                          <div style={styles.markerDetails} onClick={(event) => event.stopPropagation()}>
                            <div style={styles.markerDetailLabel}>Range</div>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={unitRange === "unlimited" ? "" : unitRange}
                              onChange={(event) => setUnitRange(slot, event.target.value)}
                              style={styles.fullInput}
                              placeholder="0/blank = unlimited"
                              title="Unit range measured from every model in the unit"
                            />
                            <ToolButton
                              active={sameStickyTarget(state.current.stickyRulerStart, { type: "unit", id: String(slot) })}
                              onClick={() => startUnitStickyRuler(slot)}
                            >Sticky ruler for unit</ToolButton>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 8 }}>
            <SidebarSectionHeader title="Deploy & Enemies" open={sectionOpen.draw} onToggle={() => toggleSidebarSection("draw")} onHelp={(event) => toggleSidebarHelp("draw", event)} helpOpen={activeSidebarHelp?.key === "draw"} />
            {sectionOpen.draw && (
              <div style={styles.sectionContent}>
                <div style={styles.actionPairRow}>
                  <ToolButton active={mode === "enemy"} onClick={() => setMode("enemy")}>Add Enemy (E)</ToolButton>
                  <ToolButton onClick={clearEnemies}>Clear enemies</ToolButton>
                </div>
                <DeploymentControlRow
                  label="Home deployment line"
                  visible={state.current.deploymentVisible}
                  hasLine={Boolean(state.current.deploymentLine)}
                  onVisibility={(visible) => setDeploymentVisibility("home", visible)}
                  rangeInches={homeDeploymentRangeInches}
                  onRangeChange={(value) => setHomeDeploymentRangeInches(value || "unlimited")}
                />
                <DeploymentControlRow
                  label="Enemy deployment line"
                  visible={state.current.enemyDeploymentVisible}
                  hasLine={Boolean(state.current.enemyDeploymentLine)}
                  onVisibility={(visible) => setDeploymentVisibility("enemy", visible)}
                  rangeInches={enemyDeploymentRangeInches}
                  onRangeChange={(value) => setEnemyDeploymentRangeInches(value || "unlimited")}
                />
              </div>
            )}
          </div>
          </aside>
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              setActiveSidebarHelp(null);
              setSidebarCollapsed((collapsed) => !collapsed);
            }}
            style={{ ...styles.sidebarToggle, right: sidebarCollapsed ? -32 : -31 }}
          >{sidebarCollapsed ? "›" : "‹"}</button>
        </div>

        {activeSidebarHelp && SIDEBAR_HELP[activeSidebarHelp.key] && !sidebarCollapsed && (
          <aside
            ref={sidebarHelpRef}
            role="dialog"
            aria-label={`How to use ${SIDEBAR_HELP[activeSidebarHelp.key].title}`}
            style={{
              ...styles.sidebarHelpCallout,
              top: activeSidebarHelp.top,
              maxHeight: `calc(100vh - ${activeSidebarHelp.top + 12}px)`,
            }}
          >
            <span style={styles.sidebarHelpPointer} aria-hidden="true" />
            <div style={styles.sidebarHelpTitle}>How to use: {SIDEBAR_HELP[activeSidebarHelp.key].title}</div>
            {SIDEBAR_HELP[activeSidebarHelp.key].intro && (
              <p style={styles.sidebarHelpIntro}>{SIDEBAR_HELP[activeSidebarHelp.key].intro}</p>
            )}
            {SIDEBAR_HELP[activeSidebarHelp.key].items.length > 0 && (
              <ol style={styles.sidebarHelpList}>
                {SIDEBAR_HELP[activeSidebarHelp.key].items.map((item, index) => {
                  const entry = typeof item === "string" ? { text: item } : item;
                  return (
                    <li key={`${activeSidebarHelp.key}-${index}`}>
                      {entry.text}
                      {entry.subitems?.length > 0 && (
                        <ul style={styles.sidebarHelpSublist}>
                          {entry.subitems.map((subitem) => <li key={subitem}>{subitem}</li>)}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>
        )}

        <main style={styles.mainArea}>
          <div style={styles.toolbar}>
            <ToolButton active={mode === "pan"} onClick={() => setMode("pan")}>Pan map (P)</ToolButton>
            <ToolButton active={!showLightTerrainFeatures} onClick={() => setShowLightTerrainFeatures((visible) => !visible)}>
              {showLightTerrainFeatures ? "Hide light terrain features" : "Show light terrain features"}
            </ToolButton>
            <ToolButton active={!showDenseTerrainFeatures} onClick={() => setShowDenseTerrainFeatures((visible) => !visible)}>
              {showDenseTerrainFeatures ? "Hide dense terrain features" : "Show dense terrain features"}
            </ToolButton>
            <ToolButton
              active={!showObjectives}
              onClick={() => {
                setShowObjectives((visible) => !visible);
                setSelectedLayoutObjectiveId(null);
              }}
            >
              {showObjectives ? "Hide objectives" : "Show objectives"}
            </ToolButton>
            <ToolButton active={mode === "erase"} onClick={() => setMode("erase")}>Erase (X)</ToolButton>
            <ToolButton onClick={undo}>Undo (Z)</ToolButton>
            <div ref={generalHelpRef} style={styles.generalHelpWrap}>
              <button
                type="button"
                onClick={(event) => {
                  if (generalHelpPosition) {
                    setGeneralHelpPosition(null);
                    return;
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  setPlannerHelpOpen(false);
                  setActiveSidebarHelp(null);
                  setGeneralHelpPosition({
                    top: rect.bottom + 8,
                    right: Math.max(12, window.innerWidth - rect.right),
                  });
                }}
                style={{
                  ...styles.generalHelpButton,
                  borderColor: generalHelpPosition ? "#60a5fa" : "#cbd5e1",
                }}
              >General info and how to use</button>
              {generalHelpPosition && (
                <div
                  role="dialog"
                  aria-label="General information and how to use"
                  style={{
                    ...styles.generalHelpCallout,
                    top: generalHelpPosition.top,
                    right: generalHelpPosition.right,
                    maxHeight: `calc(100vh - ${generalHelpPosition.top + 12}px)`,
                  }}
                >
                  <div style={styles.sidebarHelpTitle}>General info and how to use</div>
                  <ol style={styles.generalHelpList}>
                    <li>This app is primarily for planning movement and Line of Sight (LOS). It can also help with screening out deepstrike and creating new maps.</li>
                    <li>The app is intended to save time when planning what to do on multiple different layouts at the same time.</li>
                    <li>Move around the map by clicking and dragging the grid. You can also use WASD.</li>
                    <li>Zoom in and out of the grid with the mouse wheel.</li>
                    <li>To simulate models on the first floor or higher, click a purple ruin wall and select 1st Floor. This stops that wall from blocking LOS until Ground is selected again.</li>
                    <li>Rotate models, units, or LOS markers by using the mouse wheel while clicking and dragging them.</li>
                    <li>You can select multiple model(s) and unit(s) by holding the right mouse click button and dragging over the marker(s) and unit(s).</li>
                    <li>You can select units quickly by using keyboard numbers (e.g. 1 will select unit 1, 5 will select unit 5, 0 will select unit 10).</li>
                    <li>Use the buttons at the top to hide or show light terrain features, dense terrain features, and objectives.</li>
                    <li>Erase (X) can erase map objects except terrain features, terrain footprints, and deployment lines belonging to a loaded preset that is not being edited.</li>
                    <li>Pan map (P) cancels an active function, such as Add Enemy (E), and returns the grid to normal movement.</li>
                    <li>Use the other How to use buttons for guidance about each specific section.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
          <div style={styles.status}>{status}</div>
          <div style={styles.legend}>White = model LOS · Blue = home deployment LOS · Red = enemy deployment LOS · Orange = valid deepstrike area · Green = visible within selected range · Yellow = crossed one footprint wall · Dark = blocked</div>

          <div style={styles.canvasWrap}>
            <div style={styles.planningControls}>
              {movementPlanningEnabled && (
                <div style={styles.planningPhaseRow}>
                  {MOVEMENT_PHASES.map((phase) => (
                    <button key={phase} type="button" style={{ ...styles.planningButton, ...(activeMovementPhase === phase ? styles.planningButtonActive : {}) }} onClick={() => switchMovementPhase(phase)}>
                      {MOVEMENT_PHASE_LABELS[phase]}
                    </button>
                  ))}
                </div>
              )}
              <div style={styles.planningMainRow}>
                <button type="button" style={{ ...styles.planningMainButton, ...(movementPlanningEnabled ? styles.planningButtonActive : {}) }} onClick={toggleMovementPlanning}>
                  Deployment & Turn-by-Turn Planner
                </button>
                <div ref={plannerHelpRef} style={styles.plannerHelpWrap}>
                  <button
                    type="button"
                    aria-expanded={plannerHelpOpen}
                    onClick={() => setPlannerHelpOpen((open) => !open)}
                    style={{ ...styles.planningHelpButton, ...(plannerHelpOpen ? styles.planningButtonActive : {}) }}
                  >How to use</button>
                  {plannerHelpOpen && (
                    <div role="dialog" aria-label="How to use Deployment and Turn-by-Turn Planner" style={styles.plannerHelpCallout}>
                      <div style={styles.sidebarHelpTitle}>How to use: Deployment &amp; Turn-by-Turn Planner</div>
                      <p style={styles.sidebarHelpIntro}>Allows for planning deployment and turn-by-turn movement.</p>
                      <ol style={styles.plannerHelpList}>
                        <li>Add models, units, or LOS markers during Deployment.</li>
                        <li>Click Turn 1 and move your models, units, or LOS markers. The app displays how far they moved, while LOS, range, coherency, deepstrike, and other tools continue to work normally.</li>
                        <li>Repeat the process for Turn 2 and, if useful, Turns 3, 4, and 5.</li>
                        <li>Saving the game also saves every Deployment and turn position.</li>
                        <li>Export Game, inside Export/Download under Edit Layout, exports this complete plan. Other players can import the JSON file on their device to discuss movement, LOS, deepstrike, and other ideas.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} style={styles.canvas} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onDoubleClick={handleCanvasDoubleClick} onWheel={handleWheel} onContextMenu={(event) => event.preventDefault()} />
          </div>
        </main>
      </div>
      {showNewGamePrompt && (
        <div style={styles.modalBackdrop} role="presentation">
          <div style={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="new-game-title">
            <div id="new-game-title" style={styles.confirmTitle}>Do you want to create a new game save file?</div>
            <div style={styles.confirmText}>Your named game saves will remain available.</div>
            <div style={styles.confirmActions}>
              <button type="button" onClick={createNewGame} style={styles.confirmYesButton}>Yes</button>
              <button type="button" onClick={() => setShowNewGamePrompt(false)} style={styles.confirmNoButton}>No</button>
            </div>
          </div>
        </div>
      )}
      {expandedMissionCards && (
        <div
          style={styles.missionCardModalBackdrop}
          role="presentation"
          onClick={() => setExpandedMissionCards(null)}
        >
          <div
            style={styles.missionCardModal}
            role="dialog"
            aria-modal="true"
            aria-label={`${expandedMissionCards.mission} primary mission cards`}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.missionCardModalHeader}>
              <div>
                <strong>{expandedMissionCards.mission}</strong>
                <div style={styles.missionCardModalSide}>{expandedMissionCards.cards.length > 1 ? "Front and back" : "Front"}</div>
              </div>
              <button type="button" onClick={() => setExpandedMissionCards(null)} style={styles.missionCardCloseButton}>Close</button>
            </div>
            <div style={styles.missionCardModalGrid}>
              {expandedMissionCards.cards.map((card) => (
                <div key={card.side} style={styles.missionCardModalPanel}>
                  <div style={styles.missionCardModalPanelLabel}>{card.side}</div>
                  <img
                    src={card.src}
                    alt={`${expandedMissionCards.mission} ${card.side}`}
                    style={styles.missionCardModalImage}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appShell: {
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "#111",
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  },
  body: {
    height: "100%",
    width: "100%",
    display: "flex",
    overflow: "hidden",
  },
  sidebarShell: {
    position: "relative",
    height: "100%",
    flexShrink: 0,
    transition: "width 180ms ease",
    zIndex: 4,
  },
  sidebar: {
    width: 360,
    height: "100%",
    boxSizing: "border-box",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
    padding: 10,
    background: "rgba(0,0,0,.94)",
    borderRight: "1px solid rgba(255,255,255,.12)",
    transition: "transform 180ms ease",
  },
  sidebarToggle: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 32,
    height: 64,
    padding: 0,
    borderRadius: "0 10px 10px 0",
    border: "1px solid rgba(255,255,255,.28)",
    borderLeft: 0,
    background: "rgba(0,0,0,.94)",
    color: "#fff",
    fontSize: 30,
    lineHeight: 1,
    cursor: "pointer",
    zIndex: 5,
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(255,255,255,.10)",
  },
  sectionHeader: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0 8px",
    background: "transparent",
    border: 0,
    color: "#e5e7eb",
    fontWeight: 800,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: ".04em",
    cursor: "pointer",
    textAlign: "left",
  },
  sectionHeaderRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  howToUseButton: {
    flexShrink: 0,
    padding: "5px 9px",
    borderRadius: 7,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#111827",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  sidebarHelpCallout: {
    position: "fixed",
    left: 370,
    zIndex: 1200,
    width: "min(390px, calc(100vw - 386px))",
    maxHeight: "calc(100vh - 24px)",
    boxSizing: "border-box",
    overflowY: "auto",
    padding: "16px 18px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.28)",
    background: "rgba(15,23,42,.98)",
    color: "#f8fafc",
    boxShadow: "0 18px 44px rgba(0,0,0,.5)",
  },
  sidebarHelpPointer: {
    position: "absolute",
    left: -8,
    top: 16,
    width: 14,
    height: 14,
    transform: "rotate(45deg)",
    borderLeft: "1px solid rgba(255,255,255,.28)",
    borderBottom: "1px solid rgba(255,255,255,.28)",
    background: "#0f172a",
  },
  sidebarHelpTitle: {
    position: "relative",
    marginBottom: 10,
    color: "#fff",
    fontSize: 15,
    fontWeight: 900,
  },
  sidebarHelpIntro: {
    margin: 0,
    color: "#dbeafe",
    fontSize: 13,
    lineHeight: 1.45,
  },
  sidebarHelpList: {
    margin: 0,
    paddingLeft: 22,
    display: "grid",
    gap: 10,
    color: "#dbeafe",
    fontSize: 13,
    lineHeight: 1.45,
  },
  sidebarHelpSublist: {
    margin: "7px 0 0",
    paddingLeft: 18,
    display: "grid",
    gap: 7,
    color: "#bfdbfe",
  },
  sectionTriangle: {
    width: 18,
    display: "inline-block",
    color: "#93c5fd",
    fontSize: 18,
    lineHeight: 1,
    flexShrink: 0,
  },
  sectionContent: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  mapSubsection: {
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 12,
    padding: 8,
    background: "rgba(255,255,255,.04)",
    marginBottom: 8,
  },
  mapSubsectionHeader: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 0",
    border: 0,
    background: "transparent",
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: ".04em",
    textAlign: "left",
    cursor: "pointer",
  },
  mapSubsectionHeaderRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  mapSubsectionSummary: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.25,
    margin: "7px 0 8px 22px",
  },
  mapSubsectionBody: {
    display: "grid",
    gap: 8,
    marginTop: 6,
  },
  editControlSection: {
    borderTop: "1px solid rgba(255,255,255,.10)",
    paddingTop: 7,
  },
  editControlHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 0",
    border: 0,
    background: "transparent",
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: 850,
    textAlign: "left",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: ".03em",
  },
  editControlBody: {
    marginTop: 6,
  },
  layoutField: {
    display: "grid",
    gap: 2,
  },
  layoutEditorControls: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 5,
  },
  deploymentLineEditControls: {
    display: "grid",
    gap: 6,
  },
  gwFootprintTable: {
    display: "grid",
    gridTemplateColumns: "1.05fr 1fr",
    border: "1px solid rgba(148,163,184,.35)",
    borderRadius: 10,
    overflow: "hidden",
    background: "rgba(15,23,42,.28)",
  },
  gwFootprintCell: {
    minWidth: 0,
    padding: "7px 8px",
    borderBottom: "1px solid rgba(148,163,184,.22)",
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: 850,
  },
  gwFootprintHeaderCell: {
    background: "rgba(30,41,59,.85)",
    color: "#fff",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: ".03em",
  },
  gwFootprintQuantityCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  gwFootprintCounterButton: {
    width: 24,
    height: 24,
    borderRadius: 7,
    border: "1px solid rgba(255,255,255,.22)",
    background: "#111827",
    color: "#fff",
    fontSize: 16,
    fontWeight: 900,
    lineHeight: 1,
    cursor: "pointer",
  },
  gwFootprintCount: {
    minWidth: 18,
    color: "#fff",
    fontSize: 13,
    fontWeight: 900,
    textAlign: "center",
  },
  gwFootprintRecommended: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 850,
  },
  forceDispositionSelectWrap: {
    position: "relative",
    minHeight: 38,
  },
  forceDispositionTrigger: {
    width: "100%",
    minWidth: 0,
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.25)",
    color: "#fff",
    fontWeight: 800,
    textAlign: "left",
    cursor: "pointer",
  },
  forceDispositionIcon: {
    display: "grid",
    placeItems: "center",
    color: "#fff",
    flex: "0 0 24px",
  },
  forceDispositionTriggerLabel: {
    flex: 1,
    minWidth: 0,
  },
  forceDispositionChevron: {
    flex: "0 0 auto",
    fontSize: 14,
    lineHeight: 1,
  },
  forceDispositionMenu: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    zIndex: 40,
    display: "grid",
    gap: 3,
    padding: 4,
    borderRadius: 10,
    border: "1px solid #475569",
    background: "#111827",
    boxShadow: "0 12px 28px rgba(0,0,0,.45)",
  },
  forceDispositionOption: {
    width: "100%",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 9px",
    borderRadius: 7,
    border: "1px solid rgba(255,255,255,.16)",
    color: "#fff",
    fontWeight: 800,
    textAlign: "left",
    cursor: "pointer",
  },
  layoutMissionSummary: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    padding: "9px 10px",
    borderRadius: 9,
    border: "1px solid rgba(96,165,250,.28)",
    background: "rgba(37,99,235,.14)",
    color: "#f8fafc",
    fontSize: 13,
  },
  opponentMissionSummary: {
    border: "1px solid rgba(248,113,113,.34)",
    background: "rgba(153,27,27,.22)",
  },
  layoutMissionText: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  layoutMissionLabel: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".05em",
    textTransform: "uppercase",
  },
  opponentMissionLabel: {
    color: "#fecaca",
  },
  missionCardList: {
    display: "grid",
    gap: 8,
  },
  missionCardButton: {
    position: "relative",
    width: "100%",
    padding: 0,
    overflow: "hidden",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.2)",
    background: "#e9e4d8",
    cursor: "zoom-in",
  },
  missionCardImage: {
    display: "block",
    width: "100%",
    height: "auto",
  },
  missionCardSide: {
    position: "absolute",
    right: 6,
    bottom: 6,
    padding: "3px 7px",
    borderRadius: 6,
    background: "rgba(15,23,42,.88)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  missionCardModalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    background: "rgba(0,0,0,.84)",
  },
  missionCardModal: {
    width: "min(980px, 94vw)",
    maxHeight: "94vh",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.22)",
    background: "#111827",
    boxShadow: "0 20px 70px rgba(0,0,0,.65)",
  },
  missionCardModalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  missionCardModalSide: {
    marginTop: 2,
    color: "#93c5fd",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  missionCardModalGrid: {
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
    gap: 12,
    overflow: "auto",
  },
  missionCardModalPanel: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
  },
  missionCardModalPanelLabel: {
    color: "#bfdbfe",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  missionCardCloseButton: {
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.22)",
    background: "rgba(255,255,255,.08)",
    color: "#fff",
    cursor: "pointer",
  },
  missionCardModalImage: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "calc(94vh - 112px)",
    width: "auto",
    height: "auto",
    margin: "0 auto",
    borderRadius: 9,
  },
  saveNameDisplay: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.05)",
    color: "white",
    fontWeight: 800,
    cursor: "text",
    textAlign: "left",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  saveNameDisplayInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #60a5fa",
    background: "#111827",
    color: "white",
    fontWeight: 800,
  },
  storageNote: {
    padding: "7px 9px",
    borderRadius: 8,
    background: "rgba(96,165,250,.10)",
    color: "#bfdbfe",
    fontSize: 11,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "rgba(0,0,0,.72)",
  },
  confirmDialog: {
    width: "min(380px, 100%)",
    padding: 20,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.2)",
    background: "#111827",
    boxShadow: "0 18px 60px rgba(0,0,0,.55)",
  },
  confirmTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: 800,
  },
  confirmText: {
    marginTop: 8,
    color: "#cbd5e1",
    fontSize: 13,
  },
  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 18,
  },
  confirmYesButton: {
    padding: "9px 18px",
    borderRadius: 10,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  confirmNoButton: {
    padding: "9px 18px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.22)",
    background: "rgba(255,255,255,.08)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    color: "#cbd5e1",
    marginBottom: 8,
  },
  sidebarRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  inlineNumberLabel: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 800,
  },
  actionPairRow: {
    display: "grid",
    gridTemplateColumns: "1.25fr 1fr",
    gap: 6,
  },
  deploymentControlGroup: {
    display: "grid",
    gap: 5,
  },
  deploymentRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 29px 29px 52px",
    alignItems: "center",
    gap: 4,
  },
  deepstrikeRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 29px 29px",
    alignItems: "center",
    gap: 4,
  },
  compactClearButton: {
    height: 32,
    padding: "0 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(255,255,255,.08)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  deploymentDrawButton: {
    minHeight: 34,
    padding: "5px 6px",
    borderRadius: 8,
    color: "white",
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.15,
    cursor: "pointer",
  },
  deploymentLineLabel: {
    minHeight: 34,
    display: "flex",
    alignItems: "center",
    padding: "5px 6px",
    boxSizing: "border-box",
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.15,
  },
  sidebarHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  markerList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  markerItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: 6,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 10,
    cursor: "pointer",
  },
  markerDetails: {
    width: "100%",
    paddingTop: 8,
    borderTop: "1px solid rgba(255,255,255,.12)",
    cursor: "default",
  },
  unitAssignmentPanel: {
    width: "100%",
    display: "grid",
    gap: 6,
    paddingTop: 2,
  },
  markerHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  emptyMarkerNote: {
    padding: "9px 10px",
    borderRadius: 8,
    background: "rgba(255,255,255,.05)",
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
  },
  modelSearchWrap: {
    position: "relative",
    width: "100%",
  },
  modelSearchResults: {
    position: "absolute",
    zIndex: 30,
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    maxHeight: 260,
    overflowY: "auto",
    padding: 4,
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 9,
    background: "#0b1220",
    boxShadow: "0 10px 24px rgba(0,0,0,.45)",
  },
  modelSearchResult: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "7px 8px",
    border: 0,
    borderRadius: 6,
    color: "white",
    textAlign: "left",
    cursor: "pointer",
  },
  modelSearchBase: {
    fontSize: 11,
    color: "#cbd5e1",
  },
  markerDetailLabel: {
    marginBottom: 6,
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  },
  markerNameInput: {
    flex: 1,
    minWidth: 0,
    padding: "7px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#111827",
    color: "white",
    fontWeight: 700,
  },
  unitNameInput: {
    flex: 1,
    minWidth: 0,
    padding: "7px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#111827",
    color: "white",
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflowX: "auto",
  },
  markerVisibilityButton: {
    width: 29,
    height: 29,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    padding: 3,
    border: 0,
    borderRadius: 7,
    background: "transparent",
    cursor: "pointer",
  },
  smallInput: {
    width: 76,
    padding: "8px 8px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "#111827",
    color: "white",
    fontWeight: 700,
  },
  armyTextArea: {
    width: "100%",
    minHeight: 160,
    boxSizing: "border-box",
    padding: "10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "#111827",
    color: "white",
    resize: "vertical",
    fontFamily: "inherit",
  },
  armyNameDisplay: {
    flex: 1,
    minWidth: 0,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.16)",
    background: "#111827",
    color: "#e5e7eb",
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  armyResultList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 300,
    overflowY: "auto",
    paddingRight: 2,
  },
  armyResultItem: {
    padding: 8,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.05)",
  },
  armyUnitInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#111827",
    color: "white",
    fontWeight: 700,
  },
  armyBaseLine: {
    marginTop: 5,
    marginBottom: 6,
    fontSize: 12,
    color: "#cbd5e1",
  },
  armyMatchLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },
  armyManualGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 64px 64px 72px",
    gap: 6,
    alignItems: "center",
  },
  iconChoiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.18)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  },
  fullInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "#111827",
    color: "white",
    fontWeight: 700,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 6,
    background: "rgba(0,0,0,.92)",
    borderBottom: "1px solid rgba(255,255,255,.12)",
    overflowX: "auto",
    overflowY: "hidden",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  generalHelpWrap: {
    position: "relative",
    flexShrink: 0,
  },
  generalHelpButton: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 800,
  },
  generalHelpCallout: {
    position: "fixed",
    zIndex: 1400,
    width: "min(460px, calc(100vw - 24px))",
    boxSizing: "border-box",
    overflowY: "auto",
    padding: "16px 18px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.28)",
    background: "rgba(15,23,42,.98)",
    color: "#f8fafc",
    textAlign: "left",
    whiteSpace: "normal",
    boxShadow: "0 18px 44px rgba(0,0,0,.55)",
  },
  generalHelpList: {
    margin: 0,
    paddingLeft: 22,
    display: "grid",
    gap: 10,
    color: "#dbeafe",
    fontSize: 13,
    lineHeight: 1.45,
  },
  uploadButton: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.35)",
    background: "#f8fafc",
    color: "#111827",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  label: {
    padding: "8px 4px",
    fontSize: 12,
    color: "#cbd5e1",
    whiteSpace: "nowrap",
  },
  select: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  baseInput: {
    width: 62,
    padding: "8px 8px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "#111827",
    color: "white",
    fontWeight: 700,
  },
  losNameInput: {
    width: 100,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "#111827",
    color: "white",
    fontWeight: 600,
  },
  saveInput: {
    width: 120,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "#111827",
    color: "white",
    fontWeight: 600,
  },
  status: {
    padding: "7px 10px",
    fontSize: 13,
    background: "#171717",
    borderBottom: "1px solid rgba(255,255,255,.10)",
    color: "#e5e7eb",
    flexShrink: 0,
  },
  legend: {
    padding: "5px 10px",
    fontSize: 12,
    background: "#0b0b0b",
    borderBottom: "1px solid rgba(255,255,255,.10)",
    color: "#a3a3a3",
    flexShrink: 0,
  },
  planningControls: {
    position: "absolute",
    top: 14,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 4,
    pointerEvents: "none",
    display: "grid",
    justifyItems: "center",
    gap: 8,
    width: "min(96%, 1120px)",
  },
  planningPhaseRow: {
    display: "flex",
    justifyContent: "center",
    gap: 18,
    flexWrap: "wrap",
    pointerEvents: "auto",
  },
  planningMainRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    pointerEvents: "auto",
  },
  planningButton: {
    minWidth: 112,
    padding: "8px 14px",
    borderRadius: 9,
    border: "1px solid rgba(0,0,0,.25)",
    background: "#f8fafc",
    color: "#111827",
    fontWeight: 850,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,.28)",
  },
  planningMainButton: {
    minWidth: 240,
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,.25)",
    background: "#f8fafc",
    color: "#111827",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,.28)",
    pointerEvents: "auto",
  },
  planningHelpButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,.25)",
    background: "#f8fafc",
    color: "#111827",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,.28)",
    whiteSpace: "nowrap",
  },
  plannerHelpWrap: {
    position: "relative",
  },
  plannerHelpCallout: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    zIndex: 10,
    width: "min(410px, calc(100vw - 32px))",
    maxHeight: "min(480px, calc(100vh - 150px))",
    boxSizing: "border-box",
    overflowY: "auto",
    padding: "16px 18px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.28)",
    background: "rgba(15,23,42,.98)",
    color: "#f8fafc",
    textAlign: "left",
    boxShadow: "0 18px 44px rgba(0,0,0,.5)",
    pointerEvents: "auto",
  },
  plannerHelpList: {
    margin: "10px 0 0",
    paddingLeft: 22,
    display: "grid",
    gap: 10,
    color: "#dbeafe",
    fontSize: 13,
    lineHeight: 1.45,
  },
  planningButtonActive: {
    background: "#dbeafe",
    border: "1px solid #2563eb",
  },
  canvasWrap: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    width: "100%",
    overflow: "hidden",
    background: "#111",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
    touchAction: "none",
    background: "#111",
  },
};

function ToolButton({ active, disabled, onClick, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: active ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,.18)",
        background: active ? "rgba(37,99,235,.35)" : "rgba(255,255,255,.08)",
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        fontWeight: active ? 700 : 500,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

function MapSubsection({ title, summary, open, onToggle, onHelp, helpOpen, children }) {
  return (
    <div style={styles.mapSubsection}>
      <div style={styles.mapSubsectionHeaderRow}>
        <button type="button" onClick={onToggle} style={styles.mapSubsectionHeader}>
          <span style={styles.sectionTriangle}>{open ? "▾" : "▸"}</span>
          <span>{title}</span>
        </button>
        <button
          type="button"
          data-sidebar-help-button
          aria-expanded={helpOpen}
          onClick={onHelp}
          style={{
            ...styles.howToUseButton,
            background: helpOpen ? "#dbeafe" : "#f8fafc",
            borderColor: helpOpen ? "#60a5fa" : "#cbd5e1",
          }}
        >How to use</button>
      </div>
      <div style={styles.mapSubsectionSummary}>{summary}</div>
      {open && <div style={styles.mapSubsectionBody}>{children}</div>}
    </div>
  );
}

function EditControlSection({ title, open, onToggle, children }) {
  return (
    <div style={styles.editControlSection}>
      <button type="button" onClick={onToggle} style={styles.editControlHeader}>
        <span style={styles.sectionTriangle}>{open ? "▾" : "▸"}</span>
        <span>{title}</span>
      </button>
      {open && <div style={styles.editControlBody}>{children}</div>}
    </div>
  );
}

function ForceDispositionSelect({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispositionStyle = FORCE_DISPOSITION_STYLES[value] || FORCE_DISPOSITION_STYLES["Take and Hold"];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} style={styles.forceDispositionSelectWrap}>
      <button
        type="button"
        aria-label={`${label}: ${value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{ ...styles.forceDispositionTrigger, background: dispositionStyle.color }}
      >
        <span style={styles.forceDispositionIcon} aria-hidden="true">
          <ForceDispositionIcon kind={dispositionStyle.icon} />
        </span>
        <span style={styles.forceDispositionTriggerLabel}>{value}</span>
        <span style={styles.forceDispositionChevron} aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div role="listbox" aria-label={label} style={styles.forceDispositionMenu}>
          {FORCE_DISPOSITIONS.map((disposition) => {
            const optionStyle = FORCE_DISPOSITION_STYLES[disposition];
            const selected = disposition === value;
            return (
              <button
                key={disposition}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(disposition);
                  setOpen(false);
                }}
                style={{
                  ...styles.forceDispositionOption,
                  background: optionStyle.color,
                  boxShadow: selected ? "inset 0 0 0 2px #fff" : "none",
                }}
              >
                <span style={styles.forceDispositionIcon} aria-hidden="true">
                  <ForceDispositionIcon kind={optionStyle.icon} />
                </span>
                <span>{disposition}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ForceDispositionIcon({ kind }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" };
  if (kind === "sword") return <svg {...common}><path d="m5 4 10 10M7 2l10 10-3 3L4 5l3-3ZM13 15l-3 3m1.5-1.5 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (kind === "bomb") return <svg {...common}><circle cx="11" cy="13" r="7" stroke="currentColor" strokeWidth="2" /><path d="m16 8 2-2m0 0 2 2m-2-2V3m-3 2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (kind === "eye") return <svg {...common}><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="2" /></svg>;
  if (kind === "arrow") return <svg {...common}><path d="m3 11 18-8-8 18-2-7-8-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  return <svg {...common}><path d="M5 9h14v12H5V9Zm2-6v6m10-6v6M9 13h6v8H9v-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function MarkerVisibilityButton({ active, kind, label, onClick }) {
  const activeColor = kind === "show" ? "#22c55e" : "#ef4444";
  const color = active ? activeColor : "#64748b";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ ...styles.markerVisibilityButton, color }}
    >
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="2.2" />
        {kind === "hide" && (
          <path d="M4 4 20 20" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

function SidebarSectionHeader({ title, open, onToggle, onHelp, helpOpen }) {
  return (
    <div style={{ ...styles.sectionHeaderRow, marginBottom: open ? 8 : 0 }}>
      <button type="button" style={styles.sectionHeader} onClick={onToggle}>
        <span style={styles.sectionTriangle}>{open ? "▾" : "▸"}</span>
        <span>{title}</span>
      </button>
      <button
        type="button"
        data-sidebar-help-button
        aria-expanded={helpOpen}
        onClick={onHelp}
        style={{
          ...styles.howToUseButton,
          background: helpOpen ? "#dbeafe" : "#f8fafc",
          borderColor: helpOpen ? "#60a5fa" : "#cbd5e1",
        }}
      >How to use</button>
    </div>
  );
}

function DeploymentControlRow({ label, visible, hasLine, onVisibility, rangeInches, onRangeChange }) {
  return (
    <div style={styles.deploymentControlGroup}>
      <div style={styles.deploymentRow}>
        <div style={styles.deploymentLineLabel}>{label}</div>
        <MarkerVisibilityButton
          active={hasLine && visible}
          kind="show"
          label={`Enable ${label}`}
          onClick={() => onVisibility(true)}
        />
        <MarkerVisibilityButton
          active={hasLine && !visible}
          kind="hide"
          label={`Disable ${label}`}
          onClick={() => onVisibility(false)}
        />
      </div>
      <input
        type="number"
        min="0"
        step="1"
        value={rangeInches === "unlimited" ? "" : rangeInches}
        onChange={(e) => onRangeChange(e.target.value)}
        style={styles.fullInput}
        placeholder="0/blank = unlimited deployment range"
        title="Deployment LOS range in inches; blank or 0 means unlimited"
      />
    </div>
  );
}

function computeVisibilityZones(source, blockers, walls, W, H) {
  return {
    clear: computeVisibilityByFootprintWallLimit(source, blockers, walls, W, H, 0),
    oneWall: computeVisibilityByFootprintWallLimit(source, blockers, walls, W, H, 1),
  };
}

const visibilityGeometryCache = new Map();
const footprintBoundarySegmentCache = new WeakMap();
const VISIBILITY_GRID_CELL_SIZE = 96;
const VISIBILITY_ANGLE_SNAP = 0.000025;
const VISIBILITY_ISOLATED_RAY_ANGLE = 0.012;

function segmentBounds(a, b, padding = 0) {
  return {
    minX: Math.min(a.x, b.x) - padding,
    maxX: Math.max(a.x, b.x) + padding,
    minY: Math.min(a.y, b.y) - padding,
    maxY: Math.max(a.y, b.y) + padding,
  };
}

function boundsOverlap(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function buildSegmentSpatialIndex(segments, cellSize = VISIBILITY_GRID_CELL_SIZE) {
  const cells = new Map();
  const cellKey = (x, y) => `${x}:${y}`;
  segments.forEach((segment, index) => {
    const bounds = segment.bounds || segmentBounds(segment.a, segment.b);
    const minCellX = Math.floor(bounds.minX / cellSize);
    const maxCellX = Math.floor(bounds.maxX / cellSize);
    const minCellY = Math.floor(bounds.minY / cellSize);
    const maxCellY = Math.floor(bounds.maxY / cellSize);
    for (let x = minCellX; x <= maxCellX; x += 1) {
      for (let y = minCellY; y <= maxCellY; y += 1) {
        const key = cellKey(x, y);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(index);
      }
    }
  });
  return { cells, cellSize, segments };
}

function spatialSegmentsForBounds(spatialIndex, bounds) {
  if (!spatialIndex?.cells || !spatialIndex?.segments) return [];
  const { cells, cellSize, segments } = spatialIndex;
  const minCellX = Math.floor(bounds.minX / cellSize);
  const maxCellX = Math.floor(bounds.maxX / cellSize);
  const minCellY = Math.floor(bounds.minY / cellSize);
  const maxCellY = Math.floor(bounds.maxY / cellSize);
  const indexes = new Set();
  for (let x = minCellX; x <= maxCellX; x += 1) {
    for (let y = minCellY; y <= maxCellY; y += 1) {
      const cellSegments = cells.get(`${x}:${y}`);
      if (!cellSegments) continue;
      cellSegments.forEach((index) => indexes.add(index));
    }
  }
  return [...indexes]
    .map((index) => segments[index])
    .filter((segment) => segment && boundsOverlap(bounds, segment.bounds || segmentBounds(segment.a, segment.b)));
}

function spatialSegmentsForLine(spatialIndex, a, b, paddingCells = 1) {
  if (!spatialIndex?.cells || !spatialIndex?.segments) return [];
  const { cells, cellSize, segments } = spatialIndex;
  const indexes = new Set();
  const addCell = (cellX, cellY) => {
    for (let dx = -paddingCells; dx <= paddingCells; dx += 1) {
      for (let dy = -paddingCells; dy <= paddingCells; dy += 1) {
        const cellSegments = cells.get(`${cellX + dx}:${cellY + dy}`);
        if (cellSegments) cellSegments.forEach((index) => indexes.add(index));
      }
    }
  };

  let cellX = Math.floor(a.x / cellSize);
  let cellY = Math.floor(a.y / cellSize);
  const endCellX = Math.floor(b.x / cellSize);
  const endCellY = Math.floor(b.y / cellSize);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const stepX = dx >= 0 ? 1 : -1;
  const stepY = dy >= 0 ? 1 : -1;
  const tDeltaX = Math.abs(dx) > 0.000001 ? Math.abs(cellSize / dx) : Infinity;
  const tDeltaY = Math.abs(dy) > 0.000001 ? Math.abs(cellSize / dy) : Infinity;
  const nextBoundaryX = stepX > 0 ? (cellX + 1) * cellSize : cellX * cellSize;
  const nextBoundaryY = stepY > 0 ? (cellY + 1) * cellSize : cellY * cellSize;
  let tMaxX = Math.abs(dx) > 0.000001 ? (nextBoundaryX - a.x) / dx : Infinity;
  let tMaxY = Math.abs(dy) > 0.000001 ? (nextBoundaryY - a.y) / dy : Infinity;
  if (tMaxX < 0) tMaxX = 0;
  if (tMaxY < 0) tMaxY = 0;

  const maxSteps = Math.max(1, Math.abs(endCellX - cellX) + Math.abs(endCellY - cellY) + 8);
  for (let step = 0; step <= maxSteps; step += 1) {
    addCell(cellX, cellY);
    if (cellX === endCellX && cellY === endCellY) break;
    if (tMaxX < tMaxY) {
      cellX += stepX;
      tMaxX += tDeltaX;
    } else {
      cellY += stepY;
      tMaxY += tDeltaY;
    }
  }

  const bounds = segmentBounds(a, b, 1);
  return [...indexes]
    .map((index) => segments[index])
    .filter((segment) => segment && boundsOverlap(bounds, segment.bounds || segmentBounds(segment.a, segment.b)));
}

function candidateSegmentsForRay(source, ray, geometry, W, H) {
  if (!geometry?.spatialIndex) return geometry?.segments || [];
  const reach = Math.hypot(W, H) * 1.2;
  const end = { x: source.x + ray.x * reach, y: source.y + ray.y * reach };
  const candidates = spatialSegmentsForLine(geometry.spatialIndex, source, end);
  return candidates.length ? candidates : geometry.segments;
}

function candidateSegmentsForSegment(a, b, geometry) {
  if (!geometry?.spatialIndex) return geometry?.segments || [];
  const candidates = spatialSegmentsForLine(geometry.spatialIndex, a, b);
  return candidates.length ? candidates : geometry.segments;
}

function visibilityGeometryKey(blockers, walls, W, H) {
  let hash = 2166136261;
  const mix = (value) => {
    hash ^= Math.round(value * 100);
    hash = Math.imul(hash, 16777619);
  };
  mix(W);
  mix(H);
  blockers.forEach((poly) => {
    mix(poly.length);
    const groupId = String(poly.footprintGroupId || "");
    for (let index = 0; index < groupId.length; index += 1) mix(groupId.charCodeAt(index));
    poly.forEach((point) => {
      mix(point.x);
      mix(point.y);
    });
  });
  walls.forEach((wall) => {
    mix(wall.a.x);
    mix(wall.a.y);
    mix(wall.b.x);
    mix(wall.b.y);
  });
  return `${blockers.length}:${walls.length}:${hash >>> 0}`;
}

function buildVisibilityEdgeModel(blockers, walls, W, H) {
  const bounds = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const footprintSegments = getFootprintBoundarySegments(blockers).map((segment) => ({
    a: segment.a,
    b: segment.b,
    meta: segment.cap
      ? { type: "wall", index: -1, cap: true }
      : { type: "footprint", index: segment.index, groupKey: segment.groupKey },
  }));
  const wallSegments = walls.map((wall, index) => ({
    a: wall.a,
    b: wall.b,
    meta: { type: "wall", index },
  }));
  const boundsSegments = [];
  addSegments(bounds, boundsSegments, { type: "bounds" });
  return {
    bounds,
    boundsSegments,
    footprintSegments,
    wallSegments,
    segments: [...boundsSegments, ...footprintSegments, ...wallSegments],
  };
}

function getPreparedVisibilityGeometry(blockers, walls, W, H) {
  const key = visibilityGeometryKey(blockers, walls, W, H);
  const cached = visibilityGeometryCache.get(key);
  if (cached) return cached;

  const edgeModel = buildVisibilityEdgeModel(blockers, walls, W, H);
  const vertices = dedupeVisibilityVertices([
    ...edgeModel.bounds,
    ...edgeModel.footprintSegments.flatMap((segment) => [segment.a, segment.b]),
    ...adaptiveVisibilityEdgeVertices(edgeModel.footprintSegments),
    ...edgeModel.wallSegments.flatMap((segment) => [segment.a, segment.b]),
  ]);
  const preparedSegments = edgeModel.segments.map((segment) => ({
    ...segment,
    bounds: segmentBounds(segment.a, segment.b),
  }));
  const spatialIndex = buildSegmentSpatialIndex(
    preparedSegments,
    Math.max(48, Math.min(160, Math.max(W, H) / 8)),
  );
  const geometry = { ...edgeModel, vertices, segments: preparedSegments, spatialIndex };
  visibilityGeometryCache.set(key, geometry);
  if (visibilityGeometryCache.size > 6) {
    visibilityGeometryCache.delete(visibilityGeometryCache.keys().next().value);
  }
  return geometry;
}

function dedupeVisibilityVertices(vertices) {
  const seen = new Set();
  return vertices.filter((vertex) => {
    if (!vertex || !Number.isFinite(vertex.x) || !Number.isFinite(vertex.y)) return false;
    const key = `${Math.round(vertex.x * 1000)}:${Math.round(vertex.y * 1000)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function adaptiveVisibilityEdgeVertices(segments) {
  const vertices = [];
  segments.forEach((segment) => {
    const length = dist(segment.a, segment.b);
    if (!Number.isFinite(length) || length < 42) return;
    const count = Math.min(4, Math.floor(length / 42));
    for (let index = 1; index <= count; index += 1) {
      vertices.push(interpolatePoint(segment.a, segment.b, index / (count + 1)));
    }
  });
  return vertices;
}

function computeVisibilityByFootprintWallLimit(source, blockers, walls, W, H, allowedFootprintWalls, preparedGeometry = null) {
  if (!source || !W || !H) return [];
  const eps = 0.0001;
  const geometry = preparedGeometry || getPreparedVisibilityGeometry(blockers, walls, W, H);
  const { vertices } = geometry;
  const angles = [];
  vertices.forEach((v) => {
    const a = Math.atan2(v.y - source.y, v.x - source.x);
    angles.push(a - eps, a, a + eps);
  });

  const containingBlockers = new Set();
  blockers.forEach((poly, index) => {
    if (pointInPoly(source, poly)) containingBlockers.add(footprintSurfaceKey(blockers, index));
  });

  const hits = [];
  snapVisibilityAngles(angles).forEach((a) => {
    const ray = { x: Math.cos(a), y: Math.sin(a) };
    const intersections = [];
    candidateSegmentsForRay(source, ray, geometry, W, H).forEach((s) => {
      const hit = raySegmentIntersection(source, ray, s.a, s.b);
      if (hit && hit.t > 0.0001) intersections.push({ ...hit, meta: s.meta });
    });

    intersections.sort((p, q) => p.t - q.t);
    const uniqueIntersections = [];
    intersections.forEach((hit) => {
      const previous = uniqueIntersections[uniqueIntersections.length - 1];
      const sameDistance = previous && Math.abs(previous.t - hit.t) < 0.001;
      const sameSurface = previous && previous.meta.type === hit.meta.type
        && (previous.meta.groupKey || previous.meta.index) === (hit.meta.groupKey || hit.meta.index);
      if (!sameDistance || !sameSurface) uniqueIntersections.push(hit);
    });

    let footprintWallsCrossed = 0;
    let chosen = uniqueIntersections[uniqueIntersections.length - 1] || null;

    for (const hit of uniqueIntersections) {
      if (hit.meta.type === "bounds") {
        chosen = hit;
        break;
      }

      if (hit.meta.type === "wall") {
        chosen = hit;
        break;
      }

      if (hit.meta.type === "footprint") {
        const surfaceKey = hit.meta.groupKey || footprintSurfaceKey(blockers, hit.meta.index);
        const sampleDistance = 0.25;
        const before = { x: hit.x - ray.x * sampleDistance, y: hit.y - ray.y * sampleDistance };
        const after = { x: hit.x + ray.x * sampleDistance, y: hit.y + ray.y * sampleDistance };
        const beforeInside = pointInFootprintSurface(before, blockers, surfaceKey);
        const afterInside = pointInFootprintSurface(after, blockers, surfaceKey);
        if (beforeInside === afterInside) continue;
        if (containingBlockers.has(surfaceKey) && beforeInside) {
          containingBlockers.delete(surfaceKey);
        }
        footprintWallsCrossed += 1;
        if (footprintWallsCrossed > allowedFootprintWalls) {
          chosen = hit;
          break;
        }
      }
    }

    if (chosen) hits.push({ x: chosen.x, y: chosen.y, angle: a });
  });

  hits.sort((p, q) => p.angle - q.angle);
  return sanitizeVisibilityPolygon(source, hits, W, H);
}

function directEnemyLOSState(enemy, enemyRadius, origins, blockers, walls, interactive = false, preparedGeometry = null) {
  if (!origins.length) return "blocked";
  let hasCenterOneWallPath = false;
  let hasEdgeOneWallPath = false;
  let hasClearPath = false;
  const enemyTouchesFootprint = enemyBaseTouchesFootprint(enemy, enemyRadius, blockers);
  for (const origin of origins) {
    const state = classifySightSegment(origin, enemy, blockers, walls, preparedGeometry);
    if (state === "clear") hasClearPath = true;
    if (state === "oneWall") hasCenterOneWallPath = true;
  }

  // A base whose centre is blocked or in cover can still have a clear edge.
  // Check all meaningful edge arcs for clear LOS before promoting the marker
  // to yellow, otherwise a tiny cover-grazing line can overrule a clean view.
  const targetSamples = interactive ? 8 : 16;
  for (const origin of origins) {
    const edgeStates = [];
    for (let index = 0; index < targetSamples; index += 1) {
      const angle = index / targetSamples * Math.PI * 2;
      const target = {
        x: enemy.x + Math.cos(angle) * enemyRadius,
        y: enemy.y + Math.sin(angle) * enemyRadius,
      };
      edgeStates.push(classifySightSegment(origin, target, blockers, walls, preparedGeometry));
    }
    if (hasAdjacentEnemyEdgeSamples(edgeStates, "clear")) hasClearPath = true;
    if (hasAdjacentEnemyEdgeSamples(edgeStates, "oneWall")) hasEdgeOneWallPath = true;
  }
  if (hasCenterOneWallPath || hasEdgeOneWallPath) return "oneWall";
  if (hasClearPath) return enemyTouchesFootprint ? "oneWall" : "clear";
  return "blocked";
}

function enemyBaseTouchesFootprint(enemy, enemyRadius, blockers) {
  const surfaceKeys = [...new Set(blockers.map((_, index) => footprintSurfaceKey(blockers, index)))];
  const boundarySegments = getFootprintBoundarySegments(blockers);
  return surfaceKeys.some((surfaceKey) => {
    if (pointInFootprintSurface(enemy, blockers, surfaceKey)) return true;
    return boundarySegments.some((segment) => {
      if (segment.groupKey !== surfaceKey) return false;
      return dist(enemy, closestPointOnSegment(enemy, segment.a, segment.b)) <= enemyRadius + 0.01;
    });
  });
}

function hasAdjacentEnemyEdgeSamples(states, targetState) {
  return states.some((state, index) => (
    state === targetState
    && states[(index + 1) % states.length] === targetState
  ));
}

function classifySightSegment(origin, target, blockers, walls, preparedGeometry = null) {
  const candidateSegments = preparedGeometry
    ? candidateSegmentsForSegment(origin, target, preparedGeometry)
    : null;
  const wallSegments = candidateSegments
    ? candidateSegments.filter((segment) => segment.meta?.type === "wall")
    : walls.map((wall, index) => ({ a: wall.a, b: wall.b, meta: { type: "wall", index } }));
  for (const wall of wallSegments) {
    const hit = segmentIntersectionParameters(origin, target, wall.a, wall.b);
    if (hit && hit.t > 0.0001 && hit.t < 0.9999) return "blocked";
  }

  const intersectionsBySurface = new Map();
  blockers.forEach((polygon, index) => {
    intersectionsBySurface.set(footprintSurfaceKey(blockers, index), []);
  });
  const boundarySegments = preparedGeometry
    ? candidateSegments
      .filter((segment) => segment.meta?.type === "footprint")
      .map((segment) => ({
        a: segment.a,
        b: segment.b,
        index: segment.meta.index,
        groupKey: segment.meta.groupKey,
      }))
    : getFootprintBoundarySegments(blockers);
  boundarySegments.forEach((segment) => {
    const hit = segmentIntersectionParameters(origin, target, segment.a, segment.b);
    if (!hit || hit.t <= 0.0001 || hit.t >= 0.9999) return;
    intersectionsBySurface.get(segment.groupKey)?.push(hit.t);
  });

  let footprintCrossings = 0;
  for (const [surfaceKey, intersections] of intersectionsBySurface) {
    const occupiedIntervals = sightSegmentTerrainIntervals(
      origin,
      target,
      blockers,
      surfaceKey,
      intersections,
    );
    occupiedIntervals.forEach((interval) => {
      const touchesOrigin = interval.start <= 0.0001;
      const touchesTarget = interval.end >= 0.9999;
      if (touchesOrigin && touchesTarget) return;
      footprintCrossings += touchesOrigin || touchesTarget ? 1 : 2;
    });
    if (footprintCrossings > 1) return "blocked";
  }
  return footprintCrossings === 1 ? "oneWall" : "clear";
}

function sightSegmentTerrainIntervals(origin, target, blockers, surfaceKey, intersections) {
  const cuts = [0, ...intersections, 1]
    .sort((left, right) => left - right)
    .filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]) > 0.0005);
  const occupied = [];
  for (let index = 0; index < cuts.length - 1; index += 1) {
    const start = cuts[index];
    const end = cuts[index + 1];
    if (end - start <= 0.00001) continue;
    const midpoint = (start + end) / 2;
    const sample = {
      x: origin.x + (target.x - origin.x) * midpoint,
      y: origin.y + (target.y - origin.y) * midpoint,
    };
    if (!pointInFootprintSurface(sample, blockers, surfaceKey)) continue;
    const previous = occupied[occupied.length - 1];
    if (previous && Math.abs(previous.end - start) <= 0.0005) previous.end = end;
    else occupied.push({ start, end });
  }
  return occupied;
}

function sanitizeVisibilityPolygon(source, hits, W, H) {
  const deduped = hits.filter((point, index, points) => index === 0 || dist(point, points[index - 1]) > 0.25);
  if (deduped.length < 3) {
    deduped.source = { ...source };
    return deduped;
  }
  const maximumRadius = Math.hypot(W, H) * 1.05;
  const sanitized = deduped.filter((point, index, points) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const radius = dist(source, point);
    if (!Number.isFinite(radius) || radius > maximumRadius) return false;
    const previousRadius = dist(source, previous);
    const nextRadius = dist(source, next);
    const minimumNeighbourRadius = Math.max(Math.min(previousRadius, nextRadius), 1);
    const maximumNeighbourRadius = Math.max(previousRadius, nextRadius, 1);
    const angularGap = Math.abs(normalizeAngle(point.angle - previous.angle))
      + Math.abs(normalizeAngle(next.angle - point.angle));
    const neighboursAgree = maximumNeighbourRadius / minimumNeighbourRadius < 1.45;
    const isolatedFarSpike = radius > maximumNeighbourRadius * 1.55;
    const isolatedNearSpike = radius < minimumNeighbourRadius * 0.68;
    return !(neighboursAgree && (isolatedFarSpike || isolatedNearSpike) && angularGap < VISIBILITY_ISOLATED_RAY_ANGLE);
  });
  sanitized.source = { ...source };
  return sanitized;
}

function snapVisibilityAngles(angles) {
  if (!angles.length) return [];
  const sorted = [...angles].sort((left, right) => left - right);
  const snapped = [];
  let cluster = [sorted[0]];
  for (let index = 1; index < sorted.length; index += 1) {
    if (Math.abs(sorted[index] - cluster[cluster.length - 1]) <= VISIBILITY_ANGLE_SNAP) {
      cluster.push(sorted[index]);
      continue;
    }
    snapped.push(cluster[Math.floor(cluster.length / 2)]);
    cluster = [sorted[index]];
  }
  snapped.push(cluster[Math.floor(cluster.length / 2)]);
  return snapped;
}

function normalizeAngle(angle) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

function enemyBaseRadius(pixelsPerInch) {
  return Number.isFinite(pixelsPerInch) && pixelsPerInch > 0
    ? pixelsPerInch * (25 / 25.4) / 2
    : 12.5;
}

function enemyInRange(enemy, light, rangeRadius, pixelsPerInch = null) {
  if (!Number.isFinite(rangeRadius)) return true;
  const enemyRadius = enemyBaseRadius(pixelsPerInch);
  return dist(enemy, light) <= rangeRadius + enemyRadius;
}

function addSegments(poly, segments, meta) {
  for (let i = 0; i < poly.length; i++) segments.push({ a: poly[i], b: poly[(i + 1) % poly.length], meta });
}

function footprintSurfaceKey(blockers, index) {
  const groupId = String(blockers[index]?.footprintGroupId || "");
  return groupId.startsWith("layout-group:") ? groupId : `footprint:${index}`;
}

function pointInFootprintSurface(point, blockers, surfaceKey) {
  if (String(surfaceKey).startsWith("layout-group:")) {
    return blockers.some((polygon) => String(polygon.footprintGroupId || "") === surfaceKey && pointInPoly(point, polygon));
  }
  const index = Number(String(surfaceKey).replace("footprint:", ""));
  return Number.isInteger(index) && blockers[index] ? pointInPoly(point, blockers[index]) : false;
}

function getFootprintBoundarySegments(blockers) {
  const cached = footprintBoundarySegmentCache.get(blockers);
  if (cached) return cached;

  const groupedIndexes = new Map();
  blockers.forEach((polygon, index) => {
    const groupId = String(polygon.footprintGroupId || "");
    if (!groupId.startsWith("layout-group:")) return;
    if (!groupedIndexes.has(groupId)) groupedIndexes.set(groupId, []);
    groupedIndexes.get(groupId).push(index);
  });

  const segments = [];
  blockers.forEach((polygon, polygonIndex) => {
    if (!polygon?.length) return;
    const groupId = String(polygon.footprintGroupId || "");
    const groupKey = footprintSurfaceKey(blockers, polygonIndex);
    const partnerIndexes = (groupedIndexes.get(groupId) || []).filter((index) => index !== polygonIndex);
    if (!partnerIndexes.length) {
      for (let index = 0; index < polygon.length; index += 1) {
        segments.push({ a: polygon[index], b: polygon[(index + 1) % polygon.length], index: polygonIndex, groupKey });
      }
      return;
    }

    for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex += 1) {
      const edgeStart = polygon[edgeIndex];
      const edgeEnd = polygon[(edgeIndex + 1) % polygon.length];
      const edgeLength = dist(edgeStart, edgeEnd);
      const tolerance = Number.isFinite(polygon.sharedBoundaryTolerance)
        ? polygon.sharedBoundaryTolerance
        : 0.75;
      const cuts = [0, 1];

      partnerIndexes.forEach((partnerIndex) => {
        const partner = blockers[partnerIndex];
        for (let partnerEdgeIndex = 0; partnerEdgeIndex < partner.length; partnerEdgeIndex += 1) {
          const partnerStart = partner[partnerEdgeIndex];
          const partnerEnd = partner[(partnerEdgeIndex + 1) % partner.length];
          const intersection = segmentIntersectionParameters(edgeStart, edgeEnd, partnerStart, partnerEnd);
          if (intersection) cuts.push(intersection.t);

          const partnerTolerance = Number.isFinite(partner.sharedBoundaryTolerance)
            ? partner.sharedBoundaryTolerance
            : tolerance;
          const overlap = nearParallelEdgeOverlap(
            edgeStart,
            edgeEnd,
            partnerStart,
            partnerEnd,
            Math.max(tolerance, partnerTolerance),
          );
          if (overlap) cuts.push(overlap.start, overlap.end);
        }
      });

      const uniqueCuts = cuts
        .map((value) => Math.max(0, Math.min(1, value)))
        .sort((left, right) => left - right)
        .filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]) > 0.00001);

      for (let cutIndex = 0; cutIndex < uniqueCuts.length - 1; cutIndex += 1) {
        const start = uniqueCuts[cutIndex];
        const end = uniqueCuts[cutIndex + 1];
        if ((end - start) * edgeLength <= 0.001) continue;
        const midpoint = interpolatePoint(edgeStart, edgeEnd, (start + end) / 2);
        const sharedBoundary = partnerIndexes.some((partnerIndex) => {
          const partner = blockers[partnerIndex];
          const partnerTolerance = Number.isFinite(partner.sharedBoundaryTolerance)
            ? partner.sharedBoundaryTolerance
            : tolerance;
          return pointInPoly(midpoint, partner)
            || pointNearParallelPolygonEdge(
              midpoint,
              edgeStart,
              edgeEnd,
              partner,
              Math.max(tolerance, partnerTolerance),
            );
        });
        if (sharedBoundary) continue;
        segments.push({
          a: interpolatePoint(edgeStart, edgeEnd, start),
          b: interpolatePoint(edgeStart, edgeEnd, end),
          index: polygonIndex,
          groupKey,
        });
      }
    }
  });

  groupedIndexes.forEach((indexes, groupId) => {
    const groupedSegments = segments.filter((segment) => segment.groupKey === groupId);
    if (!groupedSegments.length) return;
    const tolerance = Math.max(...indexes.map((index) => blockers[index].sharedBoundaryTolerance || 0.75));
    snapSegmentEndpoints(groupedSegments, Math.max(0.1, tolerance));
  });

  segments.push(...createTouchingFootprintCaps(segments));

  footprintBoundarySegmentCache.set(blockers, segments);
  return segments;
}

function createTouchingFootprintCaps(segments) {
  const caps = [];
  const tolerance = 0.85;
  const capRadius = 0.7;
  const endpoints = [];
  segments.forEach((segment) => {
    endpoints.push({ point: segment.a, segment });
    endpoints.push({ point: segment.b, segment });
  });

  const addCap = (center, direction, groupKey) => {
    const length = Math.hypot(direction.x, direction.y);
    if (length <= 0.0001) return;
    const normal = { x: -direction.y / length, y: direction.x / length };
    caps.push({
      a: { x: center.x - normal.x * capRadius, y: center.y - normal.y * capRadius },
      b: { x: center.x + normal.x * capRadius, y: center.y + normal.y * capRadius },
      index: -1,
      groupKey,
      cap: true,
    });
  };

  for (let leftIndex = 0; leftIndex < endpoints.length; leftIndex += 1) {
    const left = endpoints[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < endpoints.length; rightIndex += 1) {
      const right = endpoints[rightIndex];
      if (left.segment === right.segment) continue;
      if (left.segment.groupKey === right.segment.groupKey) continue;
      if (dist(left.point, right.point) > tolerance) continue;
      const center = {
        x: (left.point.x + right.point.x) / 2,
        y: (left.point.y + right.point.y) / 2,
      };
      const leftDirection = segmentDirectionAwayFromEndpoint(left.segment, left.point);
      const rightDirection = segmentDirectionAwayFromEndpoint(right.segment, right.point);
      const bisector = {
        x: leftDirection.x + rightDirection.x,
        y: leftDirection.y + rightDirection.y,
      };
      addCap(center, Math.hypot(bisector.x, bisector.y) > 0.0001 ? bisector : leftDirection, `cap:${left.segment.groupKey}:${right.segment.groupKey}`);
    }
  }
  return caps;
}

function segmentDirectionAwayFromEndpoint(segment, endpoint) {
  const other = dist(endpoint, segment.a) <= dist(endpoint, segment.b) ? segment.b : segment.a;
  const vector = { x: other.x - endpoint.x, y: other.y - endpoint.y };
  const length = Math.hypot(vector.x, vector.y);
  return length > 0.0001 ? { x: vector.x / length, y: vector.y / length } : { x: 1, y: 0 };
}

function snapSegmentEndpoints(segments, tolerance) {
  const points = segments.flatMap((segment) => [segment.a, segment.b]);
  const assigned = new Set();
  points.forEach((point, index) => {
    if (assigned.has(index)) return;
    const cluster = [index];
    assigned.add(index);
    for (let candidateIndex = index + 1; candidateIndex < points.length; candidateIndex += 1) {
      if (assigned.has(candidateIndex) || dist(point, points[candidateIndex]) > tolerance) continue;
      cluster.push(candidateIndex);
      assigned.add(candidateIndex);
    }
    const center = cluster.reduce((sum, pointIndex) => ({
      x: sum.x + points[pointIndex].x,
      y: sum.y + points[pointIndex].y,
    }), { x: 0, y: 0 });
    center.x /= cluster.length;
    center.y /= cluster.length;
    cluster.forEach((pointIndex) => {
      points[pointIndex].x = center.x;
      points[pointIndex].y = center.y;
    });
  });
}

function nearParallelEdgeOverlap(a, b, c, d, tolerance) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const cd = { x: d.x - c.x, y: d.y - c.y };
  const abLength = Math.hypot(ab.x, ab.y);
  const cdLength = Math.hypot(cd.x, cd.y);
  if (abLength <= 0.001 || cdLength <= 0.001) return null;
  const parallel = Math.abs((ab.x * cd.x + ab.y * cd.y) / (abLength * cdLength));
  if (parallel < 0.985) return null;

  const distanceToLine = (point) => Math.abs(cross(ab, { x: point.x - a.x, y: point.y - a.y })) / abLength;
  if (Math.min(distanceToLine(c), distanceToLine(d)) > tolerance) return null;

  const lengthSquared = abLength * abLength;
  const project = (point) => ((point.x - a.x) * ab.x + (point.y - a.y) * ab.y) / lengthSquared;
  const start = Math.max(0, Math.min(project(c), project(d)));
  const end = Math.min(1, Math.max(project(c), project(d)));
  return end - start > 0.00001 ? { start, end } : null;
}

function pointNearParallelPolygonEdge(point, edgeStart, edgeEnd, polygon, tolerance) {
  for (let index = 0; index < polygon.length; index += 1) {
    const overlap = nearParallelEdgeOverlap(
      edgeStart,
      edgeEnd,
      polygon[index],
      polygon[(index + 1) % polygon.length],
      tolerance,
    );
    if (!overlap) continue;
    const closest = closestPointOnSegment(point, polygon[index], polygon[(index + 1) % polygon.length]);
    if (dist(point, closest) <= tolerance) return true;
  }
  return false;
}
function raySegmentIntersection(p, r, a, b) {
  const s = { x: b.x - a.x, y: b.y - a.y };
  const rxs = cross(r, s);
  if (Math.abs(rxs) < 1e-9) return null;
  const qp = { x: a.x - p.x, y: a.y - p.y };
  const t = cross(qp, s) / rxs;
  const u = cross(qp, r) / rxs;
  return t >= 0 && u >= 0 && u <= 1 ? { x: p.x + t * r.x, y: p.y + t * r.y, t } : null;
}

function simplifyClosedPolygon(points, tolerance = 2) {
  if (points.length <= 8) return points.map((point) => ({ ...point }));
  const simplified = [];
  for (let index = 0; index < points.length; index++) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const baseline = closestPointOnSegment(current, previous, next);
    if (dist(current, baseline) > tolerance || index % 4 === 0) simplified.push({ ...current });
  }
  return simplified.length >= 3 ? simplified : points.map((point) => ({ ...point }));
}

function unionPolygonBoundary(first, second) {
  const retained = [
    ...externalBoundarySegments(first, second),
    ...externalBoundarySegments(second, first),
  ];
  if (!retained.length) return first.map((point) => ({ ...point }));

  const unused = retained.map((segment) => ({ ...segment, used: false }));
  const start = unused[0];
  start.used = true;
  const boundary = [{ ...start.a }, { ...start.b }];
  const joinTolerance = 1.5;

  while (boundary.length <= unused.length + 2) {
    const end = boundary[boundary.length - 1];
    let best = null;
    let bestDistance = Infinity;
    unused.forEach((segment) => {
      if (segment.used) return;
      const toA = dist(end, segment.a);
      const toB = dist(end, segment.b);
      if (toA < bestDistance) {
        best = { segment, point: segment.b, distance: toA };
        bestDistance = toA;
      }
      if (toB < bestDistance) {
        best = { segment, point: segment.a, distance: toB };
        bestDistance = toB;
      }
    });
    if (!best || best.distance > joinTolerance) break;
    best.segment.used = true;
    if (dist(best.point, boundary[0]) <= joinTolerance) break;
    boundary.push({ ...best.point });
  }

  return boundary.length >= 3 ? boundary : first.map((point) => ({ ...point }));
}

function externalBoundarySegments(poly, other) {
  const segments = [];
  const epsilon = 0.75;
  for (let index = 0; index < poly.length; index++) {
    const a = poly[index];
    const b = poly[(index + 1) % poly.length];
    const cuts = [0, 1];
    for (let otherIndex = 0; otherIndex < other.length; otherIndex++) {
      const hit = segmentIntersectionParameters(a, b, other[otherIndex], other[(otherIndex + 1) % other.length]);
      if (hit && hit.t > 0.0001 && hit.t < 0.9999) cuts.push(hit.t);
    }
    cuts.sort((left, right) => left - right);
    for (let cutIndex = 0; cutIndex < cuts.length - 1; cutIndex++) {
      const from = interpolatePoint(a, b, cuts[cutIndex]);
      const to = interpolatePoint(a, b, cuts[cutIndex + 1]);
      const midpoint = interpolatePoint(from, to, 0.5);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const normal = { x: -dy / length * epsilon, y: dx / length * epsilon };
      const sideA = { x: midpoint.x + normal.x, y: midpoint.y + normal.y };
      const sideB = { x: midpoint.x - normal.x, y: midpoint.y - normal.y };
      const outsideA = !pointInPoly(sideA, poly) && !pointInPoly(sideA, other);
      const outsideB = !pointInPoly(sideB, poly) && !pointInPoly(sideB, other);
      if (outsideA || outsideB) segments.push({ a: from, b: to });
    }
  }
  return segments;
}

function segmentIntersectionParameters(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denominator = cross(r, s);
  if (Math.abs(denominator) < 1e-9) return null;
  const offset = { x: c.x - a.x, y: c.y - a.y };
  const t = cross(offset, s) / denominator;
  const u = cross(offset, r) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
}

function interpolatePoint(a, b, amount) {
  return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount };
}

function polygonsTouchOrNear(a, b, threshold) {
  if (!a.length || !b.length) return false;
  if (a.some((point) => pointInPoly(point, b)) || b.some((point) => pointInPoly(point, a))) return true;
  return a.some((point) => pointNearPolygon(point, b, threshold))
    || b.some((point) => pointNearPolygon(point, a, threshold));
}

function approximatePolygonBoundaryContact(first, second, tolerance, sampleStep) {
  const sampledContact = (source, target) => {
    let contact = 0;
    for (let index = 0; index < source.length; index += 1) {
      const a = source[index];
      const b = source[(index + 1) % source.length];
      const length = dist(a, b);
      const samples = Math.max(1, Math.ceil(length / Math.max(sampleStep, 0.5)));
      for (let sample = 0; sample < samples; sample += 1) {
        const point = interpolatePoint(a, b, (sample + 0.5) / samples);
        if (pointNearPolygon(point, target, tolerance)) contact += length / samples;
      }
    }
    return contact;
  };
  return Math.max(sampledContact(first, second), sampledContact(second, first));
}

function sealTouchingPolygonVertices(polygons, tolerance) {
  if (!Number.isFinite(tolerance) || tolerance <= 0) return;
  for (let firstIndex = 0; firstIndex < polygons.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < polygons.length; secondIndex += 1) {
      const first = polygons[firstIndex];
      const second = polygons[secondIndex];
      first.forEach((point) => {
        let closest = null;
        let closestDistance = tolerance;
        for (let index = 0; index < second.length; index += 1) {
          const candidate = closestPointOnSegment(point, second[index], second[(index + 1) % second.length]);
          const distance = dist(point, candidate);
          if (distance <= closestDistance) {
            closest = candidate;
            closestDistance = distance;
          }
        }
        if (closest) {
          point.x = closest.x;
          point.y = closest.y;
        }
      });
      second.forEach((point) => {
        let closest = null;
        let closestDistance = tolerance;
        for (let index = 0; index < first.length; index += 1) {
          const candidate = closestPointOnSegment(point, first[index], first[(index + 1) % first.length]);
          const distance = dist(point, candidate);
          if (distance <= closestDistance) {
            closest = candidate;
            closestDistance = distance;
          }
        }
        if (closest) {
          point.x = closest.x;
          point.y = closest.y;
        }
      });
    }
  }
}

function drawGroupedTerrainOutlines(ctx, blockers, scale = 1) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.96)";
  ctx.lineWidth = 2 / scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  getFootprintBoundarySegments(blockers).forEach((segment) => {
    const groupId = String(blockers[segment.index]?.footprintGroupId || "");
    if (!groupId.startsWith("layout-group:")) return;
    ctx.beginPath();
    ctx.moveTo(segment.a.x, segment.a.y);
    ctx.lineTo(segment.b.x, segment.b.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawBattlefieldGrid(ctx, fit, scale = 1, boardWidth = BATTLEFIELD_WIDTH_INCHES, boardHeight = BATTLEFIELD_HEIGHT_INCHES) {
  if (!fit?.w || !fit?.h) return;
  const inch = fit.w / boardWidth;
  ctx.save();
  ctx.beginPath();
  ctx.rect(fit.x, fit.y, fit.w, fit.h);
  ctx.clip();

  for (let x = 0; x <= boardWidth; x++) {
    ctx.beginPath();
    ctx.moveTo(fit.x + x * inch, fit.y);
    ctx.lineTo(fit.x + x * inch, fit.y + fit.h);
    ctx.lineWidth = (x % 5 === 0 ? 1.25 : 0.65) / scale;
    ctx.strokeStyle = x % 5 === 0 ? "rgba(255,255,255,.34)" : "rgba(255,255,255,.14)";
    ctx.stroke();
  }
  for (let y = 0; y <= boardHeight; y++) {
    ctx.beginPath();
    ctx.moveTo(fit.x, fit.y + y * inch);
    ctx.lineTo(fit.x + fit.w, fit.y + y * inch);
    const distanceFromBottom = boardHeight - y;
    ctx.lineWidth = (distanceFromBottom % 5 === 0 ? 1.25 : 0.65) / scale;
    ctx.strokeStyle = distanceFromBottom % 5 === 0 ? "rgba(255,255,255,.34)" : "rgba(255,255,255,.14)";
    ctx.stroke();
  }

  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = "rgba(255,255,255,.72)";
  ctx.strokeRect(fit.x, fit.y, fit.w, fit.h);
  ctx.restore();
}

function drawTerrainOutlineHandles(ctx, points, scale = 1) {
  const radius = 5.5 / scale;
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.lineWidth = 2.5 / scale;
    ctx.strokeStyle = "#2563eb";
    ctx.stroke();
  });
}

function drawLayoutObjective(ctx, objective, pixelsPerInch, scale = 1) {
  const radius = Math.max(12 / scale, pixelsPerInch * 1.55);
  const color = objective.allegiance === "home"
    ? "#075985"
    : objective.allegiance === "enemy" ? "#991b1b" : "#0f766e";
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  if (objective.shape === "diamond") {
    ctx.moveTo(objective.x, objective.y - radius * 1.15);
    ctx.lineTo(objective.x + radius * 1.15, objective.y);
    ctx.lineTo(objective.x, objective.y + radius * 1.15);
    ctx.lineTo(objective.x - radius * 1.15, objective.y);
    ctx.closePath();
  } else {
    ctx.arc(objective.x, objective.y, radius, 0, Math.PI * 2);
  }
  ctx.fillStyle = objective.allegiance === "neutral" ? color : "rgba(255,255,255,.94)";
  ctx.fill();
  ctx.lineWidth = 4 / scale;
  ctx.strokeStyle = color;
  ctx.stroke();

  if (objective.allegiance !== "neutral") {
    const unit = radius * 0.24;
    ctx.fillStyle = color;
    ctx.fillRect(objective.x - unit * 2.1, objective.y - unit * 1.45, unit * 4.2, unit * 3.35);
    ctx.fillRect(objective.x - unit * 2.7, objective.y - unit * 2.2, unit * 1.25, unit * 1.4);
    ctx.fillRect(objective.x - unit * .62, objective.y - unit * 2.2, unit * 1.25, unit * 1.4);
    ctx.fillRect(objective.x + unit * 1.45, objective.y - unit * 2.2, unit * 1.25, unit * 1.4);
    ctx.fillStyle = "#fff";
    ctx.fillRect(objective.x - unit * .55, objective.y + unit * .2, unit * 1.1, unit * 1.7);
    ctx.restore();
    return;
  }

  const skullScale = radius * 0.72;
  const top = objective.y - skullScale * 0.72;
  ctx.beginPath();
  ctx.moveTo(objective.x, top);
  ctx.bezierCurveTo(
    objective.x + skullScale * 0.62, top,
    objective.x + skullScale * 0.72, objective.y - skullScale * 0.12,
    objective.x + skullScale * 0.56, objective.y + skullScale * 0.18,
  );
  ctx.lineTo(objective.x + skullScale * 0.43, objective.y + skullScale * 0.34);
  ctx.lineTo(objective.x + skullScale * 0.36, objective.y + skullScale * 0.66);
  ctx.lineTo(objective.x + skullScale * 0.18, objective.y + skullScale * 0.58);
  ctx.lineTo(objective.x, objective.y + skullScale * 0.70);
  ctx.lineTo(objective.x - skullScale * 0.18, objective.y + skullScale * 0.58);
  ctx.lineTo(objective.x - skullScale * 0.36, objective.y + skullScale * 0.66);
  ctx.lineTo(objective.x - skullScale * 0.43, objective.y + skullScale * 0.34);
  ctx.lineTo(objective.x - skullScale * 0.56, objective.y + skullScale * 0.18);
  ctx.bezierCurveTo(
    objective.x - skullScale * 0.72, objective.y - skullScale * 0.12,
    objective.x - skullScale * 0.62, top,
    objective.x, top,
  );
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(objective.x - skullScale * 0.27, objective.y - skullScale * 0.08, skullScale * 0.19, skullScale * 0.15, -0.18, 0, Math.PI * 2);
  ctx.ellipse(objective.x + skullScale * 0.27, objective.y - skullScale * 0.08, skullScale * 0.19, skullScale * 0.15, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(objective.x, objective.y + skullScale * 0.08);
  ctx.lineTo(objective.x - skullScale * 0.11, objective.y + skullScale * 0.28);
  ctx.lineTo(objective.x + skullScale * 0.11, objective.y + skullScale * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.5 / scale;
  ctx.strokeStyle = color;
  [-0.22, 0, 0.22].forEach((offset) => {
    ctx.beginPath();
    ctx.moveTo(objective.x + skullScale * offset, objective.y + skullScale * 0.43);
    ctx.lineTo(objective.x + skullScale * offset, objective.y + skullScale * 0.64);
    ctx.stroke();
  });
  ctx.restore();
}

function drawObjectiveVisibilityControls(ctx, buttons, visible, scale = 1) {
  ctx.save();
  buttons.forEach((button) => {
    const active = button.visible ? visible : !visible;
    const cx = button.x + button.size / 2;
    const cy = button.y + button.size / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, button.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = button.visible
      ? active ? "rgba(34,197,94,.95)" : "rgba(100,116,139,.95)"
      : active ? "rgba(239,68,68,.95)" : "rgba(100,116,139,.95)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${12 / scale}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(button.visible ? "◉" : "⊘", cx, cy);
  });
  ctx.restore();
}

function drawPoly(ctx, poly, fill, stroke, closed, scale = 1, showPoints = true) {
  if (!poly.length) return;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  if (closed) ctx.closePath();
  ctx.fillStyle = fill;
  if (closed) ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3 / scale;
  ctx.stroke();
  if (showPoints) poly.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 5 / scale, 0, Math.PI * 2); ctx.fillStyle = stroke; ctx.fill(); });
}

function drawDecorativeTerrainFeature(ctx, poly, kind, scale = 1) {
  if (!poly?.length) return;
  const dense = kind === "dense";
  drawPoly(
    ctx,
    poly,
    "rgba(0,0,0,0)",
    dense ? "rgba(22,163,74,.95)" : "rgba(202,138,4,.98)",
    true,
    scale,
    false,
  );
}

function drawLayoutWallFloorControls(ctx, buttons, activeFloorState, scale = 1) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${11 / scale}px system-ui`;
  buttons.forEach((button) => {
    const active = button.floorState === activeFloorState;
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 6 / scale);
    ctx.fillStyle = active ? "rgba(34,197,94,.96)" : "rgba(15,23,42,.94)";
    ctx.fill();
    ctx.lineWidth = 2 / scale;
    ctx.strokeStyle = active ? "#86efac" : "#cbd5e1";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
  });
  ctx.restore();
}
function drawLayoutTerrainRelationControls(ctx, buttons, sameFootprint, scale = 1) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${11 / scale}px system-ui`;
  buttons.forEach((button) => {
    const active = button.same === sameFootprint;
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 6 / scale);
    ctx.fillStyle = active ? "rgba(34,197,94,.96)" : "rgba(15,23,42,.94)";
    ctx.fill();
    ctx.lineWidth = 2 / scale;
    ctx.strokeStyle = active ? "#86efac" : "#cbd5e1";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
  });
  ctx.restore();
}
function strokePoly(ctx, poly, stroke, width) {
  if (!poly.length) return;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

function createZoneLayer(zones, W, H, fillStyle, reusableCanvas = null, renderScale = 1, reusableRenderCanvas = null) {
  const goodZones = zones.filter((poly) => poly?.length);
  if (!goodZones.length) return null;

  const mask = reusableCanvas || document.createElement("canvas");
  if (mask.width !== W) mask.width = W;
  if (mask.height !== H) mask.height = H;
  const m = mask.getContext("2d");
  m.globalCompositeOperation = "source-over";
  m.clearRect(0, 0, W, H);
  const scale = Math.max(0.4, Math.min(1, renderScale));
  const renderCanvas = scale === 1 ? mask : (reusableRenderCanvas || document.createElement("canvas"));
  if (scale !== 1) {
    m.globalCompositeOperation = "source-over";
    const renderWidth = Math.max(1, Math.round(W * scale));
    const renderHeight = Math.max(1, Math.round(H * scale));
    if (renderCanvas.width !== renderWidth) renderCanvas.width = renderWidth;
    if (renderCanvas.height !== renderHeight) renderCanvas.height = renderHeight;
  }
  const renderContext = renderCanvas.getContext("2d");
  renderContext.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
  renderContext.save();
  renderContext.scale(scale, scale);
  renderContext.globalCompositeOperation = "source-over";

  renderContext.fillStyle = "#fff";
  goodZones.forEach((poly) => {
    fillVisibilityZone(renderContext, poly);
  });

  renderContext.globalCompositeOperation = "source-in";
  renderContext.fillStyle = fillStyle;
  renderContext.fillRect(0, 0, W, H);
  renderContext.restore();

  if (scale !== 1) {
    m.imageSmoothingEnabled = true;
    m.imageSmoothingQuality = "high";
    m.drawImage(renderCanvas, 0, 0, renderCanvas.width, renderCanvas.height, 0, 0, W, H);
  }
  return mask;
}

function createCombinedLosLayers(clearZones, oneWallZones, W, H, renderScale = 1, buffers = null, blockers = []) {
  if (!clearZones.some((poly) => poly?.length) && !oneWallZones.some((poly) => poly?.length)) return null;
  const reusableBuffers = buffers || {};
  if (renderScale !== 1) {
    reusableBuffers.clearRender = reusableBuffers.clearRender || document.createElement("canvas");
    reusableBuffers.oneWallRender = reusableBuffers.oneWallRender || document.createElement("canvas");
  }
  let clearMask = createZoneLayer(
    clearZones,
    W,
    H,
    "#fff",
    reusableBuffers.clearMask,
    renderScale,
    reusableBuffers.clearRender,
  );
  if (clearMask) reusableBuffers.clearMask = clearMask;
  let oneWallMask = createZoneLayer(
    oneWallZones,
    W,
    H,
    "#fff",
    reusableBuffers.oneWallMask,
    renderScale,
    reusableBuffers.oneWallRender,
  );
  if (oneWallMask) reusableBuffers.oneWallMask = oneWallMask;
  const cleanupRadius = 1;
  if (renderScale !== 1 && clearMask) {
    const cleaned = cleanThinMaskArtifacts(
      clearMask,
      W,
      H,
      cleanupRadius,
      reusableBuffers.clearCleanupA,
      reusableBuffers.clearCleanupB,
    );
    reusableBuffers.clearCleanupA = cleaned.work;
    reusableBuffers.clearCleanupB = cleaned.output;
    clearMask = cleaned.output;
  }
  if (renderScale !== 1 && oneWallMask) {
    const cleaned = cleanThinMaskArtifacts(
      oneWallMask,
      W,
      H,
      cleanupRadius,
      reusableBuffers.oneWallCleanupA,
      reusableBuffers.oneWallCleanupB,
    );
    reusableBuffers.oneWallCleanupA = cleaned.work;
    reusableBuffers.oneWallCleanupB = cleaned.output;
    oneWallMask = cleaned.output;
  }
  if (oneWallMask && clearMask) {
    const context = oneWallMask.getContext("2d");
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.drawImage(clearMask, 0, 0);
    context.restore();
  }

  return {
    clear: null,
    oneWall: null,
    clearMask,
    oneWallMask,
  };
}

function getCompositedLosRender(renderLayers, W, H, buffers, revision, blockers = []) {
  if (buffers.revision === revision && buffers.width === W && buffers.height === H) {
    return buffers.render || { clear: null, oneWall: null };
  }

  const layers = renderLayers.filter((layer) => layer?.clearMask || layer?.oneWallMask);
  if (!layers.length) {
    buffers.revision = revision;
    buffers.width = W;
    buffers.height = H;
    buffers.render = { clear: null, oneWall: null };
    return buffers.render;
  }

  const prepareMask = (existing) => {
    const canvas = existing || document.createElement("canvas");
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const context = canvas.getContext("2d");
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, W, H);
    return { canvas, context };
  };

  const clear = prepareMask(buffers.clearMask);
  const oneWall = prepareMask(buffers.oneWallMask);
  buffers.clearMask = clear.canvas;
  buffers.oneWallMask = oneWall.canvas;

  layers.forEach((layer) => {
    if (layer.clearMask) clear.context.drawImage(layer.clearMask, 0, 0);
    if (layer.oneWallMask) oneWall.context.drawImage(layer.oneWallMask, 0, 0);
  });

  const footprint = prepareMask(buffers.footprintMask);
  buffers.footprintMask = footprint.canvas;
  footprint.context.fillStyle = "#fff";
  blockers.forEach((polygon) => {
    if (!polygon?.length) return;
    footprint.context.beginPath();
    footprint.context.moveTo(polygon[0].x, polygon[0].y);
    for (let index = 1; index < polygon.length; index += 1) {
      footprint.context.lineTo(polygon[index].x, polygon[index].y);
    }
    footprint.context.closePath();
    footprint.context.fill();
  });

  clear.context.save();
  clear.context.globalCompositeOperation = "destination-out";
  clear.context.drawImage(footprint.canvas, 0, 0);
  clear.context.restore();

  oneWall.context.save();
  oneWall.context.globalCompositeOperation = "destination-in";
  oneWall.context.drawImage(footprint.canvas, 0, 0);
  oneWall.context.restore();

  oneWall.context.save();
  oneWall.context.globalCompositeOperation = "destination-out";
  oneWall.context.drawImage(clear.canvas, 0, 0);
  oneWall.context.restore();

  buffers.clearColour = colorizeLosMask(clear.canvas, W, H, "rgba(255,255,255,.20)", buffers.clearColour);
  buffers.oneWallColour = colorizeLosMask(oneWall.canvas, W, H, "rgba(245,190,55,.20)", buffers.oneWallColour);
  buffers.revision = revision;
  buffers.width = W;
  buffers.height = H;
  buffers.render = { clear: buffers.clearColour, oneWall: buffers.oneWallColour };
  return buffers.render;
}

function cleanThinMaskArtifacts(mask, W, H, radius, reusableWork = null, reusableOutput = null) {
  const work = reusableWork || document.createElement("canvas");
  const output = reusableOutput || document.createElement("canvas");
  if (work.width !== W) work.width = W;
  if (work.height !== H) work.height = H;
  if (output.width !== W) output.width = W;
  if (output.height !== H) output.height = H;

  const workContext = work.getContext("2d");
  workContext.globalCompositeOperation = "source-over";
  workContext.clearRect(0, 0, W, H);
  workContext.drawImage(mask, 0, 0);
  workContext.globalCompositeOperation = "destination-in";
  const offsets = [
    [-radius, 0], [radius, 0], [0, -radius], [0, radius],
    [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius],
  ];
  offsets.forEach(([x, y]) => workContext.drawImage(mask, x, y));

  const outputContext = output.getContext("2d");
  outputContext.globalCompositeOperation = "source-over";
  outputContext.clearRect(0, 0, W, H);
  outputContext.drawImage(work, 0, 0);
  offsets.forEach(([x, y]) => outputContext.drawImage(work, x, y));
  return { work, output };
}

function colorizeLosMask(mask, W, H, fillStyle, reusableCanvas = null) {
  if (!mask) return null;
  const layer = reusableCanvas || document.createElement("canvas");
  if (layer.width !== W) layer.width = W;
  if (layer.height !== H) layer.height = H;
  const context = layer.getContext("2d");
  context.globalCompositeOperation = "source-over";
  context.clearRect(0, 0, W, H);
  context.drawImage(mask, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = fillStyle;
  context.fillRect(0, 0, W, H);
  context.globalCompositeOperation = "source-over";
  return layer;
}

function visibilityZoneTriangles(poly) {
  const source = poly.source;
  if (!source || poly.length < 3) return [poly];
  const triangles = [];
  for (let index = 0; index < poly.length; index += 1) {
    const first = poly[index];
    const second = poly[(index + 1) % poly.length];
    const firstRadius = dist(source, first);
    const secondRadius = dist(source, second);
    const minimumRadius = Math.max(1, Math.min(firstRadius, secondRadius));
    const radiusRatio = Math.max(firstRadius, secondRadius) / minimumRadius;
    const angularGap = Math.abs(normalizeAngle(second.angle - first.angle));
    if (radiusRatio > 2.2 && angularGap < 0.006) continue;
    triangles.push([source, first, second]);
  }
  return triangles;
}

function clipOutsidePolygons(ctx, polygons, W, H) {
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  polygons.forEach((polygon) => {
    if (!polygon?.length) return;
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let index = 1; index < polygon.length; index += 1) ctx.lineTo(polygon[index].x, polygon[index].y);
    ctx.closePath();
  });
  ctx.clip("evenodd");
}

function fillVisibilityZone(ctx, poly) {
  const source = poly.source;
  if (!source || poly.length < 3) {
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let index = 1; index < poly.length; index += 1) ctx.lineTo(poly[index].x, poly[index].y);
    ctx.closePath();
    ctx.fill();
    return;
  }

  for (let index = 0; index < poly.length; index += 1) {
    const first = poly[index];
    const second = poly[(index + 1) % poly.length];
    const firstRadius = dist(source, first);
    const secondRadius = dist(source, second);
    const minimumRadius = Math.max(1, Math.min(firstRadius, secondRadius));
    const radiusRatio = Math.max(firstRadius, secondRadius) / minimumRadius;
    const angularGap = Math.abs(normalizeAngle(second.angle - first.angle));
    // Adjacent rays at an occluder corner can jump from the near edge to a far
    // boundary. Connecting that discontinuity creates a false triangular wedge.
    if (radiusRatio > 2.2 && angularGap < 0.006) continue;
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(first.x, first.y);
    ctx.lineTo(second.x, second.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDeploymentZoneMask(ctx, zones, W, H, path, rangeRadius, towardSide, fillStyle) {
  const goodZones = zones.filter((poly) => poly?.length);
  if (!goodZones.length || !Array.isArray(path) || path.length < 2 || !towardSide) return;

  const mask = document.createElement("canvas");
  mask.width = W;
  mask.height = H;
  const m = mask.getContext("2d");
  m.fillStyle = "#fff";
  goodZones.forEach((poly) => {
    m.beginPath();
    m.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) m.lineTo(poly[i].x, poly[i].y);
    m.closePath();
    m.fill();
  });

  m.globalCompositeOperation = "destination-in";
  const allowed = document.createElement("canvas");
  allowed.width = W;
  allowed.height = H;
  const a = allowed.getContext("2d");
  a.fillStyle = "#fff";
  fillDeploymentUnlimitedSide(a, path, towardSide, W, H, rangeRadius);
  m.drawImage(allowed, 0, 0);

  m.globalCompositeOperation = "source-in";
  m.fillStyle = fillStyle;
  m.fillRect(0, 0, W, H);
  ctx.drawImage(mask, 0, 0);
}

function drawDeploymentAreaWash(ctx, path, noMansSide, W, H, fit, blockers, fillStyle) {
  if (!Array.isArray(path) || path.length < 2 || !noMansSide) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(fit.x, fit.y, fit.w, fit.h);
  blockers.forEach((poly) => {
    if (!poly?.length) return;
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let index = 1; index < poly.length; index += 1) ctx.lineTo(poly[index].x, poly[index].y);
    ctx.closePath();
  });
  ctx.clip("evenodd");
  ctx.fillStyle = fillStyle;
  fillDeploymentUnlimitedSide(ctx, path, -noMansSide, W, H, Infinity);
  ctx.restore();
}

function pathMidpointAndTangent(path) {
  const segments = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length <= 0.001) continue;
    segments.push({ a, b, length, start: totalLength });
    totalLength += length;
  }

  if (!segments.length) {
    const point = path[0] || { x: 0, y: 0 };
    return { point, tangent: { x: 1, y: 0 } };
  }

  const halfway = totalLength / 2;
  const segment = segments.find((item) => halfway <= item.start + item.length) || segments[segments.length - 1];
  const t = Math.max(0, Math.min(1, (halfway - segment.start) / segment.length));
  return {
    point: {
      x: segment.a.x + (segment.b.x - segment.a.x) * t,
      y: segment.a.y + (segment.b.y - segment.a.y) * t,
    },
    tangent: {
      x: (segment.b.x - segment.a.x) / segment.length,
      y: (segment.b.y - segment.a.y) / segment.length,
    },
  };
}

function fillDeploymentUnlimitedSide(ctx, path, side, W, H, rangeRadius = Infinity) {
  const cleanPath = path.filter((point, index) => index === 0 || dist(point, path[index - 1]) > 0.001);
  if (cleanPath.length < 2) return;

  const farDistance = Math.max(W, H) * 4;
  const depth = Number.isFinite(rangeRadius) ? Math.max(0, rangeRadius) : farDistance;
  if (depth <= 0) return;

  const extendedPath = cleanPath.map((point) => ({ ...point }));
  const first = extendedPath[0];
  const second = extendedPath[1];
  const last = extendedPath[extendedPath.length - 1];
  const penultimate = extendedPath[extendedPath.length - 2];
  const firstLength = Math.max(dist(first, second), 0.001);
  const lastLength = Math.max(dist(penultimate, last), 0.001);
  first.x -= ((second.x - first.x) / firstLength) * farDistance;
  first.y -= ((second.y - first.y) / firstLength) * farDistance;
  last.x += ((last.x - penultimate.x) / lastLength) * farDistance;
  last.y += ((last.y - penultimate.y) / lastLength) * farDistance;

  const segmentNormals = [];
  for (let index = 0; index < extendedPath.length - 1; index += 1) {
    const start = extendedPath[index];
    const end = extendedPath[index + 1];
    const length = Math.max(dist(start, end), 0.001);
    segmentNormals.push({
      x: -((end.y - start.y) / length) * side,
      y: ((end.x - start.x) / length) * side,
    });
  }

  const offsetPath = extendedPath.map((point, index) => {
    if (index === 0) {
      const normal = segmentNormals[0];
      return { x: point.x + normal.x * depth, y: point.y + normal.y * depth };
    }
    if (index === extendedPath.length - 1) {
      const normal = segmentNormals[segmentNormals.length - 1];
      return { x: point.x + normal.x * depth, y: point.y + normal.y * depth };
    }

    const previousNormal = segmentNormals[index - 1];
    const nextNormal = segmentNormals[index];
    const sum = { x: previousNormal.x + nextNormal.x, y: previousNormal.y + nextNormal.y };
    const sumLength = Math.hypot(sum.x, sum.y);
    if (sumLength <= 0.001) {
      return { x: point.x + nextNormal.x * depth, y: point.y + nextNormal.y * depth };
    }
    const miter = { x: sum.x / sumLength, y: sum.y / sumLength };
    const denominator = Math.max(0.25, miter.x * nextNormal.x + miter.y * nextNormal.y);
    const miterDepth = Math.min(depth / denominator, depth * 4);
    return { x: point.x + miter.x * miterDepth, y: point.y + miter.y * miterDepth };
  });

  ctx.beginPath();
  ctx.moveTo(extendedPath[0].x, extendedPath[0].y);
  for (let index = 1; index < extendedPath.length; index += 1) {
    ctx.lineTo(extendedPath[index].x, extendedPath[index].y);
  }
  for (let index = offsetPath.length - 1; index >= 0; index -= 1) {
    ctx.lineTo(offsetPath[index].x, offsetPath[index].y);
  }
  ctx.closePath();
  ctx.fill();
}

function deploymentSideArrowPositions(path, scale = 1) {
  const mid = pathMidpointAndTangent(path);
  const offset = 58 / scale;
  const leftNormal = { x: -mid.tangent.y, y: mid.tangent.x };
  return [
    { side: 1, point: { x: mid.point.x + leftNormal.x * offset, y: mid.point.y + leftNormal.y * offset }, normal: leftNormal },
    { side: -1, point: { x: mid.point.x - leftNormal.x * offset, y: mid.point.y - leftNormal.y * offset }, normal: { x: -leftNormal.x, y: -leftNormal.y } },
  ];
}

function drawDeploymentSideArrows(ctx, path, scale = 1) {
  ctx.save();
  deploymentSideArrowPositions(path, scale).forEach(({ point, normal }) => {
    const tip = { x: point.x + normal.x * 25 / scale, y: point.y + normal.y * 25 / scale };
    const base = { x: point.x - normal.x * 19 / scale, y: point.y - normal.y * 19 / scale };
    const side = { x: -normal.y * 20 / scale, y: normal.x * 20 / scale };
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(base.x + side.x, base.y + side.y);
    ctx.lineTo(base.x - side.x, base.y - side.y);
    ctx.closePath();
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3 / scale;
    ctx.stroke();
  });
  const mid = pathMidpointAndTangent(path).point;
  drawMapCaption(ctx, "WHICH SIDE IS NO MAN'S LAND?", mid.x, mid.y - 58 / scale, scale);
  ctx.restore();
}

function drawDeepstrikeOverlay(ctx, exclusions, rangeRadius, W, H) {
  const mask = document.createElement("canvas");
  mask.width = W;
  mask.height = H;
  const m = mask.getContext("2d");

  m.fillStyle = "rgba(222,145,25,.40)";
  m.fillRect(0, 0, W, H);
  m.globalCompositeOperation = "destination-out";

  exclusions.forEach(({ x, y, rx, ry, rotation }) => {
    m.beginPath();
    m.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    m.fill();

    const samples = 72;
    for (let i = 0; i < samples; i++) {
      const angle = (Math.PI * 2 * i) / samples;
      const local = rotatePoint(Math.cos(angle) * rx, Math.sin(angle) * ry, rotation);
      m.beginPath();
      m.arc(x + local.x, y + local.y, rangeRadius, 0, Math.PI * 2);
      m.fill();
    }
  });

  ctx.drawImage(mask, 0, 0);
}

function drawMultiRangeZoneMask(ctx, zones, W, H, markers, rangeRadius, fillStyle) {
  const goodZones = zones.filter((poly) => poly?.length);
  if (!goodZones.length || !markers.length || !Number.isFinite(rangeRadius)) return;

  const mask = document.createElement("canvas");
  mask.width = W;
  mask.height = H;
  const m = mask.getContext("2d");

  m.fillStyle = "#fff";
  goodZones.forEach((poly) => {
    m.beginPath();
    m.moveTo(poly[0].x, poly[0].y);
    for (let index = 1; index < poly.length; index++) m.lineTo(poly[index].x, poly[index].y);
    m.closePath();
    m.fill();
  });

  m.globalCompositeOperation = "destination-in";
  m.beginPath();
  markers.forEach((marker) => {
    m.moveTo(marker.x + rangeRadius, marker.y);
    m.arc(marker.x, marker.y, rangeRadius, 0, Math.PI * 2);
  });
  m.fill();

  m.globalCompositeOperation = "source-in";
  m.fillStyle = fillStyle;
  m.fillRect(0, 0, W, H);
  ctx.drawImage(mask, 0, 0);
}

function clipPoly(ctx, poly) {
  if (!poly.length) return;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.clip();
}
function drawMeasurementLine(ctx, a, b, label, scale = 1) {
  ctx.save();
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = "rgba(34,197,94,.95)";
  ctx.fillStyle = "rgba(34,197,94,.95)";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(a.x, a.y, 5 / scale, 0, Math.PI * 2);
  ctx.arc(b.x, b.y, 5 / scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `${14 / scale}px system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, (a.x + b.x) / 2 + 8 / scale, (a.y + b.y) / 2 - 8 / scale);
  ctx.restore();
}

function deploymentLabelWorldPoint(boardPosition, fit, boardWidth = BATTLEFIELD_WIDTH_INCHES, boardHeight = BATTLEFIELD_HEIGHT_INCHES) {
  if (!fit || !Number.isFinite(boardPosition?.x) || !Number.isFinite(boardPosition?.y)) return null;
  return {
    x: fit.x + (boardPosition.x / boardWidth) * fit.w,
    y: fit.y + (boardPosition.y / boardHeight) * fit.h,
  };
}

function deploymentLineCaptionRect(ctx, label, path, fit, scale = 1, boardPosition = null, boardWidth = BATTLEFIELD_WIDTH_INCHES, boardHeight = BATTLEFIELD_HEIGHT_INCHES) {
  if (!fit || !path?.length) return null;
  const customPoint = deploymentLabelWorldPoint(boardPosition, fit, boardWidth, boardHeight);
  let midpoint = customPoint || path[0];
  let isVertical = false;
  let edge = midpoint.x <= fit.x + fit.w / 2 ? "left" : "right";
  if (!customPoint) {
    const segments = [];
    let totalLength = 0;
    for (let index = 0; index < path.length - 1; index += 1) {
      const a = path[index];
      const b = path[index + 1];
      const length = dist(a, b);
      segments.push({ a, b, length });
      totalLength += length;
    }
    let remaining = totalLength / 2;
    for (const segment of segments) {
      if (remaining <= segment.length || segment === segments[segments.length - 1]) {
        const ratio = segment.length ? Math.min(1, remaining / segment.length) : 0;
        midpoint = {
          x: segment.a.x + (segment.b.x - segment.a.x) * ratio,
          y: segment.a.y + (segment.b.y - segment.a.y) * ratio,
        };
        break;
      }
      remaining -= segment.length;
    }
    const minX = Math.min(...path.map((point) => point.x));
    const maxX = Math.max(...path.map((point) => point.x));
    const minY = Math.min(...path.map((point) => point.y));
    const maxY = Math.max(...path.map((point) => point.y));
    isVertical = maxY - minY > maxX - minX;
    edge = Math.abs(midpoint.x - fit.x) <= Math.abs(midpoint.x - (fit.x + fit.w)) ? "left" : "right";
  }
  const inch = fit.w / boardWidth;
  const width = 4 * inch;
  const height = 1 * inch;
  const gap = 6 / scale;
  const x = customPoint
    ? midpoint.x - width / 2
    : isVertical
      ? edge === "left" ? fit.x - gap - width : fit.x + fit.w + gap
      : midpoint.x - width / 2;
  const y = customPoint
    ? midpoint.y - height / 2
    : isVertical ? midpoint.y - height / 2 : fit.y - gap - height;
  return { x, y, width, height };
}

function drawDeploymentPath(ctx, path, scale = 1, visible = true, preview = false, kind = "home", fit = null, labelPosition = null) {
  if (!Array.isArray(path) || path.length < 2) return;
  const activeColor = kind === "enemy" ? "rgb(153,20,23)" : "#38bdf8";
  const previewColor = kind === "enemy" ? "rgba(153,20,23,.70)" : "rgba(125,211,252,.7)";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.lineWidth = (preview ? 3.5 : 2.25) / scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = preview ? previewColor : activeColor;
  if (preview) ctx.setLineDash([6 / scale, 4 / scale]);
  ctx.stroke();

  if (!preview) drawDeploymentLineCaption(ctx, kind === "enemy" ? "Enemy deploy line" : "Home deploy line", path, fit, scale, labelPosition);
  ctx.restore();
}

function drawDeploymentLine(ctx, line, scale = 1, visible = true, preview = false, kind = "home", fit = null, labelPosition = null) {
  if (!line?.a || !line?.b) return;
  const activeColor = kind === "enemy" ? "rgb(153,20,23)" : "#38bdf8";
  const previewColor = kind === "enemy" ? "rgba(153,20,23,.70)" : "rgba(125,211,252,.7)";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(line.a.x, line.a.y);
  ctx.lineTo(line.b.x, line.b.y);
  ctx.lineWidth = (preview ? 3.5 : 2.25) / scale;
  ctx.lineCap = "round";
  ctx.strokeStyle = preview ? previewColor : activeColor;
  if (preview) ctx.setLineDash([6 / scale, 4 / scale]);
  ctx.stroke();
  if (!preview) drawDeploymentLineCaption(ctx, kind === "enemy" ? "Enemy deploy line" : "Home deploy line", [line.a, line.b], fit, scale, labelPosition);
  ctx.restore();
}

function drawDeploymentLineCaption(ctx, label, path, fit, scale = 1, labelPosition = null) {
  const rect = deploymentLineCaptionRect(ctx, label, path, fit, scale, labelPosition);
  if (!rect) return;
  ctx.fillStyle = "rgba(15,23,42,.88)";
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 4 / scale, true, false);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let fontSize = rect.height * 0.48;
  ctx.font = `bold ${fontSize}px system-ui`;
  const maxTextWidth = rect.width - 6 / scale;
  const measuredWidth = ctx.measureText(label).width;
  if (measuredWidth > maxTextWidth) {
    fontSize *= maxTextWidth / measuredWidth;
    ctx.font = `bold ${fontSize}px system-ui`;
  }
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function samplePathPoints(path, perSegment = 8) {
  if (!Array.isArray(path) || path.length < 2) return [];
  const points = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const segmentPoints = sampleLinePoints(a, b, perSegment);
    segmentPoints.forEach((p, idx) => {
      if (i > 0 && idx === 0) return;
      points.push(p);
    });
  }
  return points;
}

function sampleLinePoints(a, b, count = 24) {
  if (!a || !b) return [];
  const points = [];
  const n = Math.max(2, count);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return points;
}

function drawWall(ctx, wall, scale = 1, preview = false) {
  if (!wall?.a || !wall?.b) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wall.a.x, wall.a.y);
  ctx.lineTo(wall.b.x, wall.b.y);

  ctx.strokeStyle = preview
    ? "rgba(196,181,253,.65)"
    : "#a855f7";

  ctx.lineWidth = 7 / scale;
  ctx.lineCap = "round";

  ctx.stroke();
  ctx.restore();
}

function drawMovementBaseGhost(ctx, marker, base, scale = 1) {
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  if (marker.baseShape === "rectangle") {
    ctx.translate(marker.x, marker.y);
    ctx.rotate(marker.baseRotation || 0);
    ctx.rect(-base.rx, -base.ry, base.rx * 2, base.ry * 2);
  } else {
    ctx.ellipse(marker.x, marker.y, base.rx, base.ry, marker.baseRotation || 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 3 / scale;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function movementEdgePoint(marker, base, dx, dy) {
  const length = Math.hypot(dx, dy);
  if (!length) return { x: marker.x, y: marker.y };
  if (marker.baseShape === "rectangle") {
    const local = rotatePoint(dx / length, dy / length, -(marker.baseRotation || 0));
    const tx = Math.abs(local.x) > 0 ? base.rx / Math.abs(local.x) : Infinity;
    const ty = Math.abs(local.y) > 0 ? base.ry / Math.abs(local.y) : Infinity;
    const t = Math.min(tx, ty);
    const rotated = rotatePoint(local.x * t, local.y * t, marker.baseRotation || 0);
    return { x: marker.x + rotated.x, y: marker.y + rotated.y };
  }
  const radius = ellipseRadiusInDirection({ rx: base.rx, ry: base.ry, rotation: marker.baseRotation || 0 }, dx, dy);
  return { x: marker.x + (dx / length) * radius, y: marker.y + (dy / length) * radius };
}

function drawMovementArrow(ctx, from, to, fromBase, toBase, scale = 1, pixelsPerInch = null) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const a = movementEdgePoint(from, fromBase, dx, dy);
  const b = movementEdgePoint(to, toBase, -dx, -dy);
  const arrowLength = Math.hypot(b.x - a.x, b.y - a.y);
  if (arrowLength < 4 / scale) return;
  const ux = (b.x - a.x) / arrowLength;
  const uy = (b.y - a.y) / arrowLength;
  ctx.save();
  ctx.strokeStyle = "rgba(222,145,25,.95)";
  ctx.fillStyle = "rgba(222,145,25,.95)";
  ctx.lineWidth = 2.5 / scale;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  const head = 9 / scale;
  const angle = Math.atan2(uy, ux);
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - Math.cos(angle - Math.PI / 6) * head, b.y - Math.sin(angle - Math.PI / 6) * head);
  ctx.lineTo(b.x - Math.cos(angle + Math.PI / 6) * head, b.y - Math.sin(angle + Math.PI / 6) * head);
  ctx.closePath();
  ctx.fill();
  if (pixelsPerInch) {
    const inches = arrowLength / pixelsPerInch;
    drawMapCaption(ctx, `${inches.toFixed(1)}"`, (a.x + b.x) / 2, (a.y + b.y) / 2, scale);
  }
  ctx.restore();
}

function drawEnemy(ctx, enemy, state, inRange, rangeActive, number, scale = 1, rangeCount = 0, pixelsPerInch = null) {
  const r = enemyBaseRadius(pixelsPerInch);
  const visible = state === "clear";
  const oneWall = state === "oneWall";
  const blocked = state === "blocked";

  ctx.save();
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);

  if (blocked) {
    ctx.fillStyle = "#8b8b8b";
    ctx.fill();
  } else if (!rangeActive) {
    ctx.fillStyle = visible ? "#ef4444" : "#f5c542";
    ctx.fill();
  } else if (inRange && visible) {
    ctx.fillStyle = "#22c55e";
    ctx.fill();
  } else if (inRange && oneWall) {
    ctx.fillStyle = "#22c55e";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#f5c542";
    ctx.fill();
  } else {
    ctx.fillStyle = visible ? "#ef4444" : "#f5c542";
    ctx.fill();
  }

  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = blocked ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.95)";
  ctx.stroke();
  ctx.fillStyle = blocked ? "#222" : "#fff";
  ctx.font = `bold ${Math.max(8, 10 / scale)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), enemy.x, enemy.y);

  if (rangeCount > 0) {
    const badgeRadius = 8 / scale;
    const badgeX = enemy.x + r * 0.82;
    const badgeY = enemy.y + r * 0.82;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();
    ctx.lineWidth = 2 / scale;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(8, 9 / scale)}px system-ui`;
    ctx.fillText(String(rangeCount), badgeX, badgeY);
  }
  ctx.restore();
}

function drawConfirmedEnemyLosRays(ctx, rays, scale = 1) {
  const visibleRays = (rays || []).filter((ray) => (
    ray?.a && ray?.b && (ray.state === "clear" || ray.state === "oneWall")
  ));
  if (!visibleRays.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  visibleRays.forEach((ray) => {
    ctx.beginPath();
    ctx.moveTo(ray.a.x, ray.a.y);
    ctx.lineTo(ray.b.x, ray.b.y);
    ctx.strokeStyle = ray.state === "clear" ? "rgba(239,68,68,0.58)" : "rgba(250,204,21,0.62)";
    ctx.lineWidth = Math.max(1, 1.25 / scale);
    ctx.setLineDash(ray.state === "oneWall" ? [6 / scale, 4 / scale] : []);
    ctx.stroke();
  });
  ctx.restore();
}

function drawMarkerRangeTick(ctx, marker, base, scale = 1) {
  const x = marker.x + base.rx * 0.72;
  const y = marker.y - base.ry * 0.72;
  const radius = 8 / scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#22c55e";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5 / scale;
  ctx.stroke();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.2 / scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 4 / scale, y);
  ctx.lineTo(x - 1 / scale, y + 3 / scale);
  ctx.lineTo(x + 5 / scale, y - 4 / scale);
  ctx.stroke();
  ctx.restore();
}

function drawRulerLine(ctx, a, b, pixelsPerInch, scale = 1, preview = false) {
  if (!a || !b || !pixelsPerInch) return;
  const label = `${(dist(a, b) / pixelsPerInch).toFixed(1)}"`;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;

  ctx.save();
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = preview ? "rgba(0,0,0,.65)" : "#000";
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  for (const point of [a, b]) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = `bold ${14 / scale}px system-ui`;
  const padding = 5 / scale;
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(255,255,255,.88)";
  roundRect(ctx, midX - textWidth / 2 - padding, midY - 11 / scale, textWidth + padding * 2, 22 / scale, 5 / scale, true, false);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, midX, midY);
  ctx.restore();
}

function drawStickyRulerLine(ctx, a, b, pixelsPerInch, scale = 1) {
  if (!a || !b || !pixelsPerInch) return;
  const label = `${(dist(a, b) / pixelsPerInch).toFixed(1)}"`;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const color = "rgb(222,145,25)";

  ctx.save();
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  for (const point of [a, b]) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = `bold ${14 / scale}px system-ui`;
  const padding = 5 / scale;
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(255,255,255,.88)";
  roundRect(ctx, midX - textWidth / 2 - padding, midY - 11 / scale, textWidth + padding * 2, 22 / scale, 5 / scale, true, false);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, midX, midY);
  ctx.restore();
}

function ellipseRadiusInDirection(ellipse, dx, dy) {
  const length = Math.hypot(dx, dy);
  if (!length) return 0;
  const unit = rotatePoint(dx / length, dy / length, -(ellipse.rotation || 0));
  const denominator = Math.sqrt((unit.x * unit.x) / (ellipse.rx * ellipse.rx) + (unit.y * unit.y) / (ellipse.ry * ellipse.ry));
  return denominator ? 1 / denominator : 0;
}

function closestEllipseEdgePoints(from, to) {
  const dx = to.center.x - from.center.x;
  const dy = to.center.y - from.center.y;
  const centerDistance = Math.hypot(dx, dy);
  if (!centerDistance) {
    const point = { x: from.center.x, y: from.center.y };
    return { a: point, b: point };
  }
  const ux = dx / centerDistance;
  const uy = dy / centerDistance;
  const fromRadius = ellipseRadiusInDirection(from, ux, uy);
  const toRadius = ellipseRadiusInDirection(to, -ux, -uy);
  if (centerDistance <= fromRadius + toRadius) {
    const point = { x: from.center.x + ux * Math.min(fromRadius, centerDistance / 2), y: from.center.y + uy * Math.min(fromRadius, centerDistance / 2) };
    return { a: point, b: point };
  }
  return {
    a: { x: from.center.x + ux * fromRadius, y: from.center.y + uy * fromRadius },
    b: { x: to.center.x - ux * toRadius, y: to.center.y - uy * toRadius },
  };
}

function closestUnitStickyGeometry(unitMembers, target, unitFirst = true) {
  let closest = null;
  let closestDistance = Infinity;
  unitMembers.forEach((member) => {
    let geometry;
    if (target.segments) {
      geometry = closestSegmentsToEllipsePoints(target.segments, member, !unitFirst);
    } else if (target.poly) {
      geometry = closestPolygonToEllipsePoints(target.poly, member, !unitFirst);
    } else {
      geometry = unitFirst
        ? closestEllipseEdgePoints(member, target)
        : closestEllipseEdgePoints(target, member);
    }
    const distance = dist(geometry.a, geometry.b);
    if (distance < closestDistance) {
      closest = geometry;
      closestDistance = distance;
    }
  });
  return closest;
}

function drawMapCaption(ctx, label, x, y, scale = 1) {
  const fontSize = 10 / scale;
  ctx.font = `bold ${fontSize}px system-ui`;
  const width = ctx.measureText(label).width + 10 / scale;
  const height = fontSize + 6 / scale;
  ctx.fillStyle = "rgba(15,23,42,.88)";
  roundRect(ctx, x - width / 2, y - height / 2, width, height, 4 / scale, true, false);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
}

function drawLosMarkerLabel(ctx, marker, base, scale = 1, forceCaptionBelow = false) {
  const label = String(marker.name || "LOS").trim() || "LOS";
  const maxFontSize = 11;
  const minimumReadableFontSize = 10 / scale;
  const shortestRadius = Math.min(base.rx, base.ry);
  const availableWidth = Math.max(1, shortestRadius * 1.65);
  const availableHeight = Math.max(1, shortestRadius * 1.2);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${maxFontSize}px system-ui`;

  const measuredWidth = Math.max(1, ctx.measureText(label).width);
  const fittedFontSize = Math.min(maxFontSize, maxFontSize * availableWidth / measuredWidth, availableHeight);

  if (!forceCaptionBelow && fittedFontSize >= minimumReadableFontSize) {
    ctx.fillStyle = "#111";
    ctx.font = `bold ${fittedFontSize}px system-ui`;
    ctx.fillText(label, marker.x, marker.y);
    ctx.restore();
    return;
  }

  const captionFontSize = 10 / scale;
  const captionY = marker.y + base.ry + 10 / scale;
  ctx.font = `bold ${captionFontSize}px system-ui`;
  const captionWidth = ctx.measureText(label).width + 10 / scale;
  const captionHeight = captionFontSize + 6 / scale;
  ctx.fillStyle = "rgba(15,23,42,.88)";
  roundRect(
    ctx,
    marker.x - captionWidth / 2,
    captionY - captionHeight / 2,
    captionWidth,
    captionHeight,
    4 / scale,
    true
  );
  ctx.fillStyle = "#fff";
  ctx.fillText(label, marker.x, captionY);
  ctx.restore();
}

function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointNearSegment(p, a, b, threshold) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 === 0) return dist(p, a) <= threshold;
  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / len2));
  const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return dist(p, closest) <= threshold;
}

function pointNearPath(p, path, threshold) {
  if (!Array.isArray(path) || path.length < 2) return false;
  for (let i = 0; i < path.length - 1; i++) {
    if (pointNearSegment(p, path[i], path[i + 1], threshold)) return true;
  }
  return false;
}

function closestPointOnSegment(p, a, b) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const lengthSquared = ab.x * ab.x + ab.y * ab.y;
  if (!lengthSquared) return { ...a };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / lengthSquared));
  return { x: a.x + ab.x * t, y: a.y + ab.y * t };
}

function closestPointOnPolygon(p, poly) {
  let closest = poly[0];
  let closestDistance = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const candidate = closestPointOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
    const distance = dist(p, candidate);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest;
}

function closestPointOnSegments(p, segments) {
  let closest = segments[0]?.a || p;
  let closestDistance = Infinity;
  segments.forEach((segment) => {
    const candidate = closestPointOnSegment(p, segment.a, segment.b);
    const distance = dist(p, candidate);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  });
  return closest;
}

function pointNearPolygon(p, poly, threshold) {
  return dist(p, closestPointOnPolygon(p, poly)) <= threshold;
}

function closestSegmentsToEllipsePoints(segments, ellipse, segmentsFirst = false) {
  const segmentPoint = closestPointOnSegments(ellipse.center, segments);
  const dx = segmentPoint.x - ellipse.center.x;
  const dy = segmentPoint.y - ellipse.center.y;
  const length = Math.hypot(dx, dy);
  if (!length) return { a: segmentPoint, b: segmentPoint };
  const radius = ellipseRadiusInDirection(ellipse, dx, dy);
  if (length <= radius) return { a: segmentPoint, b: segmentPoint };
  const ellipsePoint = {
    x: ellipse.center.x + dx / length * radius,
    y: ellipse.center.y + dy / length * radius,
  };
  return segmentsFirst ? { a: segmentPoint, b: ellipsePoint } : { a: ellipsePoint, b: segmentPoint };
}

function closestPolygonToEllipsePoints(poly, ellipse, polygonFirst = false) {
  const polygonPoint = closestPointOnPolygon(ellipse.center, poly);
  const dx = polygonPoint.x - ellipse.center.x;
  const dy = polygonPoint.y - ellipse.center.y;
  const length = Math.hypot(dx, dy);
  if (!length) return { a: polygonPoint, b: polygonPoint };
  const radius = ellipseRadiusInDirection(ellipse, dx, dy);
  if (length <= radius) return { a: polygonPoint, b: polygonPoint };
  const ellipsePoint = {
    x: ellipse.center.x + dx / length * radius,
    y: ellipse.center.y + dy / length * radius,
  };
  return polygonFirst ? { a: polygonPoint, b: ellipsePoint } : { a: ellipsePoint, b: polygonPoint };
}

function singularise(text) {
  return text
    .replace(/ies$/i, "y")
    .replace(/ves$/i, "f")
    .replace(/s$/i, "");
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
    }
  }

  return dp[a.length][b.length];
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rotatePoint(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}
function roundRect(ctx, x, y, width, height, radius, fill = false, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

