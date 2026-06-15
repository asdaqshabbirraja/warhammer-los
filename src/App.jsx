import { useEffect, useRef, useState } from "react";
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

const LAYOUT_WALL_TYPES = {
  AB: { label: "AB", width: 5, height: 4, thickness: 0.5 },
  CD: { label: "CD", width: 6, height: 2.5, thickness: 0.5 },
  EF: { label: "EF", width: 6, height: 4.5, thickness: 0.5 },
  GH: { label: "GH", width: 3, height: 6, thickness: 0.5 },
};

const LAYOUT_FEATURE_TYPES = {
  largeLightL: { label: "Light", button: "Add large L", kind: "light", shape: "l", width: 3, height: 2, thickness: 0.5 },
  smallLightL: { label: "Light", button: "Add small L", kind: "light", shape: "l", width: 2, height: 2, thickness: 0.5 },
  largeLightBarricade: { label: "Light", button: "Add L barricade", kind: "light", shape: "bar", width: 4.75, height: 1 },
  smallLightBarricade: { label: "Light", button: "Add S barricade", kind: "light", shape: "u", width: 4, height: 1, thickness: 0.25 },
  smallDenseRectangle: { label: "Dense", button: "Add S green rectangle", kind: "dense", shape: "rect", width: 2.5, height: 3 },
  denseBarricade: { label: "Dense", button: "Add green barricade", kind: "dense", shape: "rect", width: 8, height: 2 },
  largeDenseRectangle: { label: "Dense", button: "Add L green rectangle", kind: "dense", shape: "rect", width: 2.75, height: 4 },
};

const DEFAULT_LAYOUT_WALL_SET = [
  { type: "AB", x: 7, y: 8 }, { type: "AB", x: 37, y: 52, rotation: 180 },
  { type: "CD", x: 18, y: 8 }, { type: "CD", x: 26, y: 52, rotation: 180 },
  { type: "EF", x: 31, y: 8 }, { type: "EF", x: 13, y: 52, rotation: 180 },
  { type: "GH", x: 40, y: 17 }, { type: "GH", x: 4, y: 43, rotation: 180 },
];

const MAP_DB_NAME = "warhammer-los-maps";
const MAP_STORE_NAME = "maps";

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
  const imgRef = useRef(null);
  const draggingRef = useRef(false);
  const panningRef = useRef(false);
  const panLastRef = useRef(null);
  const objectDragRef = useRef(null);
  const dragFrameRef = useRef(null);
  const pendingDragPointRef = useRef(null);
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
  const [layoutEditMode, setLayoutEditMode] = useState(false);
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
  const [armyPresetName, setArmyPresetName] = useState("Army 1");
  const [armyPresetNames, setArmyPresetNames] = useState([]);
  const [selectedArmyPreset, setSelectedArmyPreset] = useState("");
  const [editingSaveName, setEditingSaveName] = useState(false);
  const [showNewGamePrompt, setShowNewGamePrompt] = useState(false);
  const [expandedMissionCards, setExpandedMissionCards] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    game: true,
    layout: true,
    army: true,
    scale: true,
    markers: true,
    units: true,
    draw: true,
  });

  const state = useRef({
    W: 900,
    H: 600,
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
    layoutObjectives: [],
    layoutTerrain: [],
    layoutTerrainLinks: [],
    layoutTerrainGroups: [],
    layoutWalls: [],
    layoutWallLinks: [],
    layoutTerrainFeatures: [],
    layoutFeaturePieces: [],
    layoutFeatureLinks: [],
    layoutStagingIndex: 0,
    activeLayoutKey: null,
    currentPoly: [],
    wallPath: [],
    wallPreview: null,
    visibility: { clear: [], oneWall: [] },
    losVisibilityCache: new Map(),
    combinedLosRender: { clear: null, oneWall: null },
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
  });

  useEffect(() => {
    refreshSaveSlots();
    refreshArmyPresets();
    loadBrowserSave();
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
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
  }, [mode, activeLosId, activeUnitSlot, losVersion, scaleInches, rangeInches, homeDeploymentRangeInches, enemyDeploymentRangeInches, deepstrikeRangeInches, deepstrikeVisible, layoutEditMode, selectedLayoutTerrainId, selectedLayoutWallId, selectedLayoutFeatureId]);

  useEffect(() => {
    if (!layoutSaveReadyRef.current) {
      layoutSaveReadyRef.current = true;
      return;
    }
    scheduleBrowserSave();
  }, [defenderForceDisposition, attackerForceDisposition, selectedLayoutVariant, missionCardsVisible]);

  function resize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    state.current.W = Math.max(320, rect.width);
    state.current.H = Math.max(420, rect.height);
    canvas.width = state.current.W * dpr;
    canvas.height = state.current.H * dpr;
    canvas.style.width = `${state.current.W}px`;
    canvas.style.height = `${state.current.H}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    calculateFit();
    if (state.current.activeLayoutKey) {
      refreshActiveLayoutGeometry();
      setPixelsPerInch(state.current.fit.w / BATTLEFIELD_WIDTH_INCHES);
    }
    updateVisibility();
    draw();
  }

  function calculateFit() {
    const { W, H } = state.current;
    const padding = 18;
    const s = Math.min(
      Math.max(1, W - padding * 2) / BATTLEFIELD_WIDTH_INCHES,
      Math.max(1, H - padding * 2) / BATTLEFIELD_HEIGHT_INCHES,
    );
    state.current.fit = {
      x: (W - BATTLEFIELD_WIDTH_INCHES * s) / 2,
      y: (H - BATTLEFIELD_HEIGHT_INCHES * s) / 2,
      w: BATTLEFIELD_WIDTH_INCHES * s,
      h: BATTLEFIELD_HEIGHT_INCHES * s,
    };
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

  function buildSaveData() {
    return {
      version: 11,
      battlefieldOrientation: "portrait-44x60",
      layoutGeometryVersion: "wartoken-json-v1",
      savedAt: new Date().toISOString(),
      mapStorageKey: null,
      light: getActiveLosPoint(),
      losMarkers: state.current.losMarkers,
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
    };
  }

  async function applySaveData(data, message = "Browser save restored.") {
    if (!data) return;
    setActiveUnitSlot(null);
    setLayoutLinkMode(false);
    setFirstLinkedTerrainId(null);
    setFirstLinkedWallId(null);
    setFirstLinkedFeatureId(null);
    setDefenderForceDisposition(FORCE_DISPOSITIONS.includes(data.defenderForceDisposition) ? data.defenderForceDisposition : "Take and Hold");
    setAttackerForceDisposition(FORCE_DISPOSITIONS.includes(data.attackerForceDisposition) ? data.attackerForceDisposition : "Take and Hold");
    setSelectedLayoutVariant(["A", "B", "C"].includes(data.selectedLayoutVariant) ? data.selectedLayoutVariant : "A");
    setMissionCardsVisible(data.missionCardsVisible === true);

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
    state.current.layoutObjectives = Array.isArray(data.layoutObjectives) ? data.layoutObjectives : [];
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
    const restoredPreset = LAYOUT_PRESETS[restoredLayoutKey];
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

    if (savedImageSrc) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        state.current.savedImageSrc = savedImageSrc;
        calculateFit();
        if (state.current.activeLayoutKey) {
          refreshActiveLayoutGeometry();
          setPixelsPerInch(state.current.fit.w / BATTLEFIELD_WIDTH_INCHES);
          state.current.deploymentVisible = false;
          state.current.enemyDeploymentVisible = false;
          state.current.deploymentNoMansSide = null;
          state.current.enemyDeploymentNoMansSide = null;
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
      if (state.current.activeLayoutKey) {
        refreshActiveLayoutGeometry();
        setPixelsPerInch(state.current.fit.w / BATTLEFIELD_WIDTH_INCHES);
        state.current.deploymentVisible = false;
        state.current.enemyDeploymentVisible = false;
        state.current.deploymentNoMansSide = null;
        state.current.enemyDeploymentNoMansSide = null;
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

  async function persistGame(storageKey, mapStorageKey) {
    const data = buildSaveData();
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

  function refreshSaveSlots() {
    try {
      const index = JSON.parse(localStorage.getItem("warhammer-los-slots-index") || "[]");
      setSaveSlots(index);
      if (index.length && !selectedSave) setSelectedSave(index[0]);
    } catch (err) {
      console.warn("Could not load save slot list", err);
    }
  }

  async function saveNamedSlot() {
    const name = saveName.trim();
    if (!name) {
      setStatus("Enter a save name first.");
      return;
    }

    try {
      await persistGame(`warhammer-los-slot:${name}`, `slot:${name}`);
      const index = JSON.parse(localStorage.getItem("warhammer-los-slots-index") || "[]");
      const next = index.includes(name) ? index : [...index, name].sort((a, b) => a.localeCompare(b));
      localStorage.setItem("warhammer-los-slots-index", JSON.stringify(next));
      setSaveSlots(next);
      setSelectedSave(name);
      setStatus(`Saved slot: ${name}`);
    } catch (err) {
      console.warn("Named save failed", err);
      setStatus("Could not save slot. Browser storage may be full.");
    }
  }

  async function loadNamedSlot() {
    if (!selectedSave) {
      setStatus("Choose a save slot first.");
      return;
    }

    try {
      const raw = localStorage.getItem(`warhammer-los-slot:${selectedSave}`);
      if (!raw) {
        setStatus("That save slot was not found.");
        refreshSaveSlots();
        return;
      }
      await applySaveData(JSON.parse(raw), `Loaded slot: ${selectedSave}`);
      setSaveName(selectedSave);
    } catch (err) {
      console.warn("Load slot failed", err);
      setStatus("Could not load that save slot.");
    }
  }

  async function deleteNamedSlot() {
    if (!selectedSave) {
      setStatus("Choose a save slot to delete.");
      return;
    }

    localStorage.removeItem(`warhammer-los-slot:${selectedSave}`);
    try {
      await deleteStoredMap(`slot:${selectedSave}`);
      storedMapSourcesRef.current.delete(`slot:${selectedSave}`);
    } catch (err) {
      console.warn("Could not delete saved map", err);
    }
    const next = saveSlots.filter((name) => name !== selectedSave);
    localStorage.setItem("warhammer-los-slots-index", JSON.stringify(next));
    setSaveSlots(next);
    setSelectedSave(next[0] || "");
    setSaveName(next[0] || "Game 1");
    setStatus(`Deleted slot: ${selectedSave}`);
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
    setDefenderForceDisposition("Take and Hold");
    setAttackerForceDisposition("Take and Hold");
    setSelectedLayoutVariant("A");
    setMissionCardsVisible(false);
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

      const next = saveSlots
        .map((name) => (name === selectedSave ? nextName : name))
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .sort((a, b) => a.localeCompare(b));

      localStorage.setItem("warhammer-los-slots-index", JSON.stringify(next));
      setSaveSlots(next);
      setSelectedSave(nextName);
      setSaveName(nextName);
      setStatus(`Renamed save slot to: ${nextName}`);
    } catch (err) {
      console.warn("Rename save slot failed", err);
      setStatus("Could not rename save slot.");
    }
  }

  function cancelSaveNameRename() {
    setSaveName(selectedSave || saveName || "Game 1");
    setEditingSaveName(false);
  }

  function toggleSidebarSection(key) {
    setSectionOpen((current) => ({ ...current, [key]: !current[key] }));
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
    updateLosMarkerById(id, { visible });
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
      if (visible && !state.current.losVisibilityCache.has(member.id)) {
        cacheMarkerVisibility(member.id, calculateMarkerVisibility(member));
      }
    });
    rebuildCombinedVisibility();
    setLosVersion((version) => version + 1);
    draw();
    scheduleBrowserSave();
    setStatus(`${getUnitDisplayName(slot, members)} LOS ${visible ? "enabled" : "disabled"}.`);
  }

  function selectUnit(slot) {
    const members = getUnitMembers(slot);
    if (!members.length) return;
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
    const gap = 0.25 * pixelsPerInch;
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

  function addLosMarker() {
    const id = `los-${Date.now()}`;
    const existing = state.current.losMarkers.length;
    const marker = createLosMarker(id, `LOS ${existing + 1}`, state.current.W / 2, state.current.H / 2);
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

  if (shape === "pill") {
    return `Pill • ${result.baseLengthMm}mm × ${result.baseWidthMm}mm`;
  }

  return `Circle • ${result.baseLengthMm}mm`;
}

  function parseArmyList() {
    const seen = new Set();

    const warhammerAppUnits = extractWarhammerAppUnits(armyListText);
    const lines = (warhammerAppUnits.length ? warhammerAppUnits : armyListText.split(/\n|\r|;/))
      .map(cleanArmyLine)
      .filter((line) => line.length >= 3)
      .filter((line) => !/^\d+$/.test(line));

    const results = [];
    lines.forEach((line, index) => {
      const match = findBestBaseMatch(line);
      const key = normaliseName(match?.name || line);
      if (seen.has(key)) return;
      seen.add(key);

      const base = match?.base || { shape: "circle", diameter: 40 };
      results.push({
        id: `army-result-${Date.now()}-${index}`,
        original: line,
        unit: match?.name || line,
        matched: Boolean(match),
        accepted: Boolean(match),
        editing: !match,
        baseShape: base.shape || "circle",
        baseLengthMm: base.shape === "circle" ? base.diameter : base.length,
        baseWidthMm: base.shape === "circle" ? base.diameter : base.width,
      });
    });

    setArmyResults(results);
    setStatus(
      warhammerAppUnits.length
        ? `Warhammer app format detected. Matched ${results.filter((r) => r.matched).length} of ${results.length} unit entries.`
        : `Matched ${results.filter((r) => r.matched).length} of ${results.length} army-list entries.`
    );
  }

  function updateArmyResult(id, patch) {
    setArmyResults((current) => current.map((result) => result.id === id ? { ...result, ...patch } : result));
  }

  function createLosMarkersFromArmy() {
    const accepted = armyResults.filter((result) => result.accepted);
    if (!accepted.length) {
      setStatus("No accepted army-list entries to create LOS markers from.");
      return;
    }

    const spacing = 34;
    const startX = state.current.W / 2 - ((accepted.length - 1) * spacing) / 2;
    const startY = state.current.H / 2;

    const createdAt = Date.now();
    const newMarkers = accepted.map((result, index) => {
      const id = `army-los-${createdAt}-${index}`;
      return {
        id,
        name: result.unit || result.original || `Unit ${index + 1}`,
        x: startX + index * spacing,
        y: startY + (index % 2) * spacing,
        baseShape: result.baseShape || "circle",
        baseLengthMm: Number(result.baseLengthMm) || 40,
        baseWidthMm: result.baseShape === "circle" ? Number(result.baseLengthMm) || 40 : Number(result.baseWidthMm) || Number(result.baseLengthMm) || 40,
        baseRotation: 0,
        rangeInches: "unlimited",
        visible: false,
        groupingMode: "model",
        unitSlot: null,
        unitTypeId: id,
      };
    });

    state.current.losMarkers.push(...newMarkers);
    const first = newMarkers[0];
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
    setStatus(`Created ${newMarkers.length} LOS marker${newMarkers.length === 1 ? "" : "s"} from army list with LOS disabled.`);
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
      const objectiveIndex = findLayoutObjectiveAtPoint(p);
      if (objectiveIndex >= 0) {
        const objective = state.current.layoutObjectives[objectiveIndex];
        setSelectedLayoutObjectiveId(objective.id);
        setSelectedLayoutTerrainId(null);
        setSelectedLayoutWallId(null);
        objectDragRef.current = { type: "layoutObjective", index: objectiveIndex };
        setStatus("Objective marker selected. Drag it to reposition it.");
        draw();
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
      const moveSelectedUnit = draggedMarker?.groupingMode === "unit" && draggedMarker.unitSlot === activeUnitSlot;
      if (draggable.type === "light" && !moveSelectedUnit) selectLosMarker(draggable.id);
      objectDragRef.current = moveSelectedUnit
        ? {
          ...draggable,
          unitSlot: activeUnitSlot,
          startPoint: p,
          memberStarts: getUnitMembers(activeUnitSlot).map((member) => ({ id: member.id, x: member.x, y: member.y })),
          lastLosUpdate: 0,
          previewMemberIndex: 0,
        }
        : { ...draggable, lastLosUpdate: 0 };
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      const active = draggable.type === "light" ? state.current.losMarkers.find((m) => m.id === draggable.id) : null;
      setStatus(moveSelectedUnit
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
        const featurePieceIndex = state.current.layoutFeaturePieces.findIndex((feature) => pointInPoly(p, layoutFeaturePolygonToWorld(feature)));
        if (featurePieceIndex >= 0) {
          state.current.layoutFeaturePieces.splice(featurePieceIndex, 1);
          setSelectedLayoutFeatureId(null);
          setStatus("Reusable terrain feature erased.");
          draw();
          scheduleBrowserSave();
          return;
        }
        const decorativeIndex = state.current.layoutTerrainFeatures.findIndex((feature) => (
          pointInPoly(p, feature.points.map((point) => battlefieldPoint(point.x, point.y)))
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

  function applyPendingObjectDrag() {
    const p = pendingDragPointRef.current;
    const dragged = objectDragRef.current;
    if (!p || !dragged) return;
    pendingDragPointRef.current = null;

    if (dragged.type === "light") {
      if (dragged.unitSlot && dragged.startPoint && dragged.memberStarts) {
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
        const now = performance.now();
        if (now - dragged.lastLosUpdate >= 80) {
          const visibleMembers = getUnitMembers(dragged.unitSlot).filter((marker) => marker.visible !== false);
          const previewIndex = dragged.previewMemberIndex || 0;
          const previewCount = Math.min(2, visibleMembers.length);
          for (let index = 0; index < previewCount; index += 1) {
            const previewMarker = visibleMembers[(previewIndex + index) % Math.max(1, visibleMembers.length)];
            if (previewMarker) cacheMarkerVisibility(previewMarker.id, calculateMarkerVisibility(previewMarker, true));
          }
          dragged.previewMemberIndex = previewIndex + previewCount;
          rebuildCombinedVisibility(true);
          dragged.lastLosUpdate = now;
        }
      } else {
        const markerIndex = state.current.losMarkers.findIndex((marker) => marker.id === dragged.id);
        if (markerIndex >= 0) {
          const marker = state.current.losMarkers[markerIndex];
          state.current.losMarkers[markerIndex] = { ...marker, x: p.x, y: p.y };
          if (marker.visible === false) state.current.losVisibilityCache.delete(marker.id);
          if (marker.id === activeLosId) state.current.light = { x: p.x, y: p.y };
          updateVisibility(dragged.id, false, true);
        }
      }
    } else if (dragged.type === "enemy") {
      const enemy = state.current.enemies[dragged.index];
      if (enemy) state.current.enemies[dragged.index] = { ...enemy, x: p.x, y: p.y };
    } else if (dragged.type === "layoutTerrain") {
      const terrain = state.current.layoutTerrain[dragged.index];
      const inch = state.current.fit.w / BATTLEFIELD_WIDTH_INCHES;
      if (terrain && inch) {
        terrain.x = dragged.startX + (p.x - dragged.startPoint.x) / inch;
        terrain.y = dragged.startY + (p.y - dragged.startPoint.y) / inch;
        syncLinkedLayoutTerrain(terrain);
        rebuildLayoutTerrainGeometry();
      }
    } else if (dragged.type === "layoutWall") {
      const wall = state.current.layoutWalls[dragged.index];
      const inch = state.current.fit.w / BATTLEFIELD_WIDTH_INCHES;
      if (wall && inch) {
        wall.x = dragged.startX + (p.x - dragged.startPoint.x) / inch;
        wall.y = dragged.startY + (p.y - dragged.startPoint.y) / inch;
        syncLinkedLayoutWall(wall);
        rebuildLayoutWallGeometry();
      }
    } else if (dragged.type === "layoutFeature") {
      const feature = state.current.layoutFeaturePieces[dragged.index];
      const inch = state.current.fit.w / BATTLEFIELD_WIDTH_INCHES;
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

  function pointerUp() {
    if (objectDragRef.current) {
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      const dragged = objectDragRef.current;
      applyPendingObjectDrag();
      if (dragged.type === "light") {
        if (dragged.unitSlot) {
          getUnitMembers(dragged.unitSlot).forEach((marker) => {
            if (marker.visible !== false) cacheMarkerVisibility(marker.id, calculateMarkerVisibility(marker, false, true));
          });
          rebuildCombinedVisibility();
        }
        else updateVisibility(dragged.id, false);
      }
      if (dragged.type === "layoutObjective") snapObjectiveToTerrainCenter(dragged.index);
      objectDragRef.current = null;
      if (dragged.type === "light") setLosVersion((v) => v + 1);
      if (dragged.type === "layoutTerrain" || dragged.type === "layoutTerrainPoint" || dragged.type === "layoutWall") updateVisibility();
      if (dragged.type === "layoutTerrain" || dragged.type === "layoutTerrainPoint") {
        setLayoutTerrainRelationVersion((version) => version + 1);
      }
      scheduleBrowserSave();
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
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
      return poly ? { poly } : null;
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
      if (pointInPoly(p, layoutFeaturePolygonToWorld(state.current.layoutFeaturePieces[index]))) return index;
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
    const pixelsPerInch = state.current.fit.w / BATTLEFIELD_WIDTH_INCHES;
    const radius = Math.max(16 / state.current.camera.scale, pixelsPerInch * 1.8);
    for (let index = state.current.layoutObjectives.length - 1; index >= 0; index--) {
      if (dist(p, state.current.layoutObjectives[index]) <= radius) return index;
    }
    return -1;
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
      const rect = deploymentLineCaptionRect(ctx, item.label, item.path, fit, camera.scale, item.position);
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

  function groupedLayoutTerrainPolygonsForPoint(point) {
    const containingTerrain = state.current.layoutTerrain.find((terrain) => pointInPoly(point, layoutTerrainPolygon(terrain)));
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
      const inchesToPixels = state.current.fit.w / BATTLEFIELD_WIDTH_INCHES;
      const touchingTriangle = state.current.layoutTerrain.find((terrain) => (
        terrain.id !== containingTerrain.id
        && terrain.shape === "right_triangle"
        && polygonsTouchOrNear(containingPolygon, layoutTerrainPolygon(terrain), inchesToPixels)
      ));
      if (touchingTriangle) return [containingPolygon, layoutTerrainPolygon(touchingTriangle)];
    }
    return [layoutTerrainPolygon(containingTerrain)];
  }

  function snapObjectiveToTerrainCenter(objectiveIndex) {
    const objective = state.current.layoutObjectives[objectiveIndex];
    if (!objective) return;
    const groupedPolygons = groupedLayoutTerrainPolygonsForPoint(objective);
    const footprint = state.current.blockers.find((poly) => pointInPoly(objective, poly));
    if (!groupedPolygons.length && !footprint?.length) return;
    const bounds = groupedPolygons.length ? polygonBounds(groupedPolygons) : polygonBounds([footprint]);
    const center = {
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
    e.preventDefault();

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
    if (["l", "p", "f", "w", "e", "x", "z", "d", "q", "+", "=", "-"].includes(key)) e.preventDefault();

    if (key === "p") setMode("pan");
    else if (key === "f") setMode("block");
    else if (key === "w") setMode("wall");
    else if (key === "e") setMode("enemy");
    else if (key === "d") setMode("deployHome");
    else if (key === "q") setMode("deployEnemy");
    else if (key === "x") setMode("erase");
    else if (key === "z") undo();
    else if (key === "+" || key === "=") zoomBy(1.25);
    else if (key === "-") zoomBy(0.8);
    
  }

  function resetZoom() {
    state.current.camera = { scale: 1, x: 0, y: 0 };
    draw();
  }

  function getBaseRadii(cameraScale = 1, marker = null) {
    const shape = marker?.baseShape || baseShape;
    const lengthMm = marker?.baseLengthMm ?? baseLengthMm;
    const widthMm = marker?.baseWidthMm ?? baseWidthMm;

    if (!pixelsPerInch) {
      const fallback = 15 / cameraScale;
      return { rx: fallback, ry: fallback };
    }

    const pxPerMm = pixelsPerInch / 25.4;
    if (shape === "circle") {
      const r = Math.max(1, (Number(lengthMm) || 25) * pxPerMm / 2);
      return { rx: r, ry: r };
    }

    return {
      rx: Math.max(1, (Number(lengthMm) || 60) * pxPerMm / 2),
      ry: Math.max(1, (Number(widthMm) || 35) * pxPerMm / 2),
    };
  }

  function getLOSOriginsForMarker(marker, interactive = false) {
    if (!marker) return [];
    const center = { x: marker.x, y: marker.y };
    if (!pixelsPerInch) return [center];

    const { rx, ry } = getBaseRadii(1, marker);
    const samples = interactive ? (marker.baseShape === "circle" ? 4 : 6) : (marker.baseShape === "circle" ? 20 : 28);
    const points = [center];

    for (let i = 0; i < samples; i++) {
      const a = (Math.PI * 2 * i) / samples;
      const localX = Math.cos(a) * rx;
      const localY = Math.sin(a) * ry;
      const rotated = rotatePoint(localX, localY, marker.baseRotation || 0);
      points.push({ x: center.x + rotated.x, y: center.y + rotated.y });
    }

    return points;
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
    const preset = LAYOUT_PRESETS[state.current.activeLayoutKey];
    if (!preset) {
      setStatus("Apply an official layout before restoring its deployment lines.");
      return;
    }
    state.current.deploymentPath = preset.homeDeploymentPath.map(([x, y]) => {
      const point = rotateLayoutPoint(x, y);
      return battlefieldPoint(point.x, point.y);
    });
    state.current.deploymentLine = {
      a: state.current.deploymentPath[0],
      b: state.current.deploymentPath[state.current.deploymentPath.length - 1],
    };
    state.current.enemyDeploymentPath = preset.enemyDeploymentPath.map(([x, y]) => {
      const point = rotateLayoutPoint(x, y);
      return battlefieldPoint(point.x, point.y);
    });
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
    setPixelsPerInch(state.current.fit.w / BATTLEFIELD_WIDTH_INCHES);
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

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { W, H, fit, camera, blockers, walls, enemies, layoutObjectives, currentPoly, wallPath, wallPreview, visibility, scalePreview, rulerPreview, rulers, stickyRulers, deploymentLine, deploymentPath, deploymentDraft, deploymentPreview, deploymentVisible, deploymentLabelPosition, deploymentVisibility, enemyDeploymentLine, enemyDeploymentPath, enemyDeploymentDraft, enemyDeploymentPreview, enemyDeploymentVisible, enemyDeploymentLabelPosition, enemyDeploymentVisibility } = state.current;
    const light = getActiveLosPoint();
    const clearZones = visibility.clearZones || [];
    const oneWallZones = visibility.oneWallZones || [];
    const selectedUnitMembers = activeUnitSlot ? getUnitMembers(activeUnitSlot) : [];
    const selectedRangeValue = selectedUnitMembers.length ? getUnitRange(activeUnitSlot, selectedUnitMembers) : rangeInches;
    const numericRange = Number(selectedRangeValue);
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
        if (!enemyInRange(enemy, marker, radius, pixelsPerInch)) return;
        count += 1;
        markerIdsInRange.add(marker.id);
      });
      return count;
    });

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    const img = imgRef.current;
    ctx.fillStyle = "#24272b";
    ctx.fillRect(fit.x, fit.y, fit.w, fit.h);
    if (img) {
      ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
      ctx.fillStyle = "rgba(15,18,22,.72)";
      ctx.fillRect(fit.x, fit.y, fit.w, fit.h);
    }
    drawBattlefieldGrid(ctx, fit, camera.scale);

    if (homeDeployPath.length >= 2 && state.current.deploymentNoMansSide) {
      drawDeploymentAreaWash(
        ctx,
        homeDeployPath,
        state.current.deploymentNoMansSide,
        W,
        H,
        fit,
        blockers,
        "rgba(125,211,252,.18)",
      );
    }
    if (enemyDeployPath.length >= 2 && state.current.enemyDeploymentNoMansSide) {
      drawDeploymentAreaWash(
        ctx,
        enemyDeployPath,
        state.current.enemyDeploymentNoMansSide,
        W,
        H,
        fit,
        blockers,
        "rgba(248,113,113,.18)",
      );
    }

    const rangeMarkers = Number.isFinite(rangeRadius)
      ? (selectedUnitMembers.length ? selectedUnitMembers : [getActiveLosMarker()].filter(Boolean))
      : [];

    // Filled tactical overlays are confined to the playable 44" x 60" battlefield.
    // Measurement and coherency guides are drawn after this clip is released.
    ctx.save();
    ctx.beginPath();
    ctx.rect(fit.x, fit.y, fit.w, fit.h);
    ctx.clip();

    if (state.current.combinedLosRender?.oneWall || state.current.combinedLosRender?.clear) {
      if (state.current.combinedLosRender.oneWall) {
        ctx.drawImage(state.current.combinedLosRender.oneWall, 0, 0);
      }
      if (state.current.combinedLosRender.clear) {
        ctx.save();
        clipOutsidePolygons(ctx, blockers, W, H);
        ctx.drawImage(state.current.combinedLosRender.clear, 0, 0);
        ctx.restore();
      }
    }

    if (Number.isFinite(rangeRadius)) {
      const activeZones = rangeMarkers.flatMap((marker) => {
        const activeVisibility = state.current.losVisibilityCache.get(marker.id);
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

    // Footprints are drawn after the LOS overlays with a near-solid fill.
    // This masks any small visibility edge/ray artifacts inside footprints.
    // Footprints should not dim valid LOS inside them.
    // First draw a subtle footprint tint, then re-brighten any part of the footprint
    // that lies inside the clear/yellow LOS polygons.
    state.current.layoutTerrain.forEach((layoutTerrain) => {
      const definition = TERRAIN_FOOTPRINTS[layoutTerrain.shape] || TERRAIN_FOOTPRINTS.large_rectangle;
      const visualPoly = terrainLocalPolygonToWorld(layoutTerrain, layoutTerrain.outer || definition.outer);
      const grouped = Boolean(layoutTerrainGroupFor(layoutTerrain.id));
      drawPoly(ctx, visualPoly, "rgba(196,152,43,.30)", grouped ? "rgba(0,0,0,0)" : "rgba(255,255,255,.84)", true, camera.scale, false);
      const lightPoly = terrainLocalPolygonToWorld(layoutTerrain, definition.light);
      const densePoly = terrainLocalPolygonToWorld(layoutTerrain, definition.dense);
      if (lightPoly.length) drawPoly(ctx, lightPoly, "rgba(222,145,25,.42)", "rgba(250,204,21,.75)", true, camera.scale, false);
      if (densePoly.length) drawPoly(ctx, densePoly, "rgba(15,118,110,.52)", "rgba(16,185,129,.88)", true, camera.scale, false);
      if (layoutEditMode && layoutTerrain.id === selectedLayoutTerrainId) {
        drawPoly(ctx, visualPoly, "rgba(0,0,0,0)", "#60a5fa", true, camera.scale, false);
      }
    });

    blockers.forEach((poly, index) => {
      const blockerId = state.current.blockerIds[index] || "";
      const generatedLayoutFootprint = blockerId.startsWith("layout-");
      drawPoly(
        ctx,
        poly,
        generatedLayoutFootprint ? "rgba(0,0,0,0)" : "rgba(18,18,18,.38)",
        generatedLayoutFootprint && String(poly.footprintGroupId || "").startsWith("layout-group:")
          ? "rgba(0,0,0,0)"
          : generatedLayoutFootprint ? "rgba(255,255,255,.96)" : "rgba(255,255,255,.22)",
        true,
        camera.scale,
        !generatedLayoutFootprint,
      );

    });
    drawGroupedTerrainOutlines(ctx, blockers, camera.scale);
    state.current.layoutWalls.forEach((wall) => {
      const polygon = layoutWallPolygonToWorld(wall);
      ctx.save();
      if (wall.floorState === "firstFloor") ctx.setLineDash([7 / camera.scale, 5 / camera.scale]);
      drawPoly(ctx, polygon, wall.floorState === "firstFloor" ? "rgba(168,85,247,.24)" : "rgba(168,85,247,.82)", layoutEditMode && wall.id === selectedLayoutWallId ? "#f8fafc" : "#c084fc", true, camera.scale, false);
      ctx.restore();
    });
    state.current.layoutTerrainFeatures.forEach((feature) => {
      const poly = feature.points.map((point) => battlefieldPoint(point.x, point.y));
      drawDecorativeTerrainFeature(ctx, poly, feature.kind, camera.scale);
    });
    state.current.layoutFeaturePieces.forEach((feature) => {
      const definition = LAYOUT_FEATURE_TYPES[feature.type];
      const polygon = layoutFeaturePolygonToWorld(feature);
      drawDecorativeTerrainFeature(ctx, polygon, definition?.kind || "light", camera.scale);
      if (feature.id === selectedLayoutFeatureId) {
        drawPoly(ctx, polygon, "rgba(0,0,0,0)", "#f8fafc", true, camera.scale, false);
      }
    });
    if (scalePreview) drawMeasurementLine(ctx, scalePreview.a, scalePreview.b, `${scaleInches}"`, camera.scale);
    rulers.forEach((ruler) => drawRulerLine(ctx, ruler.a, ruler.b, pixelsPerInch, camera.scale));
    if (rulerPreview) drawRulerLine(ctx, rulerPreview.a, rulerPreview.b, pixelsPerInch, camera.scale, true);
    stickyRulers.forEach((ruler) => {
      const geometry = getStickyRulerGeometry(ruler);
      if (geometry) drawStickyRulerLine(ctx, geometry.a, geometry.b, pixelsPerInch, camera.scale);
    });
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

    if (deploymentPath?.length >= 2) drawDeploymentPath(ctx, deploymentPath, camera.scale, deploymentVisible, false, "home", fit, deploymentLabelPosition);
    else if (deploymentLine) drawDeploymentLine(ctx, deploymentLine, camera.scale, deploymentVisible, false, "home", fit, deploymentLabelPosition);
    if (deploymentDraft?.length) drawDeploymentPath(ctx, deploymentPreview ? [...deploymentDraft, deploymentPreview] : deploymentDraft, camera.scale, true, true, "home", fit);
    if (enemyDeploymentPath?.length >= 2) drawDeploymentPath(ctx, enemyDeploymentPath, camera.scale, enemyDeploymentVisible, false, "enemy", fit, enemyDeploymentLabelPosition);
    else if (enemyDeploymentLine) drawDeploymentLine(ctx, enemyDeploymentLine, camera.scale, enemyDeploymentVisible, false, "enemy", fit, enemyDeploymentLabelPosition);
    if (enemyDeploymentDraft?.length) drawDeploymentPath(ctx, enemyDeploymentPreview ? [...enemyDeploymentDraft, enemyDeploymentPreview] : enemyDeploymentDraft, camera.scale, true, true, "enemy", fit);
    if (homeDeployPath.length >= 2 && !state.current.deploymentNoMansSide) {
      drawDeploymentSideArrows(ctx, homeDeployPath, camera.scale, "home");
    }
    if (enemyDeployPath.length >= 2 && !state.current.enemyDeploymentNoMansSide) {
      drawDeploymentSideArrows(ctx, enemyDeployPath, camera.scale, "enemy");
    }

    layoutObjectives.forEach((objective) => {
      drawLayoutObjective(ctx, objective, pixelsPerInch || fit.w / BATTLEFIELD_WIDTH_INCHES, camera.scale);
      if (layoutEditMode && objective.id === selectedLayoutObjectiveId) {
        const radius = Math.max(17 / camera.scale, (pixelsPerInch || fit.w / BATTLEFIELD_WIDTH_INCHES) * 1.8);
        ctx.save();
        ctx.beginPath();
        ctx.arc(objective.x, objective.y, radius, 0, Math.PI * 2);
        ctx.lineWidth = 2.5 / camera.scale;
        ctx.strokeStyle = "#f8fafc";
        ctx.stroke();
        ctx.restore();
      }
    });

    enemies.forEach((enemy, index) => {
      const visibleMarkers = state.current.losMarkers.filter((marker) => marker.visible !== false);
      const losState = directEnemyLOSState(
        enemy,
        enemyBaseRadius(pixelsPerInch),
        visibleMarkers.flatMap((marker) => getLOSOriginsForMarker(marker, true)),
        blockers,
        walls,
      );
      const rangeActive = Number.isFinite(rangeRadius);
      const inRange = selectedUnitMembers.length
        ? selectedUnitMembers.some((marker) => enemyInRange(enemy, marker, rangeRadius, pixelsPerInch))
        : enemyInRange(enemy, light, rangeRadius, pixelsPerInch);
      drawEnemy(ctx, enemy, losState, inRange, rangeActive, index + 1, camera.scale, enemyRangeCounts[index], pixelsPerInch);
    });

    state.current.losMarkers.forEach((marker) => {
      const base = getBaseRadii(camera.scale, marker);
      const isPrimaryActive = marker.id === activeLosId;
      const isActiveUnitMember = activeUnitSlot && marker.groupingMode === "unit" && marker.unitSlot === activeUnitSlot;
      const isActive = isPrimaryActive || isActiveUnitMember;
      const isStickyStart = sameStickyTarget(state.current.stickyRulerStart, { type: "los", id: marker.id });
      const isUnitStickyStart = marker.groupingMode === "unit" && sameStickyTarget(state.current.stickyRulerStart, { type: "unit", id: String(marker.unitSlot) });
      const coherency = marker.groupingMode === "unit" ? unitCoherency.get(marker.unitSlot) : null;
      const unitFailed = coherency && !coherency.coherent;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(marker.x, marker.y, base.rx, base.ry, marker.baseRotation || 0, 0, Math.PI * 2);
      ctx.fillStyle = marker.visible ? "#f5f7fa" : "rgba(245,247,250,.45)";
      ctx.fill();
      ctx.lineWidth = isUnitStickyStart || isStickyStart ? 6 / camera.scale : unitFailed ? 6 / camera.scale : isActive ? 5 / camera.scale : 4 / camera.scale;
      ctx.strokeStyle = isUnitStickyStart || isStickyStart ? "rgb(222,145,25)" : unitFailed ? "#ef4444" : isActive ? "#22c55e" : marker.visible ? "#2563eb" : "#64748b";
      if (!marker.visible) ctx.setLineDash([6 / camera.scale, 5 / camera.scale]);
      ctx.stroke();

      if (markerIdsInRange.has(marker.id)) drawMarkerRangeTick(ctx, marker, base, camera.scale);

      const unitMembers = marker.groupingMode === "unit" ? getUnitMembers(marker.unitSlot) : [];
      if (unitMembers.length <= 2) drawLosMarkerLabel(ctx, marker, base, camera.scale);

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

    for (let slot = 1; slot <= 20; slot++) {
      const members = getUnitMembers(slot);
      if (members.length <= 2) continue;
      const lowest = members.reduce((best, marker) => {
        const bottom = marker.y + getBaseRadii(1, marker).ry;
        const bestBottom = best.y + getBaseRadii(1, best).ry;
        return bottom > bestBottom ? marker : best;
      });
      const label = getUnitDisplayName(slot, members);
      const labelY = lowest.y + getBaseRadii(1, lowest).ry + 12 / camera.scale;
      drawMapCaption(ctx, label, lowest.x, labelY, camera.scale);
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
  }

  function calculateMarkerVisibility(marker, interactive = false, forceFullDetail = false) {
    const clearZones = [];
    const oneWallZones = [];
    if (!marker || marker.visible === false) return { clearZones, oneWallZones };
    const visibleMarkerCount = state.current.losMarkers.filter((item) => item.visible !== false).length;
    const useReducedSamples = !forceFullDetail && (interactive || visibleMarkerCount > 5);
    const origins = interactive
      ? [{ x: marker.x, y: marker.y }]
      : getLOSOriginsForMarker(marker, useReducedSamples);
    const blockers = interactive && state.current.interactiveBlockers.length
      ? state.current.interactiveBlockers
      : state.current.blockers;
    const visibilityGeometry = getPreparedVisibilityGeometry(
      blockers,
      state.current.walls,
      state.current.W,
      state.current.H,
    );
    origins.forEach((origin) => {
      clearZones.push(computeVisibilityByFootprintWallLimit(origin, blockers, state.current.walls, state.current.W, state.current.H, 0, visibilityGeometry));
      oneWallZones.push(computeVisibilityByFootprintWallLimit(origin, blockers, state.current.walls, state.current.W, state.current.H, 1, visibilityGeometry));
    });
    return { clearZones, oneWallZones };
  }

  function cacheMarkerVisibility(markerId, visibility) {
    state.current.losVisibilityCache.set(markerId, visibility);
  }

  function rebuildCombinedVisibility(interactive = false) {
    let clearZones = [];
    let oneWallZones = [];
    state.current.losMarkers.forEach((marker) => {
      if (marker.visible === false) return;
      const cached = state.current.losVisibilityCache.get(marker.id);
      if (!cached) return;
      clearZones.push(...cached.clearZones);
      oneWallZones.push(...cached.oneWallZones);
    });
    state.current.visibility = { clearZones, oneWallZones };
    const renderScale = interactive ? 0.7 : 1;
    state.current.combinedLosRender = createCombinedLosLayers(
      clearZones,
      oneWallZones,
      state.current.W,
      state.current.H,
      renderScale,
      state.current.combinedLosBuffers,
    );
  }

  function updateVisibility(markerId = null, recomputeDeployment = true, interactive = false) {
    if (markerId) {
      const marker = state.current.losMarkers.find((item) => item.id === markerId);
      if (marker?.visible !== false) cacheMarkerVisibility(markerId, calculateMarkerVisibility(marker, interactive));
      else rebuildCombinedVisibility();
    } else {
      const currentIds = new Set(state.current.losMarkers.map((marker) => marker.id));
      for (const cachedId of state.current.losVisibilityCache.keys()) {
        if (!currentIds.has(cachedId)) {
          state.current.losVisibilityCache.delete(cachedId);
        }
      }
      state.current.losMarkers.forEach((marker) => {
        if (marker.visible !== false) cacheMarkerVisibility(marker.id, calculateMarkerVisibility(marker));
        else state.current.losVisibilityCache.delete(marker.id);
      });
    }

    rebuildCombinedVisibility(interactive);
    if (!recomputeDeployment) return;

    const deployPath = state.current.deploymentPath?.length >= 2
      ? state.current.deploymentPath
      : (state.current.deploymentLine ? [state.current.deploymentLine.a, state.current.deploymentLine.b] : []);

    if (deployPath.length >= 2 && state.current.deploymentVisible) {
      const deploymentOrigins = samplePathPoints(deployPath, 8);
      state.current.deploymentVisibility = {
        clearZones: deploymentOrigins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 0)),
        oneWallZones: deploymentOrigins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 1)),
      };
    } else {
      state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
    }

    const enemyDeployPath = state.current.enemyDeploymentPath?.length >= 2
      ? state.current.enemyDeploymentPath
      : (state.current.enemyDeploymentLine ? [state.current.enemyDeploymentLine.a, state.current.enemyDeploymentLine.b] : []);

    if (enemyDeployPath.length >= 2 && state.current.enemyDeploymentVisible) {
      const deploymentOrigins = samplePathPoints(enemyDeployPath, 8);
      state.current.enemyDeploymentVisibility = {
        clearZones: deploymentOrigins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 0)),
        oneWallZones: deploymentOrigins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 1)),
      };
    } else {
      state.current.enemyDeploymentVisibility = { clearZones: [], oneWallZones: [] };
    }
  }

  function battlefieldPoint(x, y) {
    const { fit } = state.current;
    return {
      x: fit.x + (x / BATTLEFIELD_WIDTH_INCHES) * fit.w,
      y: fit.y + (y / BATTLEFIELD_HEIGHT_INCHES) * fit.h,
    };
  }

  function worldToBattlefieldPoint(point) {
    const { fit } = state.current;
    return {
      x: (point.x - fit.x) / fit.w * BATTLEFIELD_WIDTH_INCHES,
      y: (point.y - fit.y) / fit.h * BATTLEFIELD_HEIGHT_INCHES,
    };
  }

  function validBoardPoint(point) {
    return Number.isFinite(point?.x) && Number.isFinite(point?.y);
  }

  function mirroredBoardPoint(point) {
    return {
      x: BATTLEFIELD_WIDTH_INCHES - point.x,
      y: BATTLEFIELD_HEIGHT_INCHES - point.y,
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
    const battlefieldX = (point.x - fit.x) / fit.w * BATTLEFIELD_WIDTH_INCHES;
    const battlefieldY = (point.y - fit.y) / fit.h * BATTLEFIELD_HEIGHT_INCHES;
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
    const definition = LAYOUT_FEATURE_TYPES[feature.type] || LAYOUT_FEATURE_TYPES.largeLightL;
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

  function rebuildLayoutWallGeometry() {
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
  }

  function setSelectedWallFloorState(floorState) {
    const wall = state.current.layoutWalls.find((item) => item.id === selectedLayoutWallId);
    if (!wall) return;
    wall.floorState = floorState;
    rebuildLayoutWallGeometry();
        setSelectedLayoutWallId(null);
        setSelectedLayoutFeatureId(null);
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${wall.type} wall set to ${floorState === "firstFloor" ? "1st Floor" : "Ground"}.`);
  }

  function rebuildLayoutTerrainGeometry() {
    const blockers = [];
    const blockerIds = [];
    const trianglePolys = [];
    const boundaryTolerance = state.current.fit.w / BATTLEFIELD_WIDTH_INCHES * 0.08;

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
      state.current.fit.w / BATTLEFIELD_WIDTH_INCHES,
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
      const simplified = simplifyClosedPolygon(poly, 2.5);
      simplified.footprintGroupId = poly.footprintGroupId;
      simplified.sharedBoundaryTolerance = poly.sharedBoundaryTolerance;
      return simplified;
    });
  }

  function refreshActiveLayoutGeometry() {
    const preset = LAYOUT_PRESETS[state.current.activeLayoutKey];
    if (!preset) return;
    rebuildLayoutTerrainGeometry();
    rebuildLayoutWallGeometry();
    const existingObjectives = state.current.layoutObjectives;
    state.current.layoutObjectives = preset.objectives.map((objective, index) => {
      const existing = existingObjectives.find((item) => item.id === `layout-objective-${index}`);
      const point = existing && Number.isFinite(existing.boardX) && Number.isFinite(existing.boardY)
        ? { x: existing.boardX, y: existing.boardY }
        : preset.portraitCoordinates
          ? { x: objective.x, y: objective.y }
          : rotateLayoutPoint(objective.x, objective.y);
      return {
        id: `layout-objective-${index}`,
        ...battlefieldPoint(point.x, point.y),
        boardX: point.x,
        boardY: point.y,
        allegiance: objective.allegiance,
        shape: objective.allegiance === "neutral" && index !== 2 ? "diamond" : "circle",
      };
    });
    state.current.deploymentPath = preset.homeDeploymentPath.map(([x, y]) => {
      const point = rotateLayoutPoint(x, y);
      return battlefieldPoint(point.x, point.y);
    });
    state.current.deploymentLine = { a: state.current.deploymentPath[0], b: state.current.deploymentPath[state.current.deploymentPath.length - 1] };
    state.current.enemyDeploymentPath = preset.enemyDeploymentPath.map(([x, y]) => {
      const point = rotateLayoutPoint(x, y);
      return battlefieldPoint(point.x, point.y);
    });
    state.current.enemyDeploymentLine = { a: state.current.enemyDeploymentPath[0], b: state.current.enemyDeploymentPath[state.current.enemyDeploymentPath.length - 1] };
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
    const inchesToPixels = state.current.fit.w / BATTLEFIELD_WIDTH_INCHES;
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
    linked.x = BATTLEFIELD_WIDTH_INCHES - source.x;
    linked.y = BATTLEFIELD_HEIGHT_INCHES - source.y;
    linked.rotation = ((source.rotation || 0) + 180) % 360;
    if (syncMirrored) linked.mirrored = source.mirrored === true;
  }

  function syncLinkedLayoutWall(source, syncMirrored = false) {
    const linkedId = linkedLayoutWallId(source.id);
    if (!linkedId) return;
    const linked = state.current.layoutWalls.find((wall) => wall.id === linkedId);
    if (!linked) return;
    linked.x = BATTLEFIELD_WIDTH_INCHES - source.x;
    linked.y = BATTLEFIELD_HEIGHT_INCHES - source.y;
    linked.rotation = ((source.rotation || 0) + 180) % 360;
    if (syncMirrored) linked.mirrored = source.mirrored === true;
  }

  function syncLinkedLayoutFeature(source, syncMirrored = false) {
    const linkedId = linkedLayoutFeatureId(source.id);
    if (!linkedId) return;
    const linked = state.current.layoutFeaturePieces.find((feature) => feature.id === linkedId);
    if (!linked) return;
    linked.x = BATTLEFIELD_WIDTH_INCHES - source.x;
    linked.y = BATTLEFIELD_HEIGHT_INCHES - source.y;
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

  function saveLayoutFixture() {
    if (!state.current.layoutTerrain.length) {
      setStatus("Apply a layout before saving its fixture positions.");
      return;
    }
    const key = `warhammer-layout-fixture:v11:${defenderForceDisposition}|${attackerForceDisposition}|${selectedLayoutVariant}`;
    const fixture = {
      version: 11,
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
      objectives: state.current.layoutObjectives.map((objective) => ({
        id: objective.id,
        boardX: Number.isFinite(objective.boardX) ? objective.boardX : worldToBattlefieldPoint(objective).x,
        boardY: Number.isFinite(objective.boardY) ? objective.boardY : worldToBattlefieldPoint(objective).y,
        allegiance: objective.allegiance,
        shape: objective.shape,
      })),
      walls: state.current.walls.filter((wall) => !wall.generatedLayoutWall).map((wall) => ({
        a: worldToBattlefieldPoint(wall.a),
        b: worldToBattlefieldPoint(wall.b),
      })),
    };
    localStorage.setItem(key, JSON.stringify(fixture));
    setStatus("Terrain, reusable walls, and objective fixture positions saved.");
  }

  function applySelectedLayout() {
    const layoutKey = `${defenderForceDisposition}|${attackerForceDisposition}|${selectedLayoutVariant}`;
    const preset = LAYOUT_PRESETS[layoutKey];
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

    calculateFit();
    const fixtureKey = `warhammer-layout-fixture:v11:${layoutKey}`;
    let savedFixture = null;
    try {
      const savedFixtureText = localStorage.getItem(fixtureKey);
      savedFixture = JSON.parse(savedFixtureText || "null");
    } catch {}
    const savedTerrain = Array.isArray(savedFixture) ? savedFixture : savedFixture?.terrain;
    const savedTerrainLinks = Array.isArray(savedFixture?.terrainLinks) ? savedFixture.terrainLinks : (preset.terrainLinks || []);
    const savedTerrainGroups = Array.isArray(savedFixture?.terrainGroups) ? savedFixture.terrainGroups : (preset.terrainGroups || []);
    const savedWallLinks = Array.isArray(savedFixture?.wallLinks) ? savedFixture.wallLinks : (preset.wallLinks || []);
    const savedFeatureLinks = Array.isArray(savedFixture?.featureLinks) ? savedFixture.featureLinks : (preset.featureLinks || []);
    const savedObjectives = Array.isArray(savedFixture?.objectives) ? savedFixture.objectives : null;
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
    state.current.layoutObjectives = savedObjectives?.length === preset.objectives.length
      ? savedObjectives.map((objective, index) => ({
        id: objective.id || `layout-objective-${index}`,
        boardX: objective.boardX,
        boardY: objective.boardY,
        allegiance: objective.allegiance || preset.objectives[index].allegiance,
        shape: objective.shape || (preset.objectives[index].allegiance === "neutral" && index !== 2 ? "diamond" : "circle"),
      }))
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
    setPixelsPerInch(state.current.fit.w / BATTLEFIELD_WIDTH_INCHES);
    setLayoutEditMode(true);
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
    setStatus(`${preset.source} applied. Existing armies, rulers, and LOS markers were kept.`);
  }

  const sortedMarkers = sortedLosMarkers();
  const sortedUnits = Array.from({ length: 20 }, (_, index) => index + 1)
    .map((slot) => ({ slot, members: getUnitMembers(slot) }))
    .filter((unit) => unit.members.length);
  const displayedSaveName = selectedSave || saveName || "Unsaved game";
  const selectedPrimaryMission = FORCE_DISPOSITION_MISSIONS[defenderForceDisposition]?.[attackerForceDisposition] || "Unknown mission";
  const selectedMissionSlug = PRIMARY_MISSION_CARD_SLUGS[selectedPrimaryMission];
  const selectedMissionCards = selectedMissionSlug
    ? [
      { side: "Front", src: `/mission-cards/${selectedMissionSlug}-front.webp` },
      ...(DOUBLE_SIDED_PRIMARY_MISSIONS.has(selectedPrimaryMission)
        ? [{ side: "Back", src: `/mission-cards/${selectedMissionSlug}-back.webp` }]
        : []),
    ]
    : [];
  const selectedLayoutPreset = LAYOUT_PRESETS[`${defenderForceDisposition}|${attackerForceDisposition}|${selectedLayoutVariant}`];
  const activeTerrainRelation = layoutTerrainRelationVersion >= 0 ? selectedTerrainRelation() : null;

  return (
    <div style={styles.appShell}>
      <div style={styles.body}>
        <div style={{ ...styles.sidebarShell, width: sidebarCollapsed ? 0 : 360 }}>
          <aside style={{ ...styles.sidebar, transform: sidebarCollapsed ? "translateX(-100%)" : "translateX(0)" }}>
          <button onClick={() => fileRef.current?.click()} style={styles.uploadButton}>Upload map</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadImage} />

          <div style={{ ...styles.sidebarSection, order: 1 }}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("game")}>
              <span style={styles.sectionTriangle}>{sectionOpen.game ? "▾" : "▸"}</span>
              <span>Game Save</span>
            </button>
            {sectionOpen.game && (
              <div style={styles.sectionContent}>
                <div style={styles.sidebarRow}>
                  <select value={selectedSave} onChange={(e) => handleSelectedSaveChange(e.target.value)} style={{ ...styles.select, flex: 1, minWidth: 0 }}>
                    <option value="__new_game__">New game save</option>
                    {saveSlots.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ToolButton onClick={loadNamedSlot}>Load slot</ToolButton>
                </div>

                {editingSaveName ? (
                  <input
                    autoFocus
                    value={saveName}
                    onChange={(e) => handleSaveNameChange(e.target.value)}
                    onBlur={commitSaveNameRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelSaveNameRename();
                      }
                    }}
                    style={styles.saveNameDisplayInput}
                    title="Press Enter or click away to save the name"
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={() => {
                      setSaveName(displayedSaveName);
                      setEditingSaveName(true);
                    }}
                    style={styles.saveNameDisplay}
                    title="Double-click to rename this save"
                  >
                    {displayedSaveName}
                  </button>
                )}

                <div style={styles.sidebarRow}>
                  <ToolButton onClick={saveNamedSlot}>Save slot</ToolButton>
                  <ToolButton onClick={clearBrowserSave}>Clear autosave</ToolButton>
                </div>
                <div style={styles.sidebarRow}>
                  <ToolButton onClick={deleteNamedSlot}>Delete slot</ToolButton>
                </div>
                <div style={styles.storageNote}>
                  {imageReady ? "Map image included in saves" : "No map image loaded"}
                </div>
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 2 }}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("layout")}>
              <span style={styles.sectionTriangle}>{sectionOpen.layout ? "▾" : "▸"}</span>
              <span>Layout</span>
            </button>
            {sectionOpen.layout && (
              <div style={styles.sectionContent}>
                <div style={styles.layoutField}>
                  <span style={styles.markerDetailLabel}>Defender&apos;s Force Disposition</span>
                  <ForceDispositionSelect value={defenderForceDisposition} onChange={setDefenderForceDisposition} label="Defender's Force Disposition" />
                </div>
                <div style={styles.layoutField}>
                  <span style={styles.markerDetailLabel}>Attacker&apos;s Force Disposition</span>
                  <ForceDispositionSelect value={attackerForceDisposition} onChange={setAttackerForceDisposition} label="Attacker's Force Disposition" />
                </div>
                <label style={styles.layoutField}>
                  <span style={styles.markerDetailLabel}>Layout A/B/C</span>
                  <select value={selectedLayoutVariant} onChange={(event) => setSelectedLayoutVariant(event.target.value)} style={styles.fullInput}>
                    {['A', 'B', 'C'].map((variant) => <option key={variant} value={variant}>Layout {variant}</option>)}
                  </select>
                </label>
                <ToolButton active={Boolean(selectedLayoutPreset)} onClick={applySelectedLayout}>
                  {selectedLayoutPreset ? "Apply Layout" : "Layout coming soon"}
                </ToolButton>
                <div style={styles.layoutEditorControls}>
                  <ToolButton onClick={() => addLayoutObjective("home", "circle", "Home objective marker")}>Home objective</ToolButton>
                  <ToolButton onClick={() => addLayoutObjective("enemy", "circle", "Enemy objective marker")}>Enemy objective</ToolButton>
                  <ToolButton onClick={() => addLayoutObjective("neutral", "diamond", "Expansion objective marker")}>Expansion objective</ToolButton>
                  <ToolButton onClick={() => addLayoutObjective("neutral", "circle", "Central objective marker")}>Central objective</ToolButton>
                </div>
                <div style={styles.layoutEditorControls}>
                  <ToolButton active={layoutEditMode} onClick={() => {
                    if (!state.current.layoutTerrain.length) {
                      setStatus("Apply the selected layout before editing its terrain.");
                      return;
                    }
                    setLayoutEditMode((editing) => !editing);
                    setSelectedLayoutTerrainId(null);
                    setSelectedLayoutWallId(null);
                    setSelectedLayoutFeatureId(null);
                    setSelectedLayoutObjectiveId(null);
                    setLayoutLinkMode(false);
                    setFirstLinkedTerrainId(null);
                    setFirstLinkedWallId(null);
                    setFirstLinkedFeatureId(null);
                  }}>{layoutEditMode ? "Finish editing" : "Edit layout"}</ToolButton>
                  <ToolButton active={layoutLinkMode} onClick={beginLayoutTerrainLinking}>Link</ToolButton>
                  <ToolButton onClick={removeLayoutTerrainLinks}>Remove links</ToolButton>
                  <ToolButton onClick={() => rotateSelectedLayoutTerrain(-1)}>Rotate left 1 degree</ToolButton>
                  <ToolButton onClick={() => rotateSelectedLayoutTerrain(1)}>Rotate right 1 degree</ToolButton>
                  <ToolButton onClick={mirrorSelectedLayoutTerrain}>Mirror</ToolButton>
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
                  {Object.entries(LAYOUT_FEATURE_TYPES).map(([type, definition]) => (
                    <ToolButton key={type} onClick={() => addLayoutFeature(type)}>{definition.button}</ToolButton>
                  ))}
                  {Object.keys(LAYOUT_WALL_TYPES).map((type) => (
                    <ToolButton key={type} onClick={() => addLayoutWall(type)}>Add {type} wall</ToolButton>
                  ))}
                  <ToolButton onClick={restorePresetDeploymentLines}>Restore deploy lines</ToolButton>
                  <ToolButton onClick={saveLayoutFixture}>Save Layout Fixture</ToolButton>
                </div>
                <div style={styles.layoutMissionSummary}>
                  <span style={styles.layoutMissionLabel}>Primary Mission</span>
                  <strong>{selectedPrimaryMission}</strong>
                </div>
                <div style={styles.missionCardToggleRow}>
                  <span style={styles.missionCardToggleLabel}>Primary mission cards</span>
                  <ToolButton active={missionCardsVisible} onClick={() => setMissionCardsVisible(true)}>Display</ToolButton>
                  <ToolButton active={!missionCardsVisible} onClick={() => setMissionCardsVisible(false)}>Hide</ToolButton>
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
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 6 }}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("scale")}>
              <span style={styles.sectionTriangle}>{sectionOpen.scale ? "▾" : "▸"}</span>
              <span>Scale, Rulers &amp; Deepstrike</span>
            </button>
            {sectionOpen.scale && (
              <div style={styles.sectionContent}>
                <div style={styles.sidebarRow}>
                  <input type="number" min="0.1" step="0.1" value={scaleInches} onChange={(e) => setScaleInches(Number(e.target.value))} style={styles.smallInput} title="Known distance in inches" />
                  <ToolButton active={mode === "scale"} onClick={() => setMode("scale")}>Set scale</ToolButton>
                </div>
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

          <div style={{ ...styles.sidebarSection, order: 3 }}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("army")}>
              <span style={styles.sectionTriangle}>{sectionOpen.army ? "▾" : "▸"}</span>
              <span>Army List</span>
            </button>
            {sectionOpen.army && (
              <div style={styles.sectionContent}>
                <input
                  value={armyPresetName}
                  onChange={(e) => setArmyPresetName(e.target.value)}
                  style={styles.fullInput}
                  placeholder="Army preset name"
                  title="Name used when saving this army preset"
                />
                <div style={styles.sidebarRow}>
                  <select
                    value={selectedArmyPreset}
                    onChange={(e) => {
                      setSelectedArmyPreset(e.target.value);
                      if (e.target.value) setArmyPresetName(e.target.value);
                    }}
                    style={{ ...styles.select, flex: 1, minWidth: 0 }}
                  >
                    <option value="">Choose army</option>
                    {armyPresetNames.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ToolButton onClick={loadArmyPreset}>Load</ToolButton>
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
                <div style={styles.sidebarRow}>
                  <ToolButton onClick={parseArmyList}>Match units</ToolButton>
                  <ToolButton onClick={createLosMarkersFromArmy}>Create LOS</ToolButton>
                </div>
                <ToolButton onClick={clearArmyGeneratedLosMarkers}>Remove generated LOS</ToolButton>

                {armyResults.length > 0 && (
                  <div style={styles.armyResultList}>
                    {armyResults.map((result) => (
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
                            onClick={() => updateArmyResult(result.id, { accepted: true, editing: false })}
                            style={{ ...styles.iconChoiceButton, background: result.accepted ? "rgba(34,197,94,.35)" : "rgba(255,255,255,.08)" }}
                            title="Base size is correct"
                          >✓</button>
                          <button
                            type="button"
                            onClick={() => updateArmyResult(result.id, { accepted: false, editing: true })}
                            style={{ ...styles.iconChoiceButton, background: result.editing ? "rgba(239,68,68,.35)" : "rgba(255,255,255,.08)" }}
                            title="Correct base size manually"
                          >✕</button>
                          <span style={styles.armyMatchLabel}>{result.matched ? "matched" : "manual"}</span>
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ ...styles.sidebarSection, order: 4 }}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("markers")}>
              <span style={styles.sectionTriangle}>{sectionOpen.markers ? "▾" : "▸"}</span>
              <span>LOS Markers</span>
            </button>
            {sectionOpen.markers && (
              <div style={styles.sectionContent}>
                <ToolButton onClick={addLosMarker}>Add LOS</ToolButton>
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
          <div style={{ ...styles.sidebarSection, order: 5 }}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("units")}>
              <span style={styles.sectionTriangle}>{sectionOpen.units ? "▾" : "▸"}</span>
              <span>Units</span>
            </button>
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

          <div style={{ ...styles.sidebarSection, order: 7 }}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("draw")}>
              <span style={styles.sectionTriangle}>{sectionOpen.draw ? "▾" : "▸"}</span>
              <span>Draw, Deploy & Enemies</span>
            </button>
            {sectionOpen.draw && (
              <div style={styles.sectionContent}>
                <div style={styles.actionPairRow}>
                  <ToolButton active={mode === "block"} onClick={() => setMode("block")}>Draw Footprint (F)</ToolButton>
                  <ToolButton onClick={clearBlockers}>Clear footprints</ToolButton>
                </div>
                <div style={styles.actionPairRow}>
                  <ToolButton active={mode === "wall"} onClick={() => setMode("wall")}>Draw Wall (W)</ToolButton>
                  <ToolButton onClick={clearWalls}>Clear walls</ToolButton>
                </div>
                <div style={styles.actionPairRow}>
                  <ToolButton active={mode === "enemy"} onClick={() => setMode("enemy")}>Add Enemy (E)</ToolButton>
                  <ToolButton onClick={clearEnemies}>Clear enemies</ToolButton>
                </div>
                <DeploymentControlRow
                  label="Draw Home Deploy LOS (D)"
                  active={mode === "deployHome"}
                  visible={state.current.deploymentVisible}
                  hasLine={Boolean(state.current.deploymentLine)}
                  onDraw={() => setMode("deployHome")}
                  onVisibility={(visible) => setDeploymentVisibility("home", visible)}
                  onClear={() => clearDeploymentLOS("home")}
                  rangeInches={homeDeploymentRangeInches}
                  onRangeChange={(value) => setHomeDeploymentRangeInches(value || "unlimited")}
                />
                <DeploymentControlRow
                  label="Draw Enemy Deploy LOS (Q)"
                  active={mode === "deployEnemy"}
                  visible={state.current.enemyDeploymentVisible}
                  hasLine={Boolean(state.current.enemyDeploymentLine)}
                  onDraw={() => setMode("deployEnemy")}
                  onVisibility={(visible) => setDeploymentVisibility("enemy", visible)}
                  onClear={() => clearDeploymentLOS("enemy")}
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
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            style={{ ...styles.sidebarToggle, right: sidebarCollapsed ? -32 : -31 }}
          >{sidebarCollapsed ? "›" : "‹"}</button>
        </div>

        <main style={styles.mainArea}>
          <div style={styles.toolbar}>
            <ToolButton active={mode === "pan"} onClick={() => setMode("pan")}>Pan map (P)</ToolButton>
            <ToolButton active={mode === "erase"} onClick={() => setMode("erase")}>Erase (X)</ToolButton>
            <ToolButton onClick={undo}>Undo (Z)</ToolButton>
          </div>
          <div style={styles.status}>{status}</div>
          <div style={styles.legend}>White = model LOS · Blue = home deployment LOS · Red = enemy deployment LOS · Orange = valid deepstrike area · Green = visible within selected range · Yellow = crossed one footprint wall · Dark = blocked</div>
          <div style={styles.canvasWrap}>
            <canvas ref={canvasRef} style={styles.canvas} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onDoubleClick={handleCanvasDoubleClick} onWheel={handleWheel} />
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
    width: "100%",
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
  sectionTriangle: {
    width: 16,
    display: "inline-block",
    color: "#93c5fd",
    fontSize: 14,
  },
  sectionContent: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
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
    gap: 3,
    padding: "9px 10px",
    borderRadius: 9,
    border: "1px solid rgba(96,165,250,.28)",
    background: "rgba(37,99,235,.14)",
    color: "#f8fafc",
    fontSize: 13,
  },
  layoutMissionLabel: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".05em",
    textTransform: "uppercase",
  },
  missionCardList: {
    display: "grid",
    gap: 8,
  },
  missionCardToggleRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto auto",
    alignItems: "center",
    gap: 5,
  },
  missionCardToggleLabel: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.15,
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
    gridTemplateColumns: "1fr 76px 76px",
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

function ToolButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: active ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,.18)",
        background: active ? "rgba(37,99,235,.35)" : "rgba(255,255,255,.08)",
        color: "white",
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </button>
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

function DeploymentControlRow({ label, active, visible, hasLine, onDraw, onVisibility, onClear, rangeInches, onRangeChange }) {
  return (
    <div style={styles.deploymentControlGroup}>
      <div style={styles.deploymentRow}>
        <button
          type="button"
          onClick={onDraw}
          style={{
            ...styles.deploymentDrawButton,
            border: active ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,.18)",
            background: active ? "rgba(37,99,235,.35)" : "rgba(255,255,255,.08)",
          }}
        >{label}</button>
        <MarkerVisibilityButton
          active={hasLine && visible}
          kind="show"
          label={`Enable ${label.replace("Draw ", "")}`}
          onClick={() => onVisibility(true)}
        />
        <MarkerVisibilityButton
          active={hasLine && !visible}
          kind="hide"
          label={`Disable ${label.replace("Draw ", "")}`}
          onClick={() => onVisibility(false)}
        />
        <button type="button" onClick={onClear} style={styles.compactClearButton}>Clear</button>
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

function getPreparedVisibilityGeometry(blockers, walls, W, H) {
  const key = visibilityGeometryKey(blockers, walls, W, H);
  const cached = visibilityGeometryCache.get(key);
  if (cached) return cached;

  const bounds = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const footprintSegments = getFootprintBoundarySegments(blockers);
  const vertices = [
    ...bounds,
    ...footprintSegments.flatMap((segment) => [segment.a, segment.b]),
    ...walls.flatMap((wall) => [wall.a, wall.b]),
  ];
  const segments = [];
  addSegments(bounds, segments, { type: "bounds" });
  footprintSegments.forEach((segment) => {
    segments.push({
      a: segment.a,
      b: segment.b,
      meta: { type: "footprint", index: segment.index, groupKey: segment.groupKey },
    });
  });
  walls.forEach((wall, index) => segments.push({ a: wall.a, b: wall.b, meta: { type: "wall", index } }));
  const geometry = { bounds, vertices, segments };
  visibilityGeometryCache.set(key, geometry);
  if (visibilityGeometryCache.size > 6) {
    visibilityGeometryCache.delete(visibilityGeometryCache.keys().next().value);
  }
  return geometry;
}

function computeVisibilityByFootprintWallLimit(source, blockers, walls, W, H, allowedFootprintWalls, preparedGeometry = null) {
  if (!source || !W || !H) return [];
  const eps = 0.0001;
  const geometry = preparedGeometry || getPreparedVisibilityGeometry(blockers, walls, W, H);
  const { vertices, segments } = geometry;
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
  angles.forEach((a) => {
    const ray = { x: Math.cos(a), y: Math.sin(a) };
    const intersections = [];
    segments.forEach((s) => {
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

function directEnemyLOSState(enemy, enemyRadius, origins, blockers, walls) {
  if (!origins.length) return "blocked";
  let centerHasOneWallPath = false;
  for (const origin of origins) {
    const state = classifySightSegment(origin, enemy, blockers, walls);
    if (state === "clear") return "clear";
    if (state === "oneWall") centerHasOneWallPath = true;
  }
  if (centerHasOneWallPath) return "oneWall";

  // A base whose centre is blocked can still be visible at its edge. Require a
  // small continuous arc rather than allowing one corner-grazing sample to
  // promote the whole enemy marker.
  const targetSamples = 32;
  for (const origin of origins) {
    const edgeStates = [];
    for (let index = 0; index < targetSamples; index += 1) {
      const angle = index / targetSamples * Math.PI * 2;
      const target = {
        x: enemy.x + Math.cos(angle) * enemyRadius,
        y: enemy.y + Math.sin(angle) * enemyRadius,
      };
      edgeStates.push(classifySightSegment(origin, target, blockers, walls));
    }
    if (hasAdjacentEnemyEdgeSamples(edgeStates, "clear")) return "clear";
    if (hasAdjacentEnemyEdgeSamples(edgeStates, "oneWall")) return "oneWall";
  }
  return "blocked";
}

function hasAdjacentEnemyEdgeSamples(states, targetState) {
  return states.some((state, index) => (
    state === targetState
    && states[(index + 1) % states.length] === targetState
  ));
}

function classifySightSegment(origin, target, blockers, walls) {
  for (const wall of walls) {
    const hit = segmentIntersectionParameters(origin, target, wall.a, wall.b);
    if (hit && hit.t > 0.0001 && hit.t < 0.9999) return "blocked";
  }

  const intersectionsBySurface = new Map();
  blockers.forEach((polygon, index) => {
    intersectionsBySurface.set(footprintSurfaceKey(blockers, index), []);
  });
  getFootprintBoundarySegments(blockers).forEach((segment) => {
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
    const neighboursAgree = maximumNeighbourRadius / minimumNeighbourRadius < 1.35;
    const isolatedFarSpike = radius > maximumNeighbourRadius * 1.8;
    const isolatedNearSpike = radius < minimumNeighbourRadius * 0.55;
    return !(neighboursAgree && (isolatedFarSpike || isolatedNearSpike) && angularGap < 0.003);
  });
  sanitized.source = { ...source };
  return sanitized;
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

  footprintBoundarySegmentCache.set(blockers, segments);
  return segments;
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

function drawBattlefieldGrid(ctx, fit, scale = 1) {
  if (!fit?.w || !fit?.h) return;
  const inch = fit.w / BATTLEFIELD_WIDTH_INCHES;
  ctx.save();
  ctx.beginPath();
  ctx.rect(fit.x, fit.y, fit.w, fit.h);
  ctx.clip();

  for (let x = 0; x <= BATTLEFIELD_WIDTH_INCHES; x++) {
    ctx.beginPath();
    ctx.moveTo(fit.x + x * inch, fit.y);
    ctx.lineTo(fit.x + x * inch, fit.y + fit.h);
    ctx.lineWidth = (x % 5 === 0 ? 1.25 : 0.65) / scale;
    ctx.strokeStyle = x % 5 === 0 ? "rgba(255,255,255,.34)" : "rgba(255,255,255,.14)";
    ctx.stroke();
  }
  for (let y = 0; y <= BATTLEFIELD_HEIGHT_INCHES; y++) {
    ctx.beginPath();
    ctx.moveTo(fit.x, fit.y + y * inch);
    ctx.lineTo(fit.x + fit.w, fit.y + y * inch);
    ctx.lineWidth = (y % 5 === 0 ? 1.25 : 0.65) / scale;
    ctx.strokeStyle = y % 5 === 0 ? "rgba(255,255,255,.34)" : "rgba(255,255,255,.14)";
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
    dense ? "rgba(22,163,74,.95)" : "rgba(244,114,182,.98)",
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

function createCombinedLosLayers(clearZones, oneWallZones, W, H, renderScale = 1, buffers = null) {
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
  const cleanupRadius = renderScale < 1 ? 1 : 2;
  if (clearMask) {
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
  if (oneWallMask) {
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

  reusableBuffers.oneWallColour = colorizeLosMask(
    oneWallMask,
    W,
    H,
    "rgba(245,190,55,.20)",
    reusableBuffers.oneWallColour,
  );
  reusableBuffers.clearColour = colorizeLosMask(
    clearMask,
    W,
    H,
    "rgba(255,255,255,.20)",
    reusableBuffers.clearColour,
  );
  return { clear: reusableBuffers.clearColour, oneWall: reusableBuffers.oneWallColour };
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
    if (radiusRatio > 1.55 && angularGap < 0.025) continue;
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

function deploymentLabelWorldPoint(boardPosition, fit) {
  if (!fit || !Number.isFinite(boardPosition?.x) || !Number.isFinite(boardPosition?.y)) return null;
  return {
    x: fit.x + (boardPosition.x / BATTLEFIELD_WIDTH_INCHES) * fit.w,
    y: fit.y + (boardPosition.y / BATTLEFIELD_HEIGHT_INCHES) * fit.h,
  };
}

function deploymentLineCaptionRect(ctx, label, path, fit, scale = 1, boardPosition = null) {
  if (!fit || !path?.length) return null;
  const customPoint = deploymentLabelWorldPoint(boardPosition, fit);
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
  const inch = fit.w / BATTLEFIELD_WIDTH_INCHES;
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
    if (target.poly) {
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

function drawLosMarkerLabel(ctx, marker, base, scale = 1) {
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

  if (fittedFontSize >= minimumReadableFontSize) {
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

function pointNearPolygon(p, poly, threshold) {
  return dist(p, closestPointOnPolygon(p, poly)) <= threshold;
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
