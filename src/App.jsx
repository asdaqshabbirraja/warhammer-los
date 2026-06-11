import { useEffect, useRef, useState } from "react";
import BASE_DATABASE from "./baseSizes.json";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    game: true,
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
    deploymentVisibility: { clearZones: [], oneWallZones: [] },
    enemyDeploymentLine: null,
    enemyDeploymentPath: [],
    enemyDeploymentDraft: [],
    enemyDeploymentPreview: null,
    enemyDeploymentVisible: true,
    enemyDeploymentNoMansSide: null,
    enemyDeploymentVisibility: { clearZones: [], oneWallZones: [] },
    blockers: [],
    blockerIds: [],
    walls: [],
    enemies: [],
    currentPoly: [],
    wallPath: [],
    wallPreview: null,
    visibility: { clear: [], oneWall: [] },
    losVisibilityCache: new Map(),
    combinedLosRender: { clear: null, oneWall: null },
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
  }, [mode, activeLosId, activeUnitSlot, losVersion, scaleInches, rangeInches, homeDeploymentRangeInches, enemyDeploymentRangeInches, deepstrikeRangeInches, deepstrikeVisible]);

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
    updateVisibility();
    draw();
  }

  function calculateFit() {
    const img = imgRef.current;
    if (!img) return;
    const { W, H } = state.current;
    const s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    state.current.fit = {
      x: (W - img.naturalWidth * s) / 2,
      y: (H - img.naturalHeight * s) / 2,
      w: img.naturalWidth * s,
      h: img.naturalHeight * s,
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
        state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
        state.current.enemyDeploymentLine = null;
        state.current.enemyDeploymentPath = [];
        state.current.enemyDeploymentDraft = [];
        state.current.enemyDeploymentPreview = null;
        state.current.enemyDeploymentVisible = true;
        state.current.enemyDeploymentNoMansSide = null;
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
      version: 8,
      savedAt: new Date().toISOString(),
      mapStorageKey: null,
      light: getActiveLosPoint(),
      losMarkers: state.current.losMarkers,
      activeLosId,
      camera: state.current.camera,
      blockers: state.current.blockers,
      blockerIds: state.current.blockerIds,
      walls: state.current.walls,
      enemies: state.current.enemies,
      deploymentLine: state.current.deploymentLine,
      deploymentPath: state.current.deploymentPath,
      deploymentVisible: state.current.deploymentVisible,
      deploymentNoMansSide: state.current.deploymentNoMansSide,
      enemyDeploymentLine: state.current.enemyDeploymentLine,
      enemyDeploymentPath: state.current.enemyDeploymentPath,
      enemyDeploymentVisible: state.current.enemyDeploymentVisible,
      enemyDeploymentNoMansSide: state.current.enemyDeploymentNoMansSide,
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
    };
  }

  async function applySaveData(data, message = "Browser save restored.") {
    if (!data) return;
    setActiveUnitSlot(null);

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
    state.current.deploymentLine = data.deploymentLine || null;
    state.current.deploymentPath = Array.isArray(data.deploymentPath) ? data.deploymentPath : (data.deploymentLine ? [data.deploymentLine.a, data.deploymentLine.b] : []);
    state.current.deploymentVisible = data.deploymentVisible !== false;
    state.current.deploymentNoMansSide = data.deploymentNoMansSide === -1 ? -1 : data.deploymentNoMansSide === 1 ? 1 : null;
    state.current.deploymentDraft = [];
    state.current.deploymentPreview = null;
    state.current.enemyDeploymentLine = data.enemyDeploymentLine || null;
    state.current.enemyDeploymentPath = Array.isArray(data.enemyDeploymentPath)
      ? data.enemyDeploymentPath
      : (data.enemyDeploymentLine ? [data.enemyDeploymentLine.a, data.enemyDeploymentLine.b] : []);
    state.current.enemyDeploymentVisible = data.enemyDeploymentVisible !== false;
    state.current.enemyDeploymentNoMansSide = data.enemyDeploymentNoMansSide === -1 ? -1 : data.enemyDeploymentNoMansSide === 1 ? 1 : null;
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
    if (data.pixelsPerInch) setPixelsPerInch(data.pixelsPerInch);

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
    state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
    state.current.enemyDeploymentLine = null;
    state.current.enemyDeploymentPath = [];
    state.current.enemyDeploymentDraft = [];
    state.current.enemyDeploymentPreview = null;
    state.current.enemyDeploymentVisible = true;
    state.current.enemyDeploymentNoMansSide = null;
    state.current.enemyDeploymentVisibility = { clearZones: [], oneWallZones: [] };
    state.current.blockers = [];
    state.current.blockerIds = [];
    state.current.walls = [];
    state.current.enemies = [];
    state.current.currentPoly = [];
    state.current.wallPath = [];
    state.current.wallPreview = null;
    state.current.visibility = { clear: [], oneWall: [] };

    setSelectedSave("");
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
    updateVisibility(activeLosId, false);
    draw();
    scheduleBrowserSave();
    setStatus("New game ready. Upload a map to begin.");
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
    if (visibilityButton && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale" && mode !== "ruler" && mode !== "stickyRuler" && !isDeploymentMode()) {
      updateLosMarkerById(visibilityButton.id, { visible: visibilityButton.visible });
      const marker = state.current.losMarkers.find((m) => m.id === visibilityButton.id);
      setStatus(`${marker?.name || "LOS"} LOS ${visibilityButton.visible ? "shown" : "hidden"}.`);
      return;
    }

    const draggable = findDraggableObject(p);
    if (draggable && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale" && mode !== "ruler" && mode !== "stickyRuler") {
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
        }
        : draggable;
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
    } else if (mode === "block") {
      const poly = state.current.currentPoly;
      if (poly.length >= 3 && dist(p, poly[0]) < 24 / state.current.camera.scale) {
        state.current.blockers.push([...poly]);
        state.current.blockerIds.push(`footprint-${Date.now()}`);
        state.current.currentPoly = [];
        setStatus("Footprint added. White = clear, yellow = one footprint wall crossed, dark = blocked.");
      } else {
        poly.push(p);
        setStatus(`Footprint point ${poly.length}. Tap near the first point to close.`);
      }
      updateVisibility();
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
        clearDeploymentLOS("home");
        setStatus("Home deployment LOS erased.");
        return;
      } else if (enemyDeployHit) {
        clearDeploymentLOS("enemy");
        setStatus("Enemy deployment LOS erased.");
        return;
      } else {
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
        if (now - dragged.lastLosUpdate >= 100) {
          getUnitMembers(dragged.unitSlot).forEach((marker) => {
            if (marker.visible !== false) cacheMarkerVisibility(marker.id, calculateMarkerVisibility(marker, true));
          });
          rebuildCombinedVisibility();
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
      objectDragRef.current = null;
      if (dragged.type === "light") setLosVersion((v) => v + 1);
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
    if (mode === "block") return finishFootprint(e);
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
    } else if (findLosVisibilityButton(p) && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale" && mode !== "stickyRuler" && !isDeploymentMode()) {
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
    if (mode !== "block") return;
    e.preventDefault();

    const poly = state.current.currentPoly;
    if (poly.length < 3) {
      setStatus("Need at least 3 footprint points.");
      return;
    }

    state.current.blockers.push([...poly]);
    state.current.blockerIds.push(`footprint-${Date.now()}`);
    state.current.currentPoly = [];
    updateVisibility();
    setStatus("Footprint added. White = clear, yellow = one footprint wall crossed, dark = blocked.");
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
    } else {
      state.current.deploymentPath = [...path];
      state.current.deploymentLine = { a: path[0], b: path[path.length - 1] };
      state.current.deploymentDraft = [];
      state.current.deploymentPreview = null;
      state.current.deploymentVisible = true;
      state.current.deploymentNoMansSide = null;
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
    const samples = interactive ? (marker.baseShape === "circle" ? 8 : 12) : (marker.baseShape === "circle" ? 20 : 28);
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
      state.current.enemyDeploymentVisibility = { clearZones: [], oneWallZones: [] };
    } else {
      state.current.deploymentLine = null;
      state.current.deploymentPath = [];
      state.current.deploymentDraft = [];
      state.current.deploymentPreview = null;
      state.current.deploymentNoMansSide = null;
      state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
    }
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`${isEnemy ? "Enemy" : "Home"} deployment LOS cleared.`);
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
    const { W, H, fit, camera, blockers, walls, enemies, currentPoly, wallPath, wallPreview, visibility, scalePreview, rulerPreview, rulers, stickyRulers, deploymentLine, deploymentPath, deploymentDraft, deploymentPreview, deploymentVisible, deploymentVisibility, enemyDeploymentLine, enemyDeploymentPath, enemyDeploymentDraft, enemyDeploymentPreview, enemyDeploymentVisible, enemyDeploymentVisibility } = state.current;
    const light = getActiveLosPoint();
    const clearZones = visibility.clearZones || [];
    const oneWallZones = visibility.oneWallZones || [];
    const clearPoly = clearZones[0] || [];
    const oneWallPoly = oneWallZones[0] || [];
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
        if (!enemyInRange(enemy, marker, radius)) return;
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
    if (img) ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
    else {
      ctx.fillStyle = "#2a2a2a";
      roundRect(ctx, 24, 86, W - 48, 205, 18, true, false);
      ctx.fillStyle = "#ddd";
      ctx.font = "600 20px system-ui";
      ctx.fillText("Upload a Tabletop Battles map", 44, 135);
      ctx.fillStyle = "#aaa";
      ctx.font = "15px system-ui";
      ctx.fillText("White = clear LOS.", 44, 166);
      ctx.fillText("Yellow = crossed one footprint wall.", 44, 195);
      ctx.fillText("Dark = blocked by second footprint wall or wall line.", 44, 224);
      ctx.fillText("Use Pan map after zooming to drag the image around.", 44, 253);
    }

    if (oneWallPoly.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.moveTo(oneWallPoly[0].x, oneWallPoly[0].y);
      for (const p of oneWallPoly.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fill("evenodd");
      ctx.restore();
    }

    if (state.current.combinedLosRender.oneWall) ctx.drawImage(state.current.combinedLosRender.oneWall, 0, 0);
    if (state.current.combinedLosRender.clear) ctx.drawImage(state.current.combinedLosRender.clear, 0, 0);

    if (Number.isFinite(rangeRadius)) {
      const rangeMarkers = selectedUnitMembers.length ? selectedUnitMembers : [getActiveLosMarker()].filter(Boolean);
      const activeZones = rangeMarkers.flatMap((marker) => {
        const activeVisibility = state.current.losVisibilityCache.get(marker.id);
        return activeVisibility ? [...activeVisibility.oneWallZones, ...activeVisibility.clearZones] : [];
      });
      drawMultiRangeZoneMask(ctx, activeZones, W, H, rangeMarkers, rangeRadius, "rgba(34,197,94,.18)");

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

    if (deploymentVisible && deploymentLine) {
      const side = state.current.deploymentNoMansSide;
      drawDeploymentZoneMask(ctx, deploymentVisibility.oneWallZones || [], W, H, homeDeployPath, homeDeploymentRangeRadius, side, "rgba(0,76,153,.40)");
      drawDeploymentZoneMask(ctx, deploymentVisibility.clearZones || [], W, H, homeDeployPath, homeDeploymentRangeRadius, side, "rgba(0,76,153,.40)");
    }
    if (enemyDeploymentVisible && enemyDeploymentLine) {
      const side = state.current.enemyDeploymentNoMansSide;
      drawDeploymentZoneMask(ctx, enemyDeploymentVisibility.oneWallZones || [], W, H, enemyDeployPath, enemyDeploymentRangeRadius, side, "rgba(153,20,23,.40)");
      drawDeploymentZoneMask(ctx, enemyDeploymentVisibility.clearZones || [], W, H, enemyDeployPath, enemyDeploymentRangeRadius, side, "rgba(153,20,23,.40)");
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

    // Footprints are drawn after the LOS overlays with a near-solid fill.
    // This masks any small visibility edge/ray artifacts inside footprints.
    // Footprints should not dim valid LOS inside them.
    // First draw a subtle footprint tint, then re-brighten any part of the footprint
    // that lies inside the clear/yellow LOS polygons.
    blockers.forEach((poly) => {
      drawPoly(ctx, poly, "rgba(18,18,18,.38)", "rgba(255,255,255,.22)", true, camera.scale);

      if (oneWallPoly.length) {
        ctx.save();
        clipPoly(ctx, poly);
        clipPoly(ctx, oneWallPoly);
        ctx.fillStyle = "rgba(245, 190, 55, .34)";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      if (clearPoly.length) {
        ctx.save();
        clipPoly(ctx, poly);
        clipPoly(ctx, clearPoly);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(255,255,255,.36)";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    });
    if (scalePreview) drawMeasurementLine(ctx, scalePreview.a, scalePreview.b, `${scaleInches}"`, camera.scale);
    rulers.forEach((ruler) => drawRulerLine(ctx, ruler.a, ruler.b, pixelsPerInch, camera.scale));
    if (rulerPreview) drawRulerLine(ctx, rulerPreview.a, rulerPreview.b, pixelsPerInch, camera.scale, true);
    stickyRulers.forEach((ruler) => {
      const geometry = getStickyRulerGeometry(ruler);
      if (geometry) drawStickyRulerLine(ctx, geometry.a, geometry.b, pixelsPerInch, camera.scale);
    });
    if (currentPoly.length) drawPoly(ctx, currentPoly, "rgba(255,255,255,.10)", "#fff", false, camera.scale);

    walls.forEach((wall) => drawWall(ctx, wall, camera.scale));
    if (wallPath.length) {
      for (let i = 0; i < wallPath.length - 1; i++) {
        drawWall(ctx, { a: wallPath[i], b: wallPath[i + 1] }, camera.scale, true);
      }
      if (wallPreview && dist(wallPath[wallPath.length - 1], wallPreview) > 1) {
        drawWall(ctx, { a: wallPath[wallPath.length - 1], b: wallPreview }, camera.scale, true);
      }
    }

    if (deploymentPath?.length >= 2) drawDeploymentPath(ctx, deploymentPath, camera.scale, deploymentVisible, false, "home");
    else if (deploymentLine) drawDeploymentLine(ctx, deploymentLine, camera.scale, deploymentVisible, false, "home");
    if (deploymentDraft?.length) drawDeploymentPath(ctx, deploymentPreview ? [...deploymentDraft, deploymentPreview] : deploymentDraft, camera.scale, true, true, "home");
    if (enemyDeploymentPath?.length >= 2) drawDeploymentPath(ctx, enemyDeploymentPath, camera.scale, enemyDeploymentVisible, false, "enemy");
    else if (enemyDeploymentLine) drawDeploymentLine(ctx, enemyDeploymentLine, camera.scale, enemyDeploymentVisible, false, "enemy");
    if (enemyDeploymentDraft?.length) drawDeploymentPath(ctx, enemyDeploymentPreview ? [...enemyDeploymentDraft, enemyDeploymentPreview] : enemyDeploymentDraft, camera.scale, true, true, "enemy");
    if (homeDeployPath.length >= 2 && !state.current.deploymentNoMansSide) {
      drawDeploymentSideArrows(ctx, homeDeployPath, camera.scale, "home");
    }
    if (enemyDeployPath.length >= 2 && !state.current.enemyDeploymentNoMansSide) {
      drawDeploymentSideArrows(ctx, enemyDeployPath, camera.scale, "enemy");
    }

    enemies.forEach((enemy, index) => {
      const losState = enemyLOSState(enemy, visibility);
      const rangeActive = Number.isFinite(rangeRadius);
      const inRange = selectedUnitMembers.length
        ? selectedUnitMembers.some((marker) => enemyInRange(enemy, marker, rangeRadius))
        : enemyInRange(enemy, light, rangeRadius);
      drawEnemy(ctx, enemy, losState, inRange, rangeActive, index + 1, camera.scale, enemyRangeCounts[index]);
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

    ctx.restore();
  }

  function calculateMarkerVisibility(marker, interactive = false, forceFullDetail = false) {
    const clearZones = [];
    const oneWallZones = [];
    if (!marker || marker.visible === false) return { clearZones, oneWallZones };
    const visibleMarkerCount = state.current.losMarkers.filter((item) => item.visible !== false).length;
    const useReducedSamples = !forceFullDetail && (interactive || visibleMarkerCount > 5);
    const origins = getLOSOriginsForMarker(marker, useReducedSamples);
    origins.forEach((origin) => {
      clearZones.push(computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 0));
      oneWallZones.push(computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 1));
    });
    return { clearZones, oneWallZones };
  }

  function cacheMarkerVisibility(markerId, visibility) {
    state.current.losVisibilityCache.set(markerId, visibility);
  }

  function rebuildCombinedVisibility() {
    const clearZones = [];
    const oneWallZones = [];
    state.current.losMarkers.forEach((marker) => {
      if (marker.visible === false) return;
      const cached = state.current.losVisibilityCache.get(marker.id);
      if (!cached) return;
      clearZones.push(...cached.clearZones);
      oneWallZones.push(...cached.oneWallZones);
    });
    state.current.visibility = { clearZones, oneWallZones };
    state.current.combinedLosRender = {
      oneWall: createZoneLayer(oneWallZones, state.current.W, state.current.H, "rgba(245, 190, 55, .16)", state.current.combinedLosRender.oneWall),
      clear: createZoneLayer(clearZones, state.current.W, state.current.H, "rgba(255,255,255,.09)", state.current.combinedLosRender.clear),
    };
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

    rebuildCombinedVisibility();
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

  const sortedMarkers = sortedLosMarkers();
  const sortedUnits = Array.from({ length: 20 }, (_, index) => index + 1)
    .map((slot) => ({ slot, members: getUnitMembers(slot) }))
    .filter((unit) => unit.members.length);
  const displayedSaveName = selectedSave || saveName || "Unsaved game";

  return (
    <div style={styles.appShell}>
      <div style={styles.body}>
        <div style={{ ...styles.sidebarShell, width: sidebarCollapsed ? 0 : 270 }}>
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

          <div style={{ ...styles.sidebarSection, order: 5 }}>
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

          <div style={{ ...styles.sidebarSection, order: 2 }}>
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

          <div style={{ ...styles.sidebarSection, order: 3 }}>
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
          <div style={{ ...styles.sidebarSection, order: 4 }}>
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

          <div style={{ ...styles.sidebarSection, order: 6 }}>
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
    width: 270,
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

function computeVisibilityByFootprintWallLimit(source, blockers, walls, W, H, allowedFootprintWalls) {
  if (!source || !W || !H) return [];
  const eps = 0.0001;
  const bounds = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const vertices = [...bounds, ...blockers.flat(), ...walls.flatMap((w) => [w.a, w.b])];
  const angles = [];
  vertices.forEach((v) => {
    const a = Math.atan2(v.y - source.y, v.x - source.x);
    angles.push(a - eps, a, a + eps);
  });

  const containingBlockers = new Set();
  blockers.forEach((poly, index) => {
    if (pointInPoly(source, poly)) containingBlockers.add(index);
  });

  const segments = [];
  addSegments(bounds, segments, { type: "bounds" });
  blockers.forEach((poly, index) => addSegments(poly, segments, { type: "footprint", index }));
  walls.forEach((wall, index) => segments.push({ a: wall.a, b: wall.b, meta: { type: "wall", index } }));

  const hits = [];
  angles.forEach((a) => {
    const ray = { x: Math.cos(a), y: Math.sin(a) };
    const intersections = [];
    segments.forEach((s) => {
      const hit = raySegmentIntersection(source, ray, s.a, s.b);
      if (hit && hit.t > 0.0001) intersections.push({ ...hit, meta: s.meta });
    });

    intersections.sort((p, q) => p.t - q.t);

    let footprintWallsCrossed = 0;
    let chosen = intersections[intersections.length - 1] || null;

    for (const hit of intersections) {
      if (hit.meta.type === "bounds") {
        chosen = hit;
        break;
      }

      if (hit.meta.type === "wall") {
        chosen = hit;
        break;
      }

      if (hit.meta.type === "footprint") {
        if (!containingBlockers.has(hit.meta.index)) footprintWallsCrossed += 1;
        if (footprintWallsCrossed > allowedFootprintWalls) {
          chosen = hit;
          break;
        }
      }
    }

    if (chosen) hits.push({ x: chosen.x, y: chosen.y, angle: a });
  });

  hits.sort((p, q) => p.angle - q.angle);
  return hits.filter((p, i, arr) => i === 0 || dist(p, arr[i - 1]) > 0.3);
}

function enemyLOSState(enemy, visibility) {
  const clearZones = visibility.clearZones || [];
  const oneWallZones = visibility.oneWallZones || [];
  if (clearZones.some((poly) => enemyTouchedByPoly(enemy, poly))) return "clear";
  if (oneWallZones.some((poly) => enemyTouchedByPoly(enemy, poly))) return "oneWall";
  return "blocked";
}

function enemyInRange(enemy, light, rangeRadius) {
  if (!Number.isFinite(rangeRadius)) return true;
  const enemyRadius = 13;
  return dist(enemy, light) <= rangeRadius + enemyRadius;
}

function enemyTouchedByPoly(enemy, poly) {
  if (!poly.length) return false;
  const r = 13;
  const testPoints = [
    enemy,
    { x: enemy.x + r, y: enemy.y },
    { x: enemy.x - r, y: enemy.y },
    { x: enemy.x, y: enemy.y + r },
    { x: enemy.x, y: enemy.y - r },
    { x: enemy.x + r * 0.7, y: enemy.y + r * 0.7 },
    { x: enemy.x - r * 0.7, y: enemy.y + r * 0.7 },
    { x: enemy.x + r * 0.7, y: enemy.y - r * 0.7 },
    { x: enemy.x - r * 0.7, y: enemy.y - r * 0.7 },
  ];
  return testPoints.some((p) => pointInPoly(p, poly));
}

function addSegments(poly, segments, meta) {
  for (let i = 0; i < poly.length; i++) segments.push({ a: poly[i], b: poly[(i + 1) % poly.length], meta });
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
function drawPoly(ctx, poly, fill, stroke, closed, scale = 1) {
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
  poly.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 5 / scale, 0, Math.PI * 2); ctx.fillStyle = stroke; ctx.fill(); });
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

function drawZoneMask(ctx, zones, W, H, fillStyle) {
  const layer = createZoneLayer(zones, W, H, fillStyle);
  if (layer) ctx.drawImage(layer, 0, 0);
}

function createZoneLayer(zones, W, H, fillStyle, reusableCanvas = null) {
  const goodZones = zones.filter((poly) => poly?.length);
  if (!goodZones.length) return null;

  const mask = reusableCanvas || document.createElement("canvas");
  if (mask.width !== W) mask.width = W;
  if (mask.height !== H) mask.height = H;
  const m = mask.getContext("2d");
  m.clearRect(0, 0, W, H);
  m.globalCompositeOperation = "source-over";

  m.fillStyle = "#fff";
  goodZones.forEach((poly) => {
    m.beginPath();
    m.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) m.lineTo(poly[i].x, poly[i].y);
    m.closePath();
    m.fill();
  });

  m.globalCompositeOperation = "source-in";
  m.fillStyle = fillStyle;
  m.fillRect(0, 0, W, H);
  return mask;
}

function drawDeploymentZoneMask(ctx, zones, W, H, path, rangeRadius, towardSide, fillStyle) {
  if (!Number.isFinite(rangeRadius)) {
    drawZoneMask(ctx, zones, W, H, fillStyle);
    return;
  }
  if (!towardSide) {
    drawZoneMask(ctx, zones, W, H, fillStyle);
    return;
  }
  const goodZones = zones.filter((poly) => poly?.length);
  if (!goodZones.length || !Array.isArray(path) || path.length < 2) return;

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
  a.strokeStyle = "#fff";
  a.fillStyle = "#fff";
  a.beginPath();
  a.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) a.lineTo(path[i].x, path[i].y);
  a.lineWidth = rangeRadius * 2;
  a.lineCap = "round";
  a.lineJoin = "round";
  a.stroke();
  if (towardSide) fillDeploymentUnlimitedSide(a, path, -towardSide, W, H);
  m.drawImage(allowed, 0, 0);

  m.globalCompositeOperation = "source-in";
  m.fillStyle = fillStyle;
  m.fillRect(0, 0, W, H);
  ctx.drawImage(mask, 0, 0);
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

function fillDeploymentUnlimitedSide(ctx, path, side, W, H) {
  const mid = pathMidpointAndTangent(path);
  const normal = { x: -mid.tangent.y * side, y: mid.tangent.x * side };
  const distance = Math.max(W, H) * 4;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  for (let i = path.length - 1; i >= 0; i--) ctx.lineTo(path[i].x + normal.x * distance, path[i].y + normal.y * distance);
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

function drawDeploymentPath(ctx, path, scale = 1, visible = true, preview = false, kind = "home") {
  if (!Array.isArray(path) || path.length < 2) return;
  const activeColor = kind === "enemy" ? "rgb(153,20,23)" : "#38bdf8";
  const previewColor = kind === "enemy" ? "rgba(153,20,23,.70)" : "rgba(125,211,252,.7)";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.lineWidth = 5 / scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = visible ? (preview ? previewColor : activeColor) : "rgba(148,163,184,.7)";
  if (!visible) ctx.setLineDash([8 / scale, 6 / scale]);
  ctx.stroke();

  ctx.fillStyle = visible ? activeColor : "#94a3b8";
  for (const p of path) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 / scale, 0, Math.PI * 2);
    ctx.fill();
  }

  const endpoints = [path[0], path[path.length - 1]];
  const bottomEndpoint = endpoints[0].y >= endpoints[1].y ? endpoints[0] : endpoints[1];
  drawMapCaption(ctx, kind === "enemy" ? "ENEMY DEPLOY LOS" : "HOME DEPLOY LOS", bottomEndpoint.x, bottomEndpoint.y + 15 / scale, scale);
  ctx.restore();
}

function drawDeploymentLine(ctx, line, scale = 1, visible = true, preview = false, kind = "home") {
  if (!line?.a || !line?.b) return;
  const activeColor = kind === "enemy" ? "rgb(153,20,23)" : "#38bdf8";
  const previewColor = kind === "enemy" ? "rgba(153,20,23,.70)" : "rgba(125,211,252,.7)";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(line.a.x, line.a.y);
  ctx.lineTo(line.b.x, line.b.y);
  ctx.lineWidth = 5 / scale;
  ctx.lineCap = "round";
  ctx.strokeStyle = visible ? (preview ? previewColor : activeColor) : "rgba(148,163,184,.7)";
  if (!visible) ctx.setLineDash([8 / scale, 6 / scale]);
  ctx.stroke();
  const bottomEndpoint = line.a.y >= line.b.y ? line.a : line.b;
  drawMapCaption(ctx, kind === "enemy" ? "ENEMY DEPLOY LOS" : "HOME DEPLOY LOS", bottomEndpoint.x, bottomEndpoint.y + 15 / scale, scale);
  ctx.restore();
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

function drawEnemy(ctx, enemy, state, inRange, rangeActive, number, scale = 1, rangeCount = 0) {
  const r = 13 / scale;
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
