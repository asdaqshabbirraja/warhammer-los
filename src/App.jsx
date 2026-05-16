import React, { useEffect, useRef, useState } from "react";

export default function InteractiveLOSTool() {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const draggingRef = useRef(false);
  const panningRef = useRef(false);
  const panLastRef = useRef(null);
  const objectDragRef = useRef(null);

  const [mode, setMode] = useState("light");
  const [status, setStatus] = useState("Upload a map image, then drag the LOS point. Draw footprints, walls, and enemies.");
  const [imageReady, setImageReady] = useState(false);
  const [baseShape, setBaseShape] = useState("circle");
  const [baseLengthMm, setBaseLengthMm] = useState(40);
  const [baseWidthMm, setBaseWidthMm] = useState(40);
  const [baseRotation, setBaseRotation] = useState(0);
  const [scaleInches, setScaleInches] = useState(6);
  const [rangeInches, setRangeInches] = useState("unlimited");
  const [pixelsPerInch, setPixelsPerInch] = useState(null);

  const state = useRef({
    W: 900,
    H: 600,
    fit: { x: 0, y: 0, w: 0, h: 0 },
    camera: { scale: 1, x: 0, y: 0 },
    light: { x: 450, y: 300 },
    losSize: 1,
    scaleStart: null,
    scalePreview: null,
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
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    updateVisibility();
    draw();
  }, [mode, imageReady, baseShape, baseLengthMm, baseWidthMm, baseRotation, scaleInches, rangeInches, pixelsPerInch]);

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
        state.current.scaleStart = null;
        state.current.scalePreview = null;
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
    const p = screenToWorld(e);
    const draggable = findDraggableObject(p);
    if (draggable && mode !== "erase" && mode !== "block" && mode !== "wall" && mode !== "scale") {
      objectDragRef.current = draggable;
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      setStatus(draggable.type === "light" ? "Moving LOS point. Release to drop." : "Moving enemy. Release to drop.");
      return;
    }

    if (mode === "pan") {
      panningRef.current = true;
      panLastRef.current = screenPos(e);
      setStatus("Panning map. Release to stop.");
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
    const p = screenToWorld(e);

    if (objectDragRef.current) {
      if (objectDragRef.current.type === "light") {
        state.current.light = p;
        updateVisibility();
      } else if (objectDragRef.current.type === "enemy") {
        state.current.enemies[objectDragRef.current.index] = p;
      }
      draw();
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

    if (mode === "scale" && state.current.scaleStart) {
      state.current.scalePreview = { a: state.current.scaleStart, b: p };
      draw();
    } else if (mode === "light" && draggingRef.current) {
      state.current.light = p;
      updateVisibility();
      draw();
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
        setStatus(`Scale set: ${scaleInches}" = ${Math.round(lengthPx)} px, so 1" = ${ppi.toFixed(1)} px.`);
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

    const base = getBaseRadii(cam.scale);
    const offsetX = p.x - state.current.light.x;
    const offsetY = p.y - state.current.light.y;
    const local = rotatePoint(offsetX, offsetY, -baseRotation);
    const dx = local.x / base.rx;
    const dy = local.y / base.ry;
    if (dx * dx + dy * dy <= 1) {
      return { type: "light" };
    }

    return null;
  }

  function updateHoverCursor(p) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (objectDragRef.current) {
      canvas.style.cursor = "grabbing";
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
      setBaseRotation((current) => current + delta);
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
    if (["l", "p", "f", "w", "e", "x", "z", "+", "=", "-"].includes(key)) e.preventDefault();

    if (key === "l") setMode("light");
    else if (key === "p") setMode("pan");
    else if (key === "f") setMode("block");
    else if (key === "w") setMode("wall");
    else if (key === "e") setMode("enemy");
    else if (key === "x") setMode("erase");
    else if (key === "z") undo();
    else if (key === "+" || key === "=") zoomBy(1.25);
    else if (key === "-") zoomBy(0.8);
    
  }

  function resetZoom() {
    state.current.camera = { scale: 1, x: 0, y: 0 };
    draw();
  }

  function getBaseRadii(cameraScale = 1) {
    if (!pixelsPerInch) {
      const fallback = 15 / cameraScale;
      return { rx: fallback, ry: fallback };
    }
    const pxPerMm = pixelsPerInch / 25.4;
    if (baseShape === "circle") {
      const r = Math.max(1, (Number(baseLengthMm) || 25) * pxPerMm / 2);
      return { rx: r, ry: r };
    }
    return {
      rx: Math.max(1, (Number(baseLengthMm) || 60) * pxPerMm / 2),
      ry: Math.max(1, (Number(baseWidthMm) || 35) * pxPerMm / 2),
    };
  }

  function getLOSOrigins() {
    const { light } = state.current;
    if (!pixelsPerInch) return [light];
    const { rx, ry } = getBaseRadii(1);
    const samples = baseShape === "circle" ? 20 : 28;
    const points = [light];
    for (let i = 0; i < samples; i++) {
      const a = (Math.PI * 2 * i) / samples;
      const localX = Math.cos(a) * rx;
      const localY = Math.sin(a) * ry;
      const rotated = rotatePoint(localX, localY, baseRotation);
      points.push({ x: light.x + rotated.x, y: light.y + rotated.y });
    }
    return points;
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
    const { W, H, fit, camera, light, blockers, walls, enemies, currentPoly, wallPath, wallPreview, visibility, scalePreview } = state.current;
    const clearZones = visibility.clearZones || [];
    const oneWallZones = visibility.oneWallZones || [];
    const clearPoly = clearZones[0] || [];
    const oneWallPoly = oneWallZones[0] || [];
    const rangeRadius = rangeInches === "unlimited" || !pixelsPerInch ? Infinity : Number(rangeInches) * pixelsPerInch;

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

    enemies.forEach((enemy, index) => {
      const losState = enemyLOSState(enemy, visibility);
      const rangeActive = Number.isFinite(rangeRadius);
      const inRange = enemyInRange(enemy, light, rangeRadius);
      drawEnemy(ctx, enemy, losState, inRange, rangeActive, index + 1, camera.scale);
    });

    const base = getBaseRadii(camera.scale);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(light.x, light.y, base.rx, base.ry, baseRotation, 0, Math.PI * 2);
    ctx.fillStyle = "#f5f7fa";
    ctx.fill();
    ctx.lineWidth = 4 / camera.scale;
    ctx.strokeStyle = "#2563eb";
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = `bold ${Math.max(7, 10 / camera.scale)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LOS", light.x, light.y);
    ctx.restore();

    ctx.restore();
  }

  function updateVisibility() {
    const origins = getLOSOrigins();
    const clearZones = origins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 0));
    const oneWallZones = origins.map((origin) => computeVisibilityByFootprintWallLimit(origin, state.current.blockers, state.current.walls, state.current.W, state.current.H, 1));
    state.current.visibility = { clearZones, oneWallZones };
  }

  return (
    <div style={styles.appShell}>
      <div style={styles.toolbar}>
        <button onClick={() => fileRef.current?.click()} style={styles.uploadButton}>Upload map</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadImage} />
        <ToolButton active={mode === "light"} onClick={() => setMode("light")}>Drag LOS (L)</ToolButton>
        <ToolButton active={baseShape === "circle"} onClick={() => { setBaseShape("circle"); setBaseWidthMm(baseLengthMm); }}>○</ToolButton>
        <ToolButton active={baseShape === "oval"} onClick={() => setBaseShape("oval")}>⬭</ToolButton>
        <input
          type="number"
          min="1"
          value={baseLengthMm}
          onChange={(e) => {
            const v = Number(e.target.value);
            setBaseLengthMm(v);
            if (baseShape === "circle") setBaseWidthMm(v);
          }}
          style={styles.baseInput}
          title={baseShape === "circle" ? "Base diameter in mm" : "Base length in mm"}
        />
        <input
          type="number"
          min="1"
          value={baseShape === "circle" ? baseLengthMm : baseWidthMm}
          disabled={baseShape === "circle"}
          onChange={(e) => setBaseWidthMm(Number(e.target.value))}
          style={{ ...styles.baseInput, opacity: baseShape === "circle" ? 0.45 : 1 }}
          title="Base width in mm"
        />
        <ToolButton active={mode === "pan"} onClick={() => setMode("pan")}>Pan map (P)</ToolButton>
        <ToolButton active={mode === "block"} onClick={() => setMode("block")}>Draw footprint (F)</ToolButton>
        <ToolButton active={mode === "wall"} onClick={() => setMode("wall")}>Draw wall (W)</ToolButton>
        <ToolButton active={mode === "enemy"} onClick={() => setMode("enemy")}>Add enemy (E)</ToolButton>
        <select value={scaleInches} onChange={(e) => setScaleInches(Number(e.target.value))} style={styles.select}>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => <option key={n} value={n}>{n}" scale</option>)}
        </select>
        <ToolButton active={mode === "scale"} onClick={() => setMode("scale")}>Set scale</ToolButton>
        <select value={rangeInches} onChange={(e) => setRangeInches(e.target.value)} style={styles.select}>
          <option value="unlimited">Unlimited range</option>
          {[6,9,12,18,24,30,36,48,60].map((n) => <option key={n} value={n}>{n}" range</option>)}
        </select>
        <ToolButton active={mode === "erase"} onClick={() => setMode("erase")}>Erase (X)</ToolButton>
        <span style={styles.label}>Zoom</span>
        <ToolButton onClick={() => zoomBy(0.8)}>−</ToolButton>
        <ToolButton onClick={() => zoomBy(1.25)}>+</ToolButton>
        
        <ToolButton onClick={undo}>Undo (Z)</ToolButton>
        <ToolButton onClick={clearBlockers}>Clear footprints</ToolButton>
        <ToolButton onClick={clearWalls}>Clear walls</ToolButton>
        <ToolButton onClick={clearEnemies}>Clear enemies</ToolButton>
        <ToolButton onClick={resetPoint}>Reset point</ToolButton>
      </div>

      <div style={styles.status}>{status}</div>
      <div style={styles.legend}>White = clear LOS · Green = visible within selected range · Yellow = visible beyond range / crossed one footprint wall · Dark = blocked · Use Pan map after zooming</div>

      <div style={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onDoubleClick={finishWall}
          onWheel={handleWheel}
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
function drawEnemy(ctx, enemy, state, inRange, rangeActive, number, scale = 1) {
  const r = 13 / scale;
  const visible = state === "clear";
  const oneWall = state === "oneWall";
  const blocked = state === "blocked";
  const rangeIsActive = rangeActive;

  ctx.save();
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);

  if (blocked) {
    ctx.fillStyle = "#8b8b8b";
    ctx.fill();
  } else if (!rangeIsActive) {
    // Unlimited range: use original visibility colours.
    ctx.fillStyle = visible ? "#ef4444" : "#f5c542";
    ctx.fill();
  } else if (inRange && visible) {
    // Eligible target with clear LOS and selected range.
    ctx.fillStyle = "#22c55e";
    ctx.fill();
  } else if (inRange && oneWall) {
    // Eligible target, but through one footprint wall / cover.
    ctx.fillStyle = "#22c55e";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#f5c542";
    ctx.fill();
  } else {
    // Visible but outside selected range.
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
function rotatePoint(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}
