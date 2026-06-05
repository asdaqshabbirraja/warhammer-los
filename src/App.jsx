import React, { useEffect, useRef, useState } from "react";

export default function InteractiveLOSTool() {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const draggingRef = useRef(false);
  const panningRef = useRef(false);
  const panLastRef = useRef(null);
  const objectDragRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [mode, setMode] = useState("pan");
  const [status, setStatus] = useState("Upload a map image, then drag the LOS point. Draw footprints, walls, and enemies.");
  const [imageReady, setImageReady] = useState(false);
  const [baseShape, setBaseShape] = useState("circle");
  const [baseLengthMm, setBaseLengthMm] = useState(40);
  const [baseWidthMm, setBaseWidthMm] = useState(40);
  const [baseRotation, setBaseRotation] = useState(0);
  const [scaleInches, setScaleInches] = useState(6);
  const [rangeInches, setRangeInches] = useState("unlimited");
  const [pixelsPerInch, setPixelsPerInch] = useState(null);
  const [saveName, setSaveName] = useState("Game 1");
  const [saveSlots, setSaveSlots] = useState([]);
  const [selectedSave, setSelectedSave] = useState("");
  const [activeLosId, setActiveLosId] = useState("los-1");
  const [losName, setLosName] = useState("LOS");
  const [losVersion, setLosVersion] = useState(0);
  const [editingSaveName, setEditingSaveName] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    game: true,
    scale: true,
    range: true,
    markers: true,
    base: true,
  });

  const state = useRef({
    W: 900,
    H: 600,
    fit: { x: 0, y: 0, w: 0, h: 0 },
    camera: { scale: 1, x: 0, y: 0 },
    light: { x: 450, y: 300 },
    losMarkers: [
      {
        id: "los-1",
        name: "LOS",
        x: 450,
        y: 300,
        baseShape: "circle",
        baseLengthMm: 40,
        baseWidthMm: 40,
        baseRotation: 0,
        visible: true,
      },
    ],
    losSize: 1,
    scaleStart: null,
    scalePreview: null,
    deploymentLine: null,
    deploymentPath: [],
    deploymentDraft: [],
    deploymentPreview: null,
    deploymentVisible: true,
    deploymentVisibility: { clearZones: [], oneWallZones: [] },
    blockers: [],
    walls: [],
    enemies: [],
    currentPoly: [],
    wallPath: [],
    wallPreview: null,
    visibility: { clear: [], oneWall: [] },
  });

  useEffect(() => {
    refreshSaveSlots();
    loadBrowserSave();
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const marker = getActiveLosMarker();
    if (!marker) return;
    setLosName(marker.name || "LOS");
    setBaseShape(marker.baseShape || "circle");
    setBaseLengthMm(marker.baseLengthMm || 40);
    setBaseWidthMm(marker.baseWidthMm || marker.baseLengthMm || 40);
    setBaseRotation(marker.baseRotation || 0);
    state.current.light = { x: marker.x, y: marker.y };
    updateVisibility();
    draw();
  }, [activeLosId, losVersion]);

  useEffect(() => {
    updateVisibility();
    draw();
    scheduleBrowserSave();
  }, [mode, imageReady, baseShape, baseLengthMm, baseWidthMm, baseRotation, activeLosId, losVersion, scaleInches, rangeInches, pixelsPerInch]);

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
        const defaultLos = createLosMarker("los-1", "LOS", state.current.W / 2, state.current.H / 2);
        state.current.losMarkers = [defaultLos];
        state.current.light = { x: defaultLos.x, y: defaultLos.y };
        setActiveLosId(defaultLos.id);
        setLosName(defaultLos.name);
        setBaseShape(defaultLos.baseShape);
        setBaseLengthMm(defaultLos.baseLengthMm);
        setBaseWidthMm(defaultLos.baseWidthMm);
        setBaseRotation(defaultLos.baseRotation);
        setLosVersion((v) => v + 1);
        state.current.scaleStart = null;
        state.current.scalePreview = null;
        state.current.deploymentLine = null;
        state.current.deploymentPath = [];
        state.current.deploymentDraft = [];
        state.current.deploymentPreview = null;
        state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
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
      version: 1,
      savedAt: new Date().toISOString(),
      savedImageSrc: state.current.savedImageSrc || null,
      light: getActiveLosPoint(),
      losMarkers: state.current.losMarkers,
      activeLosId,
      camera: state.current.camera,
      blockers: state.current.blockers,
      walls: state.current.walls,
      enemies: state.current.enemies,
      deploymentLine: state.current.deploymentLine,
      deploymentPath: state.current.deploymentPath,
      deploymentVisible: state.current.deploymentVisible,
      baseShape,
      baseLengthMm,
      baseWidthMm,
      baseRotation,
      scaleInches,
      rangeInches,
      pixelsPerInch,
    };
  }

  function applySaveData(data, message = "Browser save restored.") {
    if (!data) return;

    if (Array.isArray(data.losMarkers) && data.losMarkers.length) {
      state.current.losMarkers = data.losMarkers.map((marker, index) => normalizeLosMarker(marker, index));
      const nextActive = data.activeLosId && state.current.losMarkers.some((m) => m.id === data.activeLosId)
        ? data.activeLosId
        : state.current.losMarkers[0].id;
      setActiveLosId(nextActive);
      const active = state.current.losMarkers.find((m) => m.id === nextActive) || state.current.losMarkers[0];
      state.current.light = { x: active.x, y: active.y };
      setLosName(active.name);
      setBaseShape(active.baseShape);
      setBaseLengthMm(active.baseLengthMm);
      setBaseWidthMm(active.baseWidthMm);
      setBaseRotation(active.baseRotation);
      setLosVersion((v) => v + 1);
    } else if (data.light) {
      const legacy = createLosMarker("los-1", "LOS", data.light.x, data.light.y);
      legacy.baseShape = data.baseShape || "circle";
      legacy.baseLengthMm = data.baseLengthMm || 40;
      legacy.baseWidthMm = data.baseWidthMm || legacy.baseLengthMm;
      legacy.baseRotation = data.baseRotation || 0;
      state.current.losMarkers = [legacy];
      state.current.light = { x: legacy.x, y: legacy.y };
      setActiveLosId(legacy.id);
      setLosName(legacy.name);
      setLosVersion((v) => v + 1);
    }
    if (data.camera) state.current.camera = data.camera;
    if (Array.isArray(data.blockers)) state.current.blockers = data.blockers;
    if (Array.isArray(data.walls)) state.current.walls = data.walls;
    if (Array.isArray(data.enemies)) state.current.enemies = data.enemies;
    state.current.deploymentLine = data.deploymentLine || null;
    state.current.deploymentPath = Array.isArray(data.deploymentPath) ? data.deploymentPath : (data.deploymentLine ? [data.deploymentLine.a, data.deploymentLine.b] : []);
    state.current.deploymentVisible = data.deploymentVisible !== false;
    state.current.deploymentDraft = [];
    state.current.deploymentPreview = null;

    if (data.baseShape) setBaseShape(data.baseShape);
    if (data.baseLengthMm) setBaseLengthMm(data.baseLengthMm);
    if (data.baseWidthMm) setBaseWidthMm(data.baseWidthMm);
    if (typeof data.baseRotation === "number") setBaseRotation(data.baseRotation);
    if (data.scaleInches) setScaleInches(data.scaleInches);
    if (data.rangeInches) setRangeInches(data.rangeInches);
    if (data.pixelsPerInch) setPixelsPerInch(data.pixelsPerInch);

    if (data.savedImageSrc) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        state.current.savedImageSrc = data.savedImageSrc;
        calculateFit();
        updateVisibility();
        setImageReady(true);
        setStatus(message);
        draw();
      };
      img.src = data.savedImageSrc;
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

  function saveBrowserState() {
    try {
      localStorage.setItem("warhammer-los-save", JSON.stringify(buildSaveData()));
    } catch (err) {
      console.warn("Autosave failed", err);
    }
  }

  function loadBrowserSave() {
    try {
      const raw = localStorage.getItem("warhammer-los-save");
      if (!raw) return;
      applySaveData(JSON.parse(raw), "Browser autosave restored.");
    } catch (err) {
      console.warn("Load save failed", err);
    }
  }

  function clearBrowserSave() {
    localStorage.removeItem("warhammer-los-save");
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

  function saveNamedSlot() {
    const name = saveName.trim();
    if (!name) {
      setStatus("Enter a save name first.");
      return;
    }

    try {
      localStorage.setItem(`warhammer-los-slot:${name}`, JSON.stringify(buildSaveData()));
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

  function loadNamedSlot() {
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
      applySaveData(JSON.parse(raw), `Loaded slot: ${selectedSave}`);
      setSaveName(selectedSave);
    } catch (err) {
      console.warn("Load slot failed", err);
      setStatus("Could not load that save slot.");
    }
  }

  function deleteNamedSlot() {
    if (!selectedSave) {
      setStatus("Choose a save slot to delete.");
      return;
    }

    localStorage.removeItem(`warhammer-los-slot:${selectedSave}`);
    const next = saveSlots.filter((name) => name !== selectedSave);
    localStorage.setItem("warhammer-los-slots-index", JSON.stringify(next));
    setSaveSlots(next);
    setSelectedSave(next[0] || "");
    setSaveName(next[0] || "Game 1");
    setStatus(`Deleted slot: ${selectedSave}`);
  }

  function handleSelectedSaveChange(value) {
    setSelectedSave(value);
    if (value) setSaveName(value);
  }

  function handleSaveNameChange(value) {
    setSaveName(value);
  }

  function commitSaveNameRename() {
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

    try {
      const oldKey = `warhammer-los-slot:${selectedSave}`;
      const newKey = `warhammer-los-slot:${nextName}`;
      const existing = localStorage.getItem(oldKey);
      const data = existing ? JSON.parse(existing) : buildSaveData();
      data.savedAt = new Date().toISOString();
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
      visible: true,
    };
  }

  function normalizeLosMarker(marker, index = 0) {
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
      visible: marker.visible !== false,
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

    setLosVersion((v) => v + 1);
    updateVisibility();
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
      state.current.light = { x: marker.x, y: marker.y };
    }
    setLosVersion((v) => v + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
  }

  function renameLosMarker(id, name) {
    updateLosMarkerById(id, { name });
  }

  function sortedLosMarkers() {
    return [...state.current.losMarkers].sort((a, b) => (a.name || "LOS").localeCompare(b.name || "LOS"));
  }

  function selectLosMarker(id) {
    const marker = state.current.losMarkers.find((m) => m.id === id);
    if (!marker) return;
    setActiveLosId(id);
    setLosName(marker.name);
    setBaseShape(marker.baseShape);
    setBaseLengthMm(marker.baseLengthMm);
    setBaseWidthMm(marker.baseWidthMm);
    setBaseRotation(marker.baseRotation);
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
    state.current.losMarkers.push(marker);
    setActiveLosId(id);
    setLosName(marker.name);
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
    if (state.current.losMarkers.length <= 1) {
      setStatus("You need at least one LOS marker.");
      return;
    }
    const old = getActiveLosMarker();
    state.current.losMarkers = state.current.losMarkers.filter((marker) => marker.id !== activeLosId);
    const next = state.current.losMarkers[0];
    setActiveLosId(next.id);
    setLosName(next.name);
    setBaseShape(next.baseShape);
    setBaseLengthMm(next.baseLengthMm);
    setBaseWidthMm(next.baseWidthMm);
    setBaseRotation(next.baseRotation);
    state.current.light = { x: next.x, y: next.y };
    setLosVersion((v) => v + 1);
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`Deleted ${old?.name || "LOS marker"}.`);
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

  function pointerDown(e) {
    const p = screenToWorld(e);

    const visibilityButton = findLosVisibilityButton(p);
    if (visibilityButton && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale" && mode !== "deploy") {
      updateLosMarkerById(visibilityButton.id, { visible: visibilityButton.visible });
      const marker = state.current.losMarkers.find((m) => m.id === visibilityButton.id);
      setStatus(`${marker?.name || "LOS"} LOS ${visibilityButton.visible ? "shown" : "hidden"}.`);
      return;
    }

    const draggable = findDraggableObject(p);
    if (draggable && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale") {
      if (draggable.type === "light") selectLosMarker(draggable.id);
      objectDragRef.current = draggable;
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      const active = draggable.type === "light" ? state.current.losMarkers.find((m) => m.id === draggable.id) : null;
      setStatus(draggable.type === "light" ? `Moving ${active?.name || "LOS marker"}. Release to drop.` : "Moving enemy. Release to drop.");
      return;
    }

    if (mode === "pan") {
      panningRef.current = true;
      panLastRef.current = screenPos(e);
      setStatus("Panning map. Release to stop.");
      return;
    }

    if (mode === "deploy") {
      state.current.deploymentDraft.push(p);
      state.current.deploymentPreview = p;
      setStatus(state.current.deploymentDraft.length === 1
        ? "Deployment LOS started. Click to add bends/corners; double-click to finish."
        : `Deployment LOS point ${state.current.deploymentDraft.length} added. Double-click to finish.`);
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

    if (mode === "light") {
      draggingRef.current = true;
      updateActiveLosMarker({ x: p.x, y: p.y });
    } else if (mode === "block") {
      const poly = state.current.currentPoly;
      if (poly.length >= 3 && dist(p, poly[0]) < 24 / state.current.camera.scale) {
        state.current.blockers.push([...poly]);
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
      state.current.enemies.push(p);
      setStatus("Enemy added. Red = clear, yellow = through one footprint wall, grey = blocked.");
      draw();
      scheduleBrowserSave();
    } else if (mode === "erase") {
      const enemyIndex = state.current.enemies.findIndex((enemy) => dist(p, enemy) < 18 / state.current.camera.scale);
      if (enemyIndex >= 0) {
        state.current.enemies.splice(enemyIndex, 1);
        setStatus("Enemy erased.");
      } else {
        const wallIndex = state.current.walls.findIndex((wall) => pointNearSegment(p, wall.a, wall.b, 12 / state.current.camera.scale));
        if (wallIndex >= 0) {
          state.current.walls.splice(wallIndex, 1);
          setStatus("Wall erased.");
        } else {
          const blockerIndex = state.current.blockers.findIndex((poly) => pointInPoly(p, poly));
          if (blockerIndex >= 0) {
            state.current.blockers.splice(blockerIndex, 1);
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
      if (objectDragRef.current.type === "light") {
        const markerIndex = state.current.losMarkers.findIndex((marker) => marker.id === objectDragRef.current.id);
        if (markerIndex >= 0) {
          state.current.losMarkers[markerIndex] = { ...state.current.losMarkers[markerIndex], x: p.x, y: p.y };
          if (state.current.losMarkers[markerIndex].id === activeLosId) state.current.light = { x: p.x, y: p.y };
          updateVisibility();
          setLosVersion((v) => v + 1);
        }
      } else if (objectDragRef.current.type === "enemy") {
        state.current.enemies[objectDragRef.current.index] = p;
      }
      draw();
      scheduleBrowserSave();
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

    if (mode === "deploy" && state.current.deploymentDraft.length) {
      state.current.deploymentPreview = p;
      draw();
    } else if (mode === "scale" && state.current.scaleStart) {
      state.current.scalePreview = { a: state.current.scaleStart, b: p };
      draw();
    } else if (mode === "light" && draggingRef.current) {
      updateActiveLosMarker({ x: p.x, y: p.y });
    } else if (mode === "wall" && state.current.wallPath.length) {
      state.current.wallPreview = p;
      draw();
    }
  }

  function pointerUp() {
    if (objectDragRef.current) {
      objectDragRef.current = null;
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

    draggingRef.current = false;
    panningRef.current = false;
    panLastRef.current = null;
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
    } else if (findLosVisibilityButton(p) && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale" && mode !== "deploy") {
      canvas.style.cursor = "pointer";
    } else if (findDraggableObject(p) && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale") {
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
    state.current.currentPoly = [];
    updateVisibility();
    setStatus("Footprint added. White = clear, yellow = one footprint wall crossed, dark = blocked.");
    draw();
    scheduleBrowserSave();
  }


  function finishDeploymentLOS(e) {
    if (mode !== "deploy") return;
    e.preventDefault();

    const path = state.current.deploymentDraft;
    if (path.length < 2) {
      state.current.deploymentDraft = [];
      state.current.deploymentPreview = null;
      setStatus("Deployment LOS cancelled. Need at least 2 points.");
      draw();
      return;
    }

    state.current.deploymentPath = [...path];
    state.current.deploymentLine = { a: path[0], b: path[path.length - 1] };
    state.current.deploymentDraft = [];
    state.current.deploymentPreview = null;
    state.current.deploymentVisible = true;
    updateVisibility();
    setStatus("Deployment LOS path set. Blue overlay shows visibility from the whole deployment line.");
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
    if (["l", "p", "f", "w", "e", "x", "z", "d", "+", "=", "-"].includes(key)) e.preventDefault();

    if (key === "p") setMode("pan");
    else if (key === "f") setMode("block");
    else if (key === "w") setMode("wall");
    else if (key === "e") setMode("enemy");
    else if (key === "d") setMode("deploy");
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

  function getLOSOriginsForMarker(marker) {
    if (!marker) return [];
    const center = { x: marker.x, y: marker.y };
    if (!pixelsPerInch) return [center];

    const { rx, ry } = getBaseRadii(1, marker);
    const samples = marker.baseShape === "circle" ? 20 : 28;
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
    if (state.current.wallPath.length) {
      state.current.wallPath = [];
      state.current.wallPreview = null;
    } else if (state.current.currentPoly.length) state.current.currentPoly.pop();
    else if (state.current.enemies.length) state.current.enemies.pop();
    else if (state.current.walls.length) state.current.walls.pop();
    else state.current.blockers.pop();
    updateVisibility();
    draw();
    scheduleBrowserSave();
  }

  function clearBlockers() {
    state.current.blockers = [];
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
    setStatus("Enemies cleared.");
    draw();
    scheduleBrowserSave();
  }

  function toggleDeploymentLOS() {
    if (!state.current.deploymentLine) {
      setStatus("Draw a deployment LOS line first.");
      return;
    }
    state.current.deploymentVisible = !state.current.deploymentVisible;
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus(`Deployment LOS ${state.current.deploymentVisible ? "shown" : "hidden"}.`);
  }

  function clearDeploymentLOS() {
    state.current.deploymentLine = null;
    state.current.deploymentPath = [];
    state.current.deploymentDraft = [];
    state.current.deploymentPreview = null;
    state.current.deploymentVisibility = { clearZones: [], oneWallZones: [] };
    updateVisibility();
    draw();
    scheduleBrowserSave();
    setStatus("Deployment LOS cleared.");
  }

  function resetPoint() {
    updateActiveLosMarker({ x: state.current.W / 2, y: state.current.H / 2 });
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { W, H, fit, camera, blockers, walls, enemies, currentPoly, wallPath, wallPreview, visibility, scalePreview, deploymentLine, deploymentPath, deploymentDraft, deploymentPreview, deploymentVisible, deploymentVisibility } = state.current;
    const light = getActiveLosPoint();
    const clearZones = visibility.clearZones || [];
    const oneWallZones = visibility.oneWallZones || [];
    const clearPoly = clearZones[0] || [];
    const oneWallPoly = oneWallZones[0] || [];
    const numericRange = Number(rangeInches);
    const rangeRadius = !pixelsPerInch || !numericRange || numericRange <= 0 ? Infinity : numericRange * pixelsPerInch;

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

    drawZoneMask(ctx, oneWallZones, W, H, "rgba(245, 190, 55, .16)");
    drawZoneMask(ctx, clearZones, W, H, "rgba(255,255,255,.09)");

    if (Number.isFinite(rangeRadius)) {
      drawRangeZoneMask(ctx, [...oneWallZones, ...clearZones], W, H, light, rangeRadius, "rgba(34,197,94,.18)");

      ctx.save();
      ctx.setLineDash([8 / camera.scale, 8 / camera.scale]);
      ctx.lineWidth = 2 / camera.scale;
      ctx.strokeStyle = "rgba(34,197,94,.90)";
      ctx.beginPath();
      ctx.arc(light.x, light.y, rangeRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (deploymentVisible && deploymentLine) {
      drawZoneMask(ctx, deploymentVisibility.oneWallZones || [], W, H, "rgba(0,76,153,.40)");
      drawZoneMask(ctx, deploymentVisibility.clearZones || [], W, H, "rgba(0,76,153,.40)");
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

    if (deploymentPath?.length >= 2) drawDeploymentPath(ctx, deploymentPath, camera.scale, deploymentVisible);
    else if (deploymentLine) drawDeploymentLine(ctx, deploymentLine, camera.scale, deploymentVisible);
    if (deploymentDraft?.length) drawDeploymentPath(ctx, deploymentPreview ? [...deploymentDraft, deploymentPreview] : deploymentDraft, camera.scale, true, true);

    enemies.forEach((enemy, index) => {
      const losState = enemyLOSState(enemy, visibility);
      const rangeActive = Number.isFinite(rangeRadius);
      const inRange = enemyInRange(enemy, light, rangeRadius);
      drawEnemy(ctx, enemy, losState, inRange, rangeActive, index + 1, camera.scale);
    });

    state.current.losMarkers.forEach((marker) => {
      const base = getBaseRadii(camera.scale, marker);
      const isActive = marker.id === activeLosId;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(marker.x, marker.y, base.rx, base.ry, marker.baseRotation || 0, 0, Math.PI * 2);
      ctx.fillStyle = marker.visible ? "#f5f7fa" : "rgba(245,247,250,.45)";
      ctx.fill();
      ctx.lineWidth = isActive ? 5 / camera.scale : 4 / camera.scale;
      ctx.strokeStyle = isActive ? "#22c55e" : marker.visible ? "#2563eb" : "#64748b";
      if (!marker.visible) ctx.setLineDash([6 / camera.scale, 5 / camera.scale]);
      ctx.stroke();

      ctx.fillStyle = "#111";
      ctx.font = `bold ${Math.max(7, 10 / camera.scale)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(marker.name || "LOS", marker.x, marker.y);

      if (isActive) {
        ctx.setLineDash([]);
        const iconY = marker.y - base.ry - 18 / camera.scale;
        const showX = marker.x - 15 / camera.scale;
        const hideX = marker.x + 15 / camera.scale;
        const iconR = 11 / camera.scale;

        ctx.beginPath();
        ctx.arc(showX, iconY, iconR, 0, Math.PI * 2);
        ctx.fillStyle = marker.visible ? "rgba(34,197,94,.95)" : "rgba(71,85,105,.95)";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${11 / camera.scale}px system-ui`;
        ctx.fillText("👁", showX, iconY);

        ctx.beginPath();
        ctx.arc(hideX, iconY, iconR, 0, Math.PI * 2);
        ctx.fillStyle = marker.visible ? "rgba(220,38,38,.95)" : "rgba(239,68,68,.95)";
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

    ctx.restore();
  }

  function updateVisibility() {
    const visibleMarkers = state.current.losMarkers.filter((marker) => marker.visible !== false);
    const clearZones = [];
    const oneWallZones = [];

    visibleMarkers.forEach((marker) => {
      const origins = getLOSOriginsForMarker(marker);
      origins.forEach((origin) => {
        clearZones.push(computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 0));
        oneWallZones.push(computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 1));
      });
    });

    state.current.visibility = { clearZones, oneWallZones };

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
  }

  const sortedMarkers = sortedLosMarkers();
  const displayedSaveName = selectedSave || saveName || "Unsaved game";

  return (
    <div style={styles.appShell}>
      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <button onClick={() => fileRef.current?.click()} style={styles.uploadButton}>Upload map</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadImage} />

          <div style={styles.sidebarSection}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("game")}>
              <span style={styles.sectionTriangle}>{sectionOpen.game ? "▾" : "▸"}</span>
              <span>Game Save</span>
            </button>
            {sectionOpen.game && (
              <div style={styles.sectionContent}>
                <div style={styles.sidebarRow}>
                  <select value={selectedSave} onChange={(e) => handleSelectedSaveChange(e.target.value)} style={{ ...styles.select, flex: 1, minWidth: 0 }}>
                    <option value="">Choose save</option>
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
                      if (e.key === "Enter") commitSaveNameRename();
                      if (e.key === "Escape") cancelSaveNameRename();
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
              </div>
            )}
          </div>

          <div style={styles.sidebarSection}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("scale")}>
              <span style={styles.sectionTriangle}>{sectionOpen.scale ? "▾" : "▸"}</span>
              <span>Scale</span>
            </button>
            {sectionOpen.scale && (
              <div style={styles.sectionContent}>
                <div style={styles.sidebarRow}>
                  <input type="number" min="0.1" step="0.1" value={scaleInches} onChange={(e) => setScaleInches(Number(e.target.value))} style={styles.smallInput} title="Known distance in inches" />
                  <ToolButton active={mode === "scale"} onClick={() => setMode("scale")}>Set scale</ToolButton>
                </div>
              </div>
            )}
          </div>

          <div style={styles.sidebarSection}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("range")}>
              <span style={styles.sectionTriangle}>{sectionOpen.range ? "▾" : "▸"}</span>
              <span>Range</span>
            </button>
            {sectionOpen.range && (
              <div style={styles.sectionContent}>
                <input type="number" min="0" step="1" value={rangeInches === "unlimited" ? "" : rangeInches} onChange={(e) => setRangeInches(e.target.value)} style={styles.fullInput} placeholder="0/blank = unlimited" title="Weapon range in inches; blank or 0 means unlimited" />
              </div>
            )}
          </div>

          <div style={styles.sidebarSection}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("markers")}>
              <span style={styles.sectionTriangle}>{sectionOpen.markers ? "▾" : "▸"}</span>
              <span>LOS Markers</span>
            </button>
            {sectionOpen.markers && (
              <div style={styles.sectionContent}>
                <ToolButton onClick={addLosMarker}>Add LOS</ToolButton>
                <div style={styles.markerList}>
                  {sortedMarkers.map((marker) => (
                    <div key={marker.id} style={{ ...styles.markerItem, borderColor: marker.id === activeLosId ? "#22c55e" : "rgba(255,255,255,.12)", background: marker.id === activeLosId ? "rgba(34,197,94,.14)" : "rgba(255,255,255,.05)" }} onClick={() => selectLosMarker(marker.id)}>
                      <input value={marker.name || "LOS"} onFocus={() => selectLosMarker(marker.id)} onChange={(e) => renameLosMarker(marker.id, e.target.value)} style={styles.markerNameInput} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.sidebarSection}>
            <button type="button" style={styles.sectionHeader} onClick={() => toggleSidebarSection("base")}>
              <span style={styles.sectionTriangle}>{sectionOpen.base ? "▾" : "▸"}</span>
              <span>Selected Base</span>
            </button>
            {sectionOpen.base && (
              <div style={styles.sectionContent}>
                <div style={styles.sidebarRow}>
                  <ToolButton active={baseShape === "circle"} onClick={() => updateActiveLosMarker({ baseShape: "circle", baseWidthMm: baseLengthMm })}>○</ToolButton>
                  <ToolButton active={baseShape === "oval"} onClick={() => updateActiveLosMarker({ baseShape: "oval" })}>⬭</ToolButton>
                  <ToolButton onClick={deleteActiveLosMarker}>Delete</ToolButton>
                </div>
                <div style={styles.sidebarRow}>
                  <input type="number" min="1" value={baseLengthMm} onChange={(e) => { const v = Number(e.target.value); updateActiveLosMarker(baseShape === "circle" ? { baseLengthMm: v, baseWidthMm: v } : { baseLengthMm: v }); }} style={styles.smallInput} title={baseShape === "circle" ? "Base diameter in mm" : "Base length in mm"} />
                  <input type="number" min="1" value={baseShape === "circle" ? baseLengthMm : baseWidthMm} disabled={baseShape === "circle"} onChange={(e) => updateActiveLosMarker({ baseWidthMm: Number(e.target.value) })} style={{ ...styles.smallInput, opacity: baseShape === "circle" ? 0.45 : 1 }} title="Base width in mm" />
                </div>
              </div>
            )}
          </div>
        </aside>

        <main style={styles.mainArea}>
          <div style={styles.toolbar}>
            <ToolButton active={mode === "pan"} onClick={() => setMode("pan")}>Pan map (P)</ToolButton>
            <ToolButton active={mode === "block"} onClick={() => setMode("block")}>Draw footprint (F)</ToolButton>
            <ToolButton active={mode === "wall"} onClick={() => setMode("wall")}>Draw wall (W)</ToolButton>
            <ToolButton active={mode === "enemy"} onClick={() => setMode("enemy")}>Add enemy (E)</ToolButton>
            <ToolButton active={mode === "deploy"} onClick={() => setMode("deploy")}>Draw deploy LOS (D)</ToolButton>
            <ToolButton onClick={toggleDeploymentLOS}>{state.current.deploymentVisible ? "👁 Deploy" : "⊘ Deploy"}</ToolButton>
            <ToolButton onClick={clearDeploymentLOS}>Clear deploy LOS</ToolButton>
            <ToolButton active={mode === "erase"} onClick={() => setMode("erase")}>Erase (X)</ToolButton>
            <ToolButton onClick={undo}>Undo (Z)</ToolButton>
            <ToolButton onClick={clearBlockers}>Clear footprints</ToolButton>
            <ToolButton onClick={clearWalls}>Clear walls</ToolButton>
            <ToolButton onClick={clearEnemies}>Clear enemies</ToolButton>
          </div>
          <div style={styles.status}>{status}</div>
          <div style={styles.legend}>White = model LOS · Blue = deployment line LOS · Green = visible within selected range · Yellow = crossed one footprint wall · Dark = blocked</div>
          <div style={styles.canvasWrap}>
            <canvas ref={canvasRef} style={styles.canvas} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onDoubleClick={mode === "wall" ? finishWall : mode === "deploy" ? finishDeploymentLOS : finishFootprint} onWheel={handleWheel} />
          </div>
        </main>
      </div>
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
  sidebar: {
    width: 270,
    flexShrink: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: 10,
    background: "rgba(0,0,0,.94)",
    borderRight: "1px solid rgba(255,255,255,.12)",
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
    alignItems: "center",
    gap: 6,
    padding: 6,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 10,
    cursor: "pointer",
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
  visibilityMiniButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(255,255,255,.08)",
    color: "white",
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
  const goodZones = zones.filter((poly) => poly?.length);
  if (!goodZones.length) return;

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

  m.globalCompositeOperation = "source-in";
  m.fillStyle = fillStyle;
  m.fillRect(0, 0, W, H);
  ctx.drawImage(mask, 0, 0);
}

function drawRangeZoneMask(ctx, zones, W, H, light, rangeRadius, fillStyle) {
  const goodZones = zones.filter((poly) => poly?.length);
  if (!goodZones.length || !Number.isFinite(rangeRadius)) return;

  const mask = document.createElement("canvas");
  mask.width = W;
  mask.height = H;
  const m = mask.getContext("2d");

  m.save();
  m.beginPath();
  m.arc(light.x, light.y, rangeRadius, 0, Math.PI * 2);
  m.clip();
  m.fillStyle = "#fff";
  goodZones.forEach((poly) => {
    m.beginPath();
    m.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) m.lineTo(poly[i].x, poly[i].y);
    m.closePath();
    m.fill();
  });
  m.restore();

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

function drawDeploymentPath(ctx, path, scale = 1, visible = true, preview = false) {
  if (!Array.isArray(path) || path.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.lineWidth = 5 / scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = visible ? (preview ? "rgba(125,211,252,.7)" : "#38bdf8") : "rgba(148,163,184,.7)";
  if (!visible) ctx.setLineDash([8 / scale, 6 / scale]);
  ctx.stroke();

  ctx.fillStyle = visible ? "#38bdf8" : "#94a3b8";
  for (const p of path) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 / scale, 0, Math.PI * 2);
    ctx.fill();
  }

  const mid = path[Math.floor(path.length / 2)];
  ctx.font = `bold ${12 / scale}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("DEPLOY LOS", mid.x, mid.y - 8 / scale);
  ctx.restore();
}

function drawDeploymentLine(ctx, line, scale = 1, visible = true, preview = false) {
  if (!line?.a || !line?.b) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(line.a.x, line.a.y);
  ctx.lineTo(line.b.x, line.b.y);
  ctx.lineWidth = 5 / scale;
  ctx.lineCap = "round";
  ctx.strokeStyle = visible ? (preview ? "rgba(125,211,252,.7)" : "#38bdf8") : "rgba(148,163,184,.7)";
  if (!visible) ctx.setLineDash([8 / scale, 6 / scale]);
  ctx.stroke();
  ctx.fillStyle = visible ? "#38bdf8" : "#94a3b8";
  ctx.font = `bold ${12 / scale}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("DEPLOY LOS", (line.a.x + line.b.x) / 2, (line.a.y + line.b.y) / 2 - 8 / scale);
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

function drawEnemy(ctx, enemy, state, inRange, rangeActive, number, scale = 1) {
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