import React, { useEffect, useRef, useState } from "react";

export default function InteractiveLOSTool() {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const draggingRef = useRef(false);
  const panningRef = useRef(false);
  const panLastRef = useRef(null);

  const [mode, setMode] = useState("light");
  const [status, setStatus] = useState("Upload a map image, then drag the LOS point. Draw footprints, walls, and enemies.");
  const [imageReady, setImageReady] = useState(false);
  const [losSize, setLosSize] = useState(1);

  const state = useRef({
    W: 900,
    H: 600,
    fit: { x: 0, y: 0, w: 0, h: 0 },
    camera: { scale: 1, x: 0, y: 0 },
    light: { x: 450, y: 300 },
    losSize: 1,
    blockers: [],
    walls: [],
    enemies: [],
    currentPoly: [],
    wallPath: [],
    wallPreview: null,
    visibility: { clear: [], oneWall: [] },
  });

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => draw(), [mode, imageReady, losSize]);

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
    state.current.light = { x: state.current.W / 2, y: state.current.H / 2 };
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
        state.current.blockers = [];
        state.current.walls = [];
        state.current.enemies = [];
        state.current.currentPoly = [];
        state.current.wallPath = [];
        state.current.wallPreview = null;
        state.current.camera = { scale: 1, x: 0, y: 0 };
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
    if (mode === "pan") {
      panningRef.current = true;
      panLastRef.current = screenPos(e);
      setStatus("Panning map. Release to stop.");
      return;
    }

    const p = screenToWorld(e);
    if (mode === "light") {
      draggingRef.current = true;
      state.current.light = p;
      updateVisibility();
      draw();
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
    } else if (mode === "wall") {
      const path = state.current.wallPath;
      path.push(p);
      state.current.wallPreview = p;
      setStatus(path.length === 1 ? "Wall started. Click to add corners; double-click to finish." : `Wall corner ${path.length} placed. Click to change direction, double-click to finish.`);
      updateVisibility();
      draw();
    } else if (mode === "enemy") {
      state.current.enemies.push(p);
      setStatus("Enemy added. Red = clear, yellow = through one footprint wall, grey = blocked.");
      draw();
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
    }
  }

  function pointerMove(e) {
    if (mode === "pan" && panningRef.current) {
      const now = screenPos(e);
      const last = panLastRef.current || now;
      state.current.camera.x += now.x - last.x;
      state.current.camera.y += now.y - last.y;
      panLastRef.current = now;
      draw();
      return;
    }

    const p = screenToWorld(e);
    if (mode === "light" && draggingRef.current) {
      state.current.light = p;
      updateVisibility();
      draw();
    } else if (mode === "wall" && state.current.wallPath.length) {
      state.current.wallPreview = p;
      draw();
    }
  }

  function pointerUp() {
    draggingRef.current = false;
    panningRef.current = false;
    panLastRef.current = null;
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

  function zoomBy(factor) {
    const cam = state.current.camera;
    const { W, H } = state.current;
    const centre = { x: W / 2, y: H / 2 };
    const before = { x: (centre.x - cam.x) / cam.scale, y: (centre.y - cam.y) / cam.scale };
    const nextScale = Math.max(0.6, Math.min(4, cam.scale * factor));
    cam.scale = nextScale;
    cam.x = centre.x - before.x * nextScale;
    cam.y = centre.y - before.y * nextScale;
    draw();
  }

  function resetZoom() {
    state.current.camera = { scale: 1, x: 0, y: 0 };
    draw();
  }

  function setLOSSize(multiplier) {
    state.current.losSize = multiplier;
    setLosSize(multiplier);
    setStatus(`LOS circle size set to ${Math.round(multiplier * 100)}%.`);
    draw();
  }

  function adjustLOSSize(direction) {
    const sizes = [0.25, 0.5, 0.75, 1, 1.5];
    const current = state.current.losSize;
    const index = sizes.findIndex((s) => s === current);
    const safeIndex = index >= 0 ? index : 3;
    const nextIndex = Math.max(0, Math.min(sizes.length - 1, safeIndex + direction));
    setLOSSize(sizes[nextIndex]);
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
  }

  function clearBlockers() {
    state.current.blockers = [];
    state.current.currentPoly = [];
    updateVisibility();
    setStatus("Footprints cleared.");
    draw();
  }

  function clearWalls() {
    state.current.walls = [];
    state.current.wallPath = [];
    state.current.wallPreview = null;
    updateVisibility();
    setStatus("Walls cleared.");
    draw();
  }

  function clearEnemies() {
    state.current.enemies = [];
    setStatus("Enemies cleared.");
    draw();
  }

  function resetPoint() {
    state.current.light = { x: state.current.W / 2, y: state.current.H / 2 };
    updateVisibility();
    draw();
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { W, H, fit, camera, light, losSize, blockers, walls, enemies, currentPoly, wallPath, wallPreview, visibility } = state.current;
    const clearPoly = visibility.clear || [];
    const oneWallPoly = visibility.oneWall || [];

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
      ctx.fillStyle = "rgba(0,0,0,.60)";
      ctx.fill("evenodd");
      ctx.restore();
    }

    if (oneWallPoly.length) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(oneWallPoly[0].x, oneWallPoly[0].y);
      for (const p of oneWallPoly.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "rgba(245, 190, 55, .30)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(oneWallPoly[0].x, oneWallPoly[0].y);
      for (const p of oneWallPoly.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.strokeStyle = "rgba(245, 190, 55, .55)";
      ctx.lineWidth = 2 / camera.scale;
      ctx.stroke();
    }

    if (clearPoly.length) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(clearPoly[0].x, clearPoly[0].y);
      for (const p of clearPoly.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.clip();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255,255,255,.30)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(clearPoly[0].x, clearPoly[0].y);
      for (const p of clearPoly.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,.50)";
      ctx.lineWidth = 2 / camera.scale;
      ctx.stroke();
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
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(255,255,255,.36)";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
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

    enemies.forEach((enemy, index) => drawEnemy(ctx, enemy, enemyLOSState(enemy, visibility), index + 1, camera.scale));

    const losRadius = (15 * losSize) / camera.scale;
    ctx.beginPath();
    ctx.arc(light.x, light.y, losRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#f5f7fa";
    ctx.fill();
    ctx.lineWidth = 4 / camera.scale;
    ctx.strokeStyle = "#2563eb";
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = `bold ${Math.max(7, (10 * losSize) / camera.scale)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LOS", light.x, light.y);

    ctx.restore();
  }

  function updateVisibility() {
    state.current.visibility = computeVisibilityZones(state.current.light, state.current.blockers, state.current.walls, state.current.W, state.current.H);
  }

  return (
    <div style={styles.appShell}>
      <div style={styles.toolbar}>
        <button onClick={() => fileRef.current?.click()} style={styles.uploadButton}>Upload map</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadImage} />
        <ToolButton active={mode === "light"} onClick={() => setMode("light")}>Drag LOS point</ToolButton>
        <ToolButton active={mode === "pan"} onClick={() => setMode("pan")}>Pan map</ToolButton>
        <ToolButton active={mode === "block"} onClick={() => setMode("block")}>Draw footprint</ToolButton>
        <ToolButton active={mode === "wall"} onClick={() => setMode("wall")}>Draw wall</ToolButton>
        <ToolButton active={mode === "enemy"} onClick={() => setMode("enemy")}>Add enemy</ToolButton>
        <ToolButton active={mode === "erase"} onClick={() => setMode("erase")}>Erase</ToolButton>
        <span style={styles.label}>Zoom</span>
        <ToolButton onClick={() => zoomBy(0.8)}>−</ToolButton>
        <ToolButton onClick={() => zoomBy(1.25)}>+</ToolButton>
        <span style={styles.label}>LOS {Math.round(losSize * 100)}%</span>
        <ToolButton onClick={() => adjustLOSSize(-1)}>−</ToolButton>
        <ToolButton onClick={() => adjustLOSSize(1)}>+</ToolButton>
        <ToolButton onClick={undo}>Undo</ToolButton>
        <ToolButton onClick={clearBlockers}>Clear footprints</ToolButton>
        <ToolButton onClick={clearWalls}>Clear walls</ToolButton>
        <ToolButton onClick={clearEnemies}>Clear enemies</ToolButton>
        <ToolButton onClick={resetPoint}>Reset point</ToolButton>
      </div>

      <div style={styles.status}>{status}</div>
      <div style={styles.legend}>White = clear LOS · Yellow = crossed one footprint wall · Dark = second footprint wall or wall line · Use Pan map after zooming</div>

      <div style={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onDoubleClick={finishWall}
        />
      </div>
    </div>
  );
}

const styles = {
  appShell: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#111",
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 6,
    background: "rgba(0,0,0,.92)",
    borderBottom: "1px solid rgba(255,255,255,.10)",
    overflowX: "auto",
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
  const clear = visibility.clear || [];
  const oneWall = visibility.oneWall || [];
  if (enemyTouchedByPoly(enemy, clear)) return "clear";
  if (enemyTouchedByPoly(enemy, oneWall)) return "oneWall";
  return "blocked";
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
function clipPoly(ctx, poly) {
  if (!poly.length) return;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.clip();
}
function drawWall(ctx, wall, scale = 1, preview = false) {
  if (!wall?.a || !wall?.b) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wall.a.x, wall.a.y);
  ctx.lineTo(wall.b.x, wall.b.y);
  ctx.strokeStyle = preview ? "rgba(196,181,253,.65)" : "#a855f7";
  ctx.lineWidth = 7 / scale;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wall.a.x, wall.a.y);
  ctx.lineTo(wall.b.x, wall.b.y);
  ctx.strokeStyle = "rgba(255,255,255,.45)";
  ctx.lineWidth = 2 / scale;
  ctx.stroke();
  ctx.restore();
}
function drawEnemy(ctx, enemy, state, number, scale = 1) {
  const r = 13 / scale;
  const visible = state === "clear";
  const oneWall = state === "oneWall";
  ctx.save();
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
  ctx.fillStyle = visible ? "#ef4444" : oneWall ? "#f5c542" : "#8b8b8b";
  ctx.fill();
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = visible || oneWall ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.45)";
  ctx.stroke();
  ctx.fillStyle = visible ? "#fff" : "#222";
  ctx.font = `bold ${Math.max(8, 10 / scale)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), enemy.x, enemy.y);
  ctx.restore();
}
function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
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
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (fill) ctx.fill(); if (stroke) ctx.stroke();
}
function cross(a, b) { return a.x * b.y - a.y * b.x; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
