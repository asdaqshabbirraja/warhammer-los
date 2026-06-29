const visibilityGeometryCache = new Map();
const footprintBoundarySegmentCache = new WeakMap();
const VISIBILITY_GRID_CELL_SIZE = 96;
const VISIBILITY_ANGLE_SNAP = 0.000025;
const VISIBILITY_ISOLATED_RAY_ANGLE = 0.012;
const LOS_WORKER_DIAGNOSTICS = false;
const LOS_WORKER_SLOW_ENEMY_MS = 20;
const LOS_WORKER_SLOW_MARKER_MS = 40;
const VISIBILITY_RAY_YIELD_INTERVAL = 48;
const VISIBILITY_ORIGIN_BUDGET_MS = 220;
const VISIBILITY_MARKER_BUDGET_MS = 900;
const ENEMY_CLASSIFY_YIELD_INTERVAL = 64;
let currentScene = null;
let latestVisibilityJobId = 0;
let latestEnemyJobId = 0;
let visibilityCancelToken = 0;
let enemyCancelToken = 0;

function workerNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function logWorkerPerf(label, startedAt, details = "") {
  if (!LOS_WORKER_DIAGNOSTICS) return;
  const elapsed = workerNow() - startedAt;
  console.info(`[LOS worker] ${label} ${elapsed.toFixed(1)}ms${details ? ` ${details}` : ""}`);
}

self.onmessage = async (event) => {
  const message = event.data || {};
  const messageStartedAt = workerNow();
  if (message.type === "cancelVisibility") {
    visibilityCancelToken += 1;
    return;
  }
  if (message.type === "cancelEnemyLos") {
    enemyCancelToken += 1;
    return;
  }
  if (message.type === "setScene") {
    try {
      visibilityCancelToken += 1;
      setCurrentScene(message);
      logWorkerPerf("setScene", messageStartedAt, `scene=${message.sceneKey} blockers=${message.blockers?.length || 0} walls=${message.walls?.length || 0}`);
      self.postMessage({ type: "sceneReady", sceneKey: message.sceneKey });
    } catch (error) {
      self.postMessage({
        type: "sceneError",
        sceneKey: message.sceneKey,
        message: error?.message || "LOS scene setup failed",
      });
    }
    return;
  }
  if (message.type === "enemyLos") {
    const jobId = ++latestEnemyJobId;
    const cancelToken = enemyCancelToken;
    latestVisibilityJobId += 1;
    visibilityCancelToken += 1;
    try {
      const states = await calculateEnemyLosStates(
        message,
        () => jobId !== latestEnemyJobId || cancelToken !== enemyCancelToken,
        message.progressive
          ? (states) => {
              if (jobId !== latestEnemyJobId) return;
              self.postMessage({
                type: "enemyLosResult",
                requestId: message.requestId,
                sceneKey: message.sceneKey,
                cacheKey: message.cacheKey,
                states,
                partial: true,
              });
            }
          : null,
      );
      if (jobId !== latestEnemyJobId) return;
      logWorkerPerf("enemyLos", messageStartedAt, `scene=${message.sceneKey} enemies=${message.enemies?.length || 0} markers=${message.markers?.length || 0}`);
      self.postMessage({
        type: "enemyLosResult",
        requestId: message.requestId,
        sceneKey: message.sceneKey,
        cacheKey: message.cacheKey,
        states,
      });
    } catch (error) {
      self.postMessage({
        type: "enemyLosError",
        requestId: message.requestId,
        sceneKey: message.sceneKey,
        message: error?.message || "Enemy LOS worker failed",
      });
    }
    return;
  }
  if (message.type !== "markerVisibility" && message.type !== "markerVisibilityBatch") return;
  const jobId = message.jobGroupId || message.requestId || ++latestVisibilityJobId;
  latestVisibilityJobId = jobId;
  const visibilityToken = visibilityCancelToken;
  try {
    const markers = message.type === "markerVisibilityBatch"
      ? (message.markers || [])
      : [message.marker].filter(Boolean);
    if (currentScene?.sceneKey && currentScene.sceneKey !== message.sceneKey) {
      if (LOS_WORKER_DIAGNOSTICS) console.info(`[LOS worker] stale marker request dropped scene=${message.sceneKey} current=${currentScene.sceneKey}`);
      return;
    }
    const results = await calculateMarkerVisibilityBatch({
      ...message,
      markers,
      isStale: () => (
        jobId !== latestVisibilityJobId
        || visibilityToken !== visibilityCancelToken
        || currentScene?.sceneKey !== message.sceneKey
      ),
      onOriginResult: message.progressive
        ? (result) => {
            if (jobId !== latestVisibilityJobId) return;
            self.postMessage({
              type: message.type === "markerVisibilityBatch" ? "markerVisibilityBatchResult" : "markerVisibilityResult",
              requestId: message.requestId,
              sceneKey: message.sceneKey,
              markerId: result.markerId,
              visibility: result.visibility,
              results: [result],
              partial: true,
            });
          }
        : null,
      onResult: message.progressive
        ? (result) => {
            if (jobId !== latestVisibilityJobId) return;
            self.postMessage({
              type: message.type === "markerVisibilityBatch" ? "markerVisibilityBatchResult" : "markerVisibilityResult",
              requestId: message.requestId,
              sceneKey: message.sceneKey,
              markerId: result.markerId,
              visibility: result.visibility,
              results: [result],
              partial: false,
            });
          }
        : null,
    });
    if (jobId !== latestVisibilityJobId) return;
    logWorkerPerf(message.type, messageStartedAt, `scene=${message.sceneKey} markers=${markers.length} progressive=${!!message.progressive}`);
    if (message.progressive) return;
    if (message.type === "markerVisibilityBatch") {
      self.postMessage({
        type: "markerVisibilityBatchResult",
        requestId: message.requestId,
        sceneKey: message.sceneKey,
        results,
      });
      return;
    }
    self.postMessage({
      type: "markerVisibilityResult",
      requestId: message.requestId,
      markerId: message.marker?.id,
      sceneKey: message.sceneKey,
      visibility: results[0]?.visibility || { clearZones: [], oneWallZones: [] },
    });
  } catch (error) {
    self.postMessage({
      type: message.type === "markerVisibilityBatch" ? "markerVisibilityBatchError" : "markerVisibilityError",
      requestId: message.requestId,
      markerId: message.marker?.id,
      message: error?.message || "LOS worker failed",
    });
  }
};

function setCurrentScene({ sceneKey, blockers = [], walls = [], W, H }) {
  const normalizedBlockers = normalizeBlockers(blockers);
  const normalizedWalls = normalizeWalls(walls);
  const visibilityGeometry = getPreparedVisibilityGeometry(normalizedBlockers, normalizedWalls, W, H);
  currentScene = {
    sceneKey,
    blockers: normalizedBlockers,
    walls: normalizedWalls,
    W,
    H,
    visibilityGeometry,
    markerVisibilityCache: new Map(),
    enemyPairCache: new Map(),
  };
}

function enemyPairCacheKey(marker, enemy, pixelsPerInch, interactive) {
  const rounded = (value, scale = 10) => Math.round((Number(value) || 0) * scale) / scale;
  return [
    interactive ? "interactive" : "settled",
    rounded(pixelsPerInch, 100),
    marker?.id || "",
    rounded(marker?.x),
    rounded(marker?.y),
    marker?.baseShape || "circle",
    marker?.baseLengthMm || 40,
    marker?.baseWidthMm || marker?.baseLengthMm || 40,
    rounded(marker?.baseRotation, 1000),
    rounded(enemy?.x),
    rounded(enemy?.y),
  ].join(":");
}

function sceneForMessage(message) {
  if (currentScene?.sceneKey === message.sceneKey) {
    if (LOS_WORKER_DIAGNOSTICS) console.info(`[LOS worker] scene reused scene=${message.sceneKey}`);
    return currentScene;
  }
  const hasScenePayload = Array.isArray(message.blockers) || Array.isArray(message.walls);
  if (!hasScenePayload) {
    if (LOS_WORKER_DIAGNOSTICS) console.info(`[LOS worker] stale scene dropped scene=${message.sceneKey} current=${currentScene?.sceneKey || "none"}`);
    return null;
  }
  const startedAt = workerNow();
  setCurrentScene(message);
  logWorkerPerf("scene fallback rebuild", startedAt, `scene=${message.sceneKey} blockers=${message.blockers?.length || 0} walls=${message.walls?.length || 0}`);
  return currentScene;
}

async function calculateEnemyLosStates(message, isStale = () => false, onPartialStates = null) {
  const { enemies = [], markers = [], pixelsPerInch, interactive = false, previewStates = [], candidateEnemyIndexes = null } = message;
  const startedAt = workerNow();
  const scene = sceneForMessage(message);
  if (!scene) return enemies.map((_, index) => previewStates[index] || "blocked");
  const { blockers: normalizedBlockers, walls, visibilityGeometry } = scene;
  const visibleMarkers = markers.filter((marker) => marker && marker.visible !== false);
  const markerSources = visibleMarkers.map((marker) => ({
    marker,
    sourceSurfaceKeys: markerTouchedFootprintSurfaceKeys(marker, pixelsPerInch, normalizedBlockers),
  }));
  const radius = enemyBaseRadius(pixelsPerInch);
  const states = enemies.map((_, index) => previewStates[index] || "blocked");
  const indexes = (Array.isArray(candidateEnemyIndexes)
    ? candidateEnemyIndexes.filter((index) => index >= 0 && index < enemies.length)
    : enemies.map((_, index) => index))
    .sort((leftIndex, rightIndex) => {
      const statePriority = (state) => state === "clear" ? 0 : state === "oneWall" ? 1 : 2;
      const stateDelta = statePriority(states[leftIndex]) - statePriority(states[rightIndex]);
      if (stateDelta) return stateDelta;
      const nearestMarkerDistance = (enemyIndex) => markerSources.reduce((nearest, { marker }) => (
        Math.min(nearest, (marker.x - enemies[enemyIndex].x) ** 2 + (marker.y - enemies[enemyIndex].y) ** 2)
      ), Infinity);
      return nearestMarkerDistance(leftIndex) - nearestMarkerDistance(rightIndex);
    });
  const diagnostics = {
    candidates: indexes.length,
    enemies: enemies.length,
    visibleMarkers: visibleMarkers.length,
    totalOrigins: 0,
    totalClassifyCalls: 0,
    slowEnemies: [],
  };
  for (let index = 0; index < indexes.length; index += 1) {
    if (isStale()) break;
    const enemyIndex = indexes[index];
    const enemy = enemies[enemyIndex];
    const enemyStartedAt = workerNow();
    const originsStartedAt = workerNow();
    const enemyDiagnostics = {
      enemyIndex,
      origins: 0,
      originsMs: 0,
      centerCalls: 0,
      edgeCalls: 0,
      centerMs: 0,
      edgeMs: 0,
    };
    let resolvedState = "blocked";
    for (const { marker, sourceSurfaceKeys } of markerSources) {
      if (isStale()) break;
      const pairKey = enemyPairCacheKey(marker, enemy, pixelsPerInch, interactive);
      let pairState = scene.enemyPairCache.get(pairKey);
      if (!pairState) {
        const pairOriginsStartedAt = workerNow();
        const origins = getLOSOriginsForMarker(marker, pixelsPerInch, interactive, enemy)
          .map((origin) => ({ ...origin, sourceSurfaceKeys }));
        enemyDiagnostics.origins += origins.length;
        enemyDiagnostics.originsMs += workerNow() - pairOriginsStartedAt;
        pairState = await directEnemyLOSState(
          enemy,
          radius,
          origins,
          normalizedBlockers,
          walls,
          interactive,
          visibilityGeometry,
          enemyDiagnostics,
          isStale,
        );
        if (!isStale()) {
          scene.enemyPairCache.set(pairKey, pairState);
          if (scene.enemyPairCache.size > 12000) {
            scene.enemyPairCache.delete(scene.enemyPairCache.keys().next().value);
          }
        }
      }
      if (pairState === "clear") {
        resolvedState = "clear";
        break;
      }
      if (pairState === "oneWall") resolvedState = "oneWall";
    }
    states[enemyIndex] = resolvedState;
    if (isStale()) break;
    const originsMs = workerNow() - originsStartedAt;
    enemyDiagnostics.originsMs = Math.min(enemyDiagnostics.originsMs, originsMs);
    const enemyMs = workerNow() - enemyStartedAt;
    diagnostics.totalOrigins += enemyDiagnostics.origins;
    diagnostics.totalClassifyCalls += enemyDiagnostics.centerCalls + enemyDiagnostics.edgeCalls;
    if (enemyMs >= LOS_WORKER_SLOW_ENEMY_MS) {
      diagnostics.slowEnemies.push({
        enemyIndex,
        ms: Number(enemyMs.toFixed(1)),
        origins: enemyDiagnostics.origins,
        originsMs: Number(originsMs.toFixed(1)),
        centerMs: Number(enemyDiagnostics.centerMs.toFixed(1)),
        edgeMs: Number(enemyDiagnostics.edgeMs.toFixed(1)),
        calls: enemyDiagnostics.centerCalls + enemyDiagnostics.edgeCalls,
        state: states[enemyIndex],
      });
    }
    if (onPartialStates) onPartialStates(states.slice());
    if (index < indexes.length - 1) await yieldToWorkerEventLoop();
  }
  if (LOS_WORKER_DIAGNOSTICS) {
    const elapsed = workerNow() - startedAt;
    const slowDetails = diagnostics.slowEnemies.length
      ? ` slow=${JSON.stringify(diagnostics.slowEnemies.slice(0, 4))}`
      : "";
    console.info(
      `[LOS worker detail] enemyLosBreakdown ${elapsed.toFixed(1)}ms `
      + `scene=${message.sceneKey} candidates=${diagnostics.candidates}/${diagnostics.enemies} `
      + `visibleMarkers=${diagnostics.visibleMarkers} origins=${diagnostics.totalOrigins} `
      + `classifyCalls=${diagnostics.totalClassifyCalls}${slowDetails}`,
    );
  }
  return states;
}

function yieldToWorkerEventLoop() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function calculateMarkerVisibilityBatch({ markers = [], pixelsPerInch, reducedOrigins = false, originMode = null, onResult = null, onOriginResult = null, isStale = () => false, ...message }) {
  const scene = sceneForMessage(message);
  if (!scene) return [];
  const { blockers: normalizedBlockers, walls, W, H, visibilityGeometry } = scene;
  const results = [];
  const slowMarkers = [];
  for (let index = 0; index < markers.length; index += 1) {
    if (isStale()) break;
    const marker = markers[index];
    const markerStartedAt = workerNow();
    const cacheKey = markerVisibilityResultKey(marker, pixelsPerInch, reducedOrigins, originMode, Boolean(message.interactive), Boolean(message.clearOnly));
    let visibility = scene.markerVisibilityCache.get(cacheKey) || null;
    if (!visibility) {
      visibility = await calculateMarkerVisibility(
        marker,
        normalizedBlockers,
        walls,
        W,
        H,
        pixelsPerInch,
        visibilityGeometry,
        reducedOrigins,
        originMode,
        Boolean(message.interactive),
        Boolean(message.clearOnly),
        onOriginResult
          ? (partialVisibility) => onOriginResult({ markerId: marker?.id, x: marker?.x, y: marker?.y, visibility: partialVisibility })
          : null,
        isStale,
      );
      if (!isStale()) {
        scene.markerVisibilityCache.set(cacheKey, visibility);
        if (scene.markerVisibilityCache.size > 500) {
          scene.markerVisibilityCache.delete(scene.markerVisibilityCache.keys().next().value);
        }
      }
    }
    if (isStale()) break;
    const result = {
      markerId: marker?.id,
      x: marker?.x,
      y: marker?.y,
      visibility,
    };
    const markerMs = workerNow() - markerStartedAt;
    if (LOS_WORKER_DIAGNOSTICS && markerMs >= LOS_WORKER_SLOW_MARKER_MS) {
      slowMarkers.push({
        markerId: marker?.id,
        ms: Number(markerMs.toFixed(1)),
        reducedOrigins: !!reducedOrigins,
      });
    }
    results.push(result);
    if (onResult) onResult(result);
    if (index < markers.length - 1) await yieldToWorkerEventLoop();
  }
  if (LOS_WORKER_DIAGNOSTICS && slowMarkers.length) {
    console.info(
      `[LOS worker detail] markerVisibilitySlow scene=${message.sceneKey} `
      + `markers=${markers.length} slow=${JSON.stringify(slowMarkers.slice(0, 6))}`,
    );
  }
  return results;
}

function markerVisibilityResultKey(marker, pixelsPerInch, reducedOrigins, originMode, interactive, clearOnly) {
  return [
    marker?.id || "",
    Math.round((marker?.x || 0) * 10) / 10,
    Math.round((marker?.y || 0) * 10) / 10,
    marker?.baseShape || "circle",
    marker?.baseLengthMm || 40,
    marker?.baseWidthMm || marker?.baseLengthMm || 40,
    Math.round((marker?.baseRotation || 0) * 1000) / 1000,
    marker?.visibilityOriginMode || "",
    Math.round((pixelsPerInch || 0) * 100) / 100,
    reducedOrigins ? 1 : 0,
    originMode || "",
    interactive ? 1 : 0,
    clearOnly ? 1 : 0,
  ].join(":");
}

async function calculateMarkerVisibility(marker, normalizedBlockers, walls, W, H, pixelsPerInch, visibilityGeometry, reducedOrigins = false, originMode = null, previewMode = false, clearOnly = false, onOriginResult = null, isStale = () => false) {
  const clearZones = [];
  const oneWallZones = [];
  if (!marker || marker.visible === false) return { clearZones, oneWallZones };
  const resolvedOriginMode = marker.visibilityOriginMode || originMode || (reducedOrigins ? "reduced" : "full");
  const origins = getLOSOriginsForMarker(marker, pixelsPerInch, resolvedOriginMode);
  const sourceSurfaceKeys = markerTouchedFootprintSurfaceKeys(marker, pixelsPerInch, normalizedBlockers);
  const angleMode = previewMode
    ? "drag"
    : resolvedOriginMode === "unit" ? "unit"
      : resolvedOriginMode === "reduced" || reducedOrigins ? "coarse" : "full";
  const previewOutline = Array.isArray(marker.previewOutline) && marker.previewOutline.length >= 3
    ? marker.previewOutline
    : null;
  const sharedRayIntersectionCache = new Map();
  const markerDeadline = workerNow() + (previewMode ? 180 : VISIBILITY_MARKER_BUDGET_MS);
  const fallbackAngleMode = previewMode ? "drag" : "preview";
  let usedAdaptiveFallback = false;
  for (let index = 0; index < origins.length; index += 1) {
    if (isStale()) break;
    const origin = origins[index];
    const requestedAngleMode = usedAdaptiveFallback ? "preview" : angleMode;
    const originDeadline = Math.min(markerDeadline, workerNow() + VISIBILITY_ORIGIN_BUDGET_MS);
    let clearVisibility = await computeVisibilityByFootprintWallLimit(
      origin,
      normalizedBlockers,
      walls,
      W,
      H,
      0,
      visibilityGeometry,
      requestedAngleMode,
      previewOutline,
      sourceSurfaceKeys,
      isStale,
      originDeadline,
      sharedRayIntersectionCache,
    );
    if (isStale()) break;
    if (!clearVisibility) {
      usedAdaptiveFallback = true;
      clearVisibility = await computeVisibilityByFootprintWallLimit(
        origin,
        normalizedBlockers,
        walls,
        W,
        H,
        0,
        visibilityGeometry,
        fallbackAngleMode,
        previewOutline,
        sourceSurfaceKeys,
        isStale,
        Infinity,
        sharedRayIntersectionCache,
      );
    }
    if (isStale()) break;
    let oneWallVisibility = [];
    if (!clearOnly) {
      oneWallVisibility = await computeVisibilityByFootprintWallLimit(
        origin,
        normalizedBlockers,
        walls,
        W,
        H,
        1,
        visibilityGeometry,
        usedAdaptiveFallback ? "preview" : angleMode,
        previewOutline,
        sourceSurfaceKeys,
        isStale,
        Math.min(markerDeadline, workerNow() + VISIBILITY_ORIGIN_BUDGET_MS),
        sharedRayIntersectionCache,
      );
      if (isStale()) break;
      if (!oneWallVisibility) {
        usedAdaptiveFallback = true;
        oneWallVisibility = await computeVisibilityByFootprintWallLimit(
          origin,
          normalizedBlockers,
          walls,
          W,
          H,
          1,
          visibilityGeometry,
          fallbackAngleMode,
          previewOutline,
          sourceSurfaceKeys,
          isStale,
          Infinity,
          sharedRayIntersectionCache,
        );
      }
    }
    clearZones.push(clearVisibility || []);
    oneWallZones.push(oneWallVisibility || []);
    if (isStale()) break;
    if (onOriginResult && (index === 0 || index === origins.length - 1 || index % 2 === 1)) {
      onOriginResult({
        clearZones: clearZones.slice(),
        oneWallZones: oneWallZones.slice(),
      });
    }
    if (index < origins.length - 1) await yieldToWorkerEventLoop();
    if (workerNow() >= markerDeadline) usedAdaptiveFallback = true;
  }
  return { clearZones, oneWallZones };
}

function normalizeBlockers(blockers) {
  return blockers.map((polygon) => {
    const points = Array.isArray(polygon.points) ? polygon.points : polygon;
    const normalized = points.map((point) => ({ x: point.x, y: point.y }));
    normalized.footprintGroupId = polygon.footprintGroupId;
    normalized.sharedBoundaryTolerance = polygon.sharedBoundaryTolerance;
    return normalized;
  });
}

function normalizeWalls(walls) {
  return (walls || [])
    .filter((wall) => wall?.a && wall?.b)
    .map((wall) => ({
      a: { x: wall.a.x, y: wall.a.y },
      b: { x: wall.b.x, y: wall.b.y },
    }));
}

function getLOSOriginsForMarker(marker, pixelsPerInch, sampleMode = "full", targetPoint = null) {
  if (!marker) return [];
  const center = { x: marker.x, y: marker.y };
  if (!pixelsPerInch) return [center];
  const { rx, ry } = getBaseRadii(marker, pixelsPerInch);
  const interactive = sampleMode === true || sampleMode === "interactive";
  const reduced = sampleMode === "reduced";
  const unit = sampleMode === "unit";
  const samples = interactive
    ? (marker.baseShape === "circle" ? 3 : 4)
    : reduced
      ? (marker.baseShape === "circle" ? 3 : 4)
      : unit
        ? (marker.baseShape === "circle" ? 4 : 6)
        : (marker.baseShape === "circle" ? 20 : 28);
  const points = [center];
  if (reduced && !targetPoint) return points;

  if (marker.baseShape === "rectangle") {
    const perSide = interactive || reduced || unit ? 1 : 8;
    for (let i = 0; i <= perSide; i += 1) {
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
    if (targetPoint) addTargetFacingMarkerEdgePoints(points, marker, center, rx, ry, targetPoint, interactive);
    return points;
  }

  for (let i = 0; i < samples; i += 1) {
    const a = (Math.PI * 2 * i) / samples;
    const localX = Math.cos(a) * rx;
    const localY = Math.sin(a) * ry;
    const rotated = rotatePoint(localX, localY, marker.baseRotation || 0);
    points.push({ x: center.x + rotated.x, y: center.y + rotated.y });
  }

  if (targetPoint) addTargetFacingMarkerEdgePoints(points, marker, center, rx, ry, targetPoint, interactive);
  return points;
}

function getBaseRadii(marker, pixelsPerInch) {
  const shape = marker?.baseShape || "circle";
  const lengthMm = marker?.baseLengthMm ?? 40;
  const widthMm = marker?.baseWidthMm ?? 40;
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

function ellipseRadiusInDirection(ellipse, dx, dy) {
  const length = Math.hypot(dx, dy);
  if (!length) return 0;
  const unit = rotatePoint(dx / length, dy / length, -(ellipse.rotation || 0));
  const denominator = Math.sqrt((unit.x * unit.x) / (ellipse.rx * ellipse.rx) + (unit.y * unit.y) / (ellipse.ry * ellipse.ry));
  return denominator ? 1 / denominator : 0;
}

function rotatePoint(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

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
  let minCellX = Infinity;
  let maxCellX = -Infinity;
  let minCellY = Infinity;
  let maxCellY = -Infinity;
  segments.forEach((segment) => {
    const bounds = segment.bounds || segmentBounds(segment.a, segment.b);
    minCellX = Math.min(minCellX, Math.floor(bounds.minX / cellSize));
    maxCellX = Math.max(maxCellX, Math.floor(bounds.maxX / cellSize));
    minCellY = Math.min(minCellY, Math.floor(bounds.minY / cellSize));
    maxCellY = Math.max(maxCellY, Math.floor(bounds.maxY / cellSize));
  });
  if (!Number.isFinite(minCellX)) return { cells: [], cellSize, segments, minCellX: 0, minCellY: 0, columns: 0, rows: 0 };
  const columns = maxCellX - minCellX + 1;
  const rows = maxCellY - minCellY + 1;
  const cells = new Array(columns * rows);
  const cellIndex = (x, y) => (y - minCellY) * columns + (x - minCellX);
  segments.forEach((segment, index) => {
    const bounds = segment.bounds || segmentBounds(segment.a, segment.b);
    const minCellX = Math.floor(bounds.minX / cellSize);
    const maxCellX = Math.floor(bounds.maxX / cellSize);
    const minCellY = Math.floor(bounds.minY / cellSize);
    const maxCellY = Math.floor(bounds.maxY / cellSize);
    for (let x = minCellX; x <= maxCellX; x += 1) {
      for (let y = minCellY; y <= maxCellY; y += 1) {
        const indexKey = cellIndex(x, y);
        if (!cells[indexKey]) cells[indexKey] = [];
        cells[indexKey].push(index);
      }
    }
  });
  return { cells, cellSize, segments, minCellX, minCellY, columns, rows };
}

function spatialCellSegments(spatialIndex, cellX, cellY) {
  const { cells, minCellX, minCellY, columns, rows } = spatialIndex;
  const x = cellX - minCellX;
  const y = cellY - minCellY;
  if (x < 0 || y < 0 || x >= columns || y >= rows) return null;
  return cells[y * columns + x] || null;
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
      const cellSegments = spatialCellSegments(spatialIndex, x, y);
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
        const cellSegments = spatialCellSegments(spatialIndex, cellX + dx, cellY + dy);
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
  const coarseVertices = dedupeVisibilityVertices([
    ...edgeModel.bounds,
    ...edgeModel.footprintSegments.flatMap((segment, index) => (index % 3 === 0 ? [segment.a, segment.b] : [])),
    ...edgeModel.wallSegments.flatMap((segment) => [segment.a, segment.b]),
  ]);
  const unitVertices = dedupeVisibilityVertices([
    ...edgeModel.bounds,
    ...edgeModel.footprintSegments.flatMap((segment, index) => (index % 5 === 0 ? [segment.a, segment.b] : [])),
    ...criticalVisibilityVertices(edgeModel.footprintSegments),
    ...edgeModel.wallSegments.flatMap((segment) => [segment.a, segment.b]),
  ]);
  const previewVertices = dedupeVisibilityVertices([
    ...edgeModel.bounds,
    ...edgeModel.footprintSegments.flatMap((segment, index) => (index % 8 === 0 ? [segment.a, segment.b] : [])),
    ...edgeModel.wallSegments.flatMap((segment) => [segment.a, segment.b]),
  ]);
  const dragVertices = dedupeVisibilityVertices([
    ...edgeModel.bounds,
    ...edgeModel.footprintSegments.flatMap((segment, index) => (index % 24 === 0 ? [segment.a, segment.b] : [])),
    ...criticalVisibilityVertices(edgeModel.footprintSegments),
    ...edgeModel.wallSegments.flatMap((segment, index) => (index % 4 === 0 ? [segment.a, segment.b] : [])),
  ]);
  const preparedSegments = edgeModel.segments.map((segment) => ({
    ...segment,
    bounds: segmentBounds(segment.a, segment.b),
  }));
  const spatialIndex = buildSegmentSpatialIndex(
    preparedSegments,
    Math.max(48, Math.min(160, Math.max(W, H) / 8)),
  );
  const geometry = { ...edgeModel, vertices, coarseVertices, unitVertices, previewVertices, dragVertices, segments: preparedSegments, spatialIndex };
  visibilityGeometryCache.set(key, geometry);
  if (visibilityGeometryCache.size > 6) visibilityGeometryCache.delete(visibilityGeometryCache.keys().next().value);
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

function criticalVisibilityVertices(segments) {
  const junctions = new Map();
  const addJunction = (point, other, surfaceKey) => {
    const key = `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}:${surfaceKey}`;
    if (!junctions.has(key)) junctions.set(key, { point, vectors: [] });
    junctions.get(key).vectors.push({ x: other.x - point.x, y: other.y - point.y });
  };
  segments.forEach((segment) => {
    if (segment.meta?.type !== "footprint") return;
    const surfaceKey = segment.meta.groupKey || `footprint:${segment.meta.index}`;
    addJunction(segment.a, segment.b, surfaceKey);
    addJunction(segment.b, segment.a, surfaceKey);
  });
  const critical = [];
  junctions.forEach(({ point, vectors }) => {
    if (vectors.length !== 2) {
      critical.push(point);
      return;
    }
    const firstLength = Math.hypot(vectors[0].x, vectors[0].y) || 1;
    const secondLength = Math.hypot(vectors[1].x, vectors[1].y) || 1;
    const cosine = Math.max(-1, Math.min(1, (
      vectors[0].x * vectors[1].x + vectors[0].y * vectors[1].y
    ) / (firstLength * secondLength)));
    const turnFromStraight = Math.abs(Math.PI - Math.acos(cosine));
    if (turnFromStraight >= 0.12) critical.push(point);
  });
  return critical;
}

function dragVisibilityVertices(source, geometry, sectorCount = 48) {
  const candidates = geometry.dragVertices || geometry.previewVertices || geometry.coarseVertices || geometry.vertices;
  const sectors = Array.from({ length: sectorCount }, () => ({ nearest: null, farthest: null }));
  candidates.forEach((vertex) => {
    const dx = vertex.x - source.x;
    const dy = vertex.y - source.y;
    const distanceSquared = dx * dx + dy * dy;
    const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
    const index = Math.min(sectorCount - 1, Math.floor(angle / (Math.PI * 2) * sectorCount));
    const sector = sectors[index];
    if (!sector.nearest || distanceSquared < sector.nearest.distanceSquared) sector.nearest = { vertex, distanceSquared };
    if (!sector.farthest || distanceSquared > sector.farthest.distanceSquared) sector.farthest = { vertex, distanceSquared };
  });
  return dedupeVisibilityVertices([
    ...(geometry.bounds || []),
    ...sectors.flatMap((sector) => [sector.nearest?.vertex, sector.farthest?.vertex].filter(Boolean)),
  ]);
}

function rayExitPointFromOutline(source, ray, outline) {
  if (!outline?.length) return source;
  let furthest = null;
  for (let index = 0; index < outline.length; index += 1) {
    const hit = raySegmentIntersection(source, ray, outline[index], outline[(index + 1) % outline.length]);
    if (hit && hit.t >= -0.0001 && (!furthest || hit.t > furthest.t)) furthest = hit;
  }
  if (!furthest) return source;
  return { x: furthest.x + ray.x * 0.05, y: furthest.y + ray.y * 0.05 };
}

async function computeVisibilityByFootprintWallLimit(source, blockers, walls, W, H, allowedFootprintWalls, preparedGeometry = null, angleMode = "full", sourceOutline = null, sourceSurfaceKeys = [], isStale = () => false, deadline = Infinity, rayIntersectionCache = null) {
  if (!source || !W || !H) return [];
  const eps = 0.0001;
  const geometry = preparedGeometry || getPreparedVisibilityGeometry(blockers, walls, W, H);
  const vertices = angleMode === "preview"
    ? (geometry.previewVertices || geometry.coarseVertices || geometry.vertices)
    : angleMode === "drag" ? dragVisibilityVertices(source, geometry)
    : angleMode === "unit" ? (geometry.unitVertices || geometry.coarseVertices || geometry.vertices)
    : angleMode === "coarse" ? (geometry.coarseVertices || geometry.vertices) : geometry.vertices;
  const angles = [];
  const addVisibilityAngle = (angle) => {
    if (angleMode === "drag") angles.push(angle);
    else angles.push(angle - eps, angle, angle + eps);
  };
  for (const v of vertices) {
    if (isStale()) return null;
    const a = Math.atan2(v.y - source.y, v.x - source.x);
    addVisibilityAngle(a);
  }
  const outlineStep = angleMode === "drag" ? 3 : 1;
  for (let index = 0; index < (sourceOutline?.length || 0); index += outlineStep) {
    const point = sourceOutline[index];
    const angle = Math.atan2(point.y - source.y, point.x - source.x);
    addVisibilityAngle(angle);
  }

  const containingBlockers = new Set();
  const exemptSourceSurfaces = new Set(sourceSurfaceKeys || []);
  blockers.forEach((poly, index) => {
    if (pointInPoly(source, poly)) containingBlockers.add(footprintSurfaceKey(blockers, index));
  });

  const castVisibilityRay = (a) => {
    const ray = { x: Math.cos(a), y: Math.sin(a) };
    const raySource = sourceOutline ? rayExitPointFromOutline(source, ray, sourceOutline) : source;
    const rayCacheKey = rayIntersectionCache
      ? `${Math.round(raySource.x * 1000)}:${Math.round(raySource.y * 1000)}:${Math.round(normalizeAngle(a) * 1000000)}`
      : null;
    let uniqueIntersections = rayCacheKey ? rayIntersectionCache.get(rayCacheKey) : null;
    if (!uniqueIntersections) {
      const intersections = [];
      candidateSegmentsForRay(raySource, ray, geometry, W, H).forEach((s) => {
        const hit = raySegmentIntersection(raySource, ray, s.a, s.b);
        if (hit && hit.t > 0.0001) intersections.push({ ...hit, meta: s.meta });
      });

      intersections.sort((p, q) => p.t - q.t);
      uniqueIntersections = [];
      intersections.forEach((hit) => {
        const previous = uniqueIntersections[uniqueIntersections.length - 1];
        const sameDistance = previous && Math.abs(previous.t - hit.t) < 0.001;
        const sameSurface = previous && previous.meta.type === hit.meta.type
          && (previous.meta.groupKey || previous.meta.index) === (hit.meta.groupKey || hit.meta.index);
        if (!sameDistance || !sameSurface) uniqueIntersections.push(hit);
      });
      if (rayCacheKey) rayIntersectionCache.set(rayCacheKey, uniqueIntersections);
    }

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
        if (exemptSourceSurfaces.has(surfaceKey)) continue;
        const sampleDistance = 0.25;
        const before = { x: hit.x - ray.x * sampleDistance, y: hit.y - ray.y * sampleDistance };
        const after = { x: hit.x + ray.x * sampleDistance, y: hit.y + ray.y * sampleDistance };
        const beforeInside = pointInFootprintSurface(before, blockers, surfaceKey);
        const afterInside = pointInFootprintSurface(after, blockers, surfaceKey);
        if (beforeInside === afterInside) continue;
        if (containingBlockers.has(surfaceKey) && beforeInside) containingBlockers.delete(surfaceKey);
        footprintWallsCrossed += 1;
        if (footprintWallsCrossed > allowedFootprintWalls) {
          chosen = hit;
          break;
        }
      }
    }

    return chosen ? { x: chosen.x, y: chosen.y, angle: a } : null;
  };

  const snappedAngles = snapVisibilityAngles(angles);
  const hits = [];
  for (let index = 0; index < snappedAngles.length; index += 1) {
    if (isStale()) return null;
    if (workerNow() > deadline) return null;
    const hit = castVisibilityRay(snappedAngles[index]);
    if (hit) hits.push(hit);
    if (index > 0 && index % VISIBILITY_RAY_YIELD_INTERVAL === 0) {
      await yieldToWorkerEventLoop();
    }
  }
  if (isStale()) return null;
  hits.sort((p, q) => p.angle - q.angle);
  if (angleMode === "drag") return sanitizeVisibilityPolygon(source, hits, W, H);
  const refinedHits = refineVisibilityTransitions(source, hits, castVisibilityRay);
  return sanitizeVisibilityPolygon(source, refinedHits, W, H);
}

function refineVisibilityTransitions(source, sortedHits, castVisibilityRay) {
  if (sortedHits.length < 2) return sortedHits;
  const refined = [];
  const maximumDepth = 2;
  const maximumInsertedRays = 32;
  const minimumAngle = 0.00035;
  let insertedRays = 0;
  const refinePair = (left, right, depth) => {
    let rightAngle = right.angle;
    while (rightAngle <= left.angle) rightAngle += Math.PI * 2;
    const angularGap = rightAngle - left.angle;
    const leftRadius = dist(source, left);
    const rightRadius = dist(source, right);
    const minimumRadius = Math.max(1, Math.min(leftRadius, rightRadius));
    const radiusRatio = Math.max(leftRadius, rightRadius) / minimumRadius;
    const expectedArc = minimumRadius * angularGap;
    const chordExcess = dist(left, right) > Math.max(8, expectedArc * 2.5);
    const meaningfulTransition = radiusRatio >= 1.35 || (radiusRatio >= 1.12 && chordExcess);
    if (
      insertedRays >= maximumInsertedRays
      || depth >= maximumDepth
      || angularGap <= minimumAngle
      || !meaningfulTransition
    ) {
      refined.push(left);
      return;
    }
    const midpointAngle = left.angle + angularGap / 2;
    const normalizedMidpoint = normalizeAngle(midpointAngle);
    const midpoint = castVisibilityRay(normalizedMidpoint);
    if (!midpoint) {
      refined.push(left);
      return;
    }
    insertedRays += 1;
    const adjustedMidpoint = { ...midpoint, angle: midpointAngle };
    refinePair(left, adjustedMidpoint, depth + 1);
    refinePair(adjustedMidpoint, { ...right, angle: rightAngle }, depth + 1);
  };
  for (let index = 0; index < sortedHits.length; index += 1) {
    const left = sortedHits[index];
    const right = sortedHits[(index + 1) % sortedHits.length];
    refinePair(left, right, 0);
  }
  refined.sort((left, right) => left.angle - right.angle);
  return refined.map((hit) => ({ ...hit, angle: normalizeAngle(hit.angle) }))
    .sort((left, right) => left.angle - right.angle);
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

function addSegments(poly, segments, meta) {
  for (let i = 0; i < poly.length; i += 1) segments.push({ a: poly[i], b: poly[(i + 1) % poly.length], meta });
}

function footprintSurfaceKey(blockers, index) {
  const groupId = String(blockers[index]?.footprintGroupId || "");
  return groupId.startsWith("layout-group:") ? groupId : `footprint:${index}`;
}

function footprintSurfaceKeys(blockers) {
  return [...new Set(blockers.map((_, index) => footprintSurfaceKey(blockers, index)))];
}

function markerTouchedFootprintSurfaceKeys(marker, pixelsPerInch, blockers) {
  const samples = [
    ...getLOSOriginsForMarker(marker, pixelsPerInch, "full"),
    ...(Array.isArray(marker?.previewOutline) ? marker.previewOutline : []),
  ];
  return footprintSurfaceKeys(blockers).filter((surfaceKey) => (
    samples.some((sample) => pointInFootprintSurface(sample, blockers, surfaceKey))
  ));
}

function enemyTouchedFootprintSurfaceKeys(enemy, enemyRadius, blockers) {
  const boundarySegments = getFootprintBoundarySegments(blockers);
  return footprintSurfaceKeys(blockers).filter((surfaceKey) => {
    if (pointInFootprintSurface(enemy, blockers, surfaceKey)) return true;
    return boundarySegments.some((segment) => {
      if (segment.groupKey !== surfaceKey) return false;
      return dist(enemy, closestPointOnSegment(enemy, segment.a, segment.b)) <= enemyRadius + 0.01;
    });
  });
}

async function directEnemyLOSState(enemy, enemyRadius, origins, blockers, walls, interactive = false, preparedGeometry = null, diagnostics = null, isStale = () => false) {
  if (!origins.length) return "blocked";
  let hasCoveredClearPath = false;
  let callsSinceYield = 0;
  const enemyFootprintSurfaces = enemyTouchedFootprintSurfaceKeys(enemy, enemyRadius, blockers);
  const clearStateForOrigin = (origin) => {
    if (!enemyFootprintSurfaces.length) return "clear";
    return "oneWall";
  };
  const orderedOrigins = [...origins].sort((left, right) => (
    ((left.x - enemy.x) ** 2 + (left.y - enemy.y) ** 2)
    - ((right.x - enemy.x) ** 2 + (right.y - enemy.y) ** 2)
  ));
  const classifyWithCheckpoint = async (origin, target, phase) => {
    const startedAt = workerNow();
    const state = classifySightSegment(origin, target, blockers, walls, preparedGeometry);
    if (diagnostics) {
      if (phase === "center") {
        diagnostics.centerCalls += 1;
        diagnostics.centerMs += workerNow() - startedAt;
      } else {
        diagnostics.edgeCalls += 1;
        diagnostics.edgeMs += workerNow() - startedAt;
      }
    }
    callsSinceYield += 1;
    if (callsSinceYield >= ENEMY_CLASSIFY_YIELD_INTERVAL) {
      callsSinceYield = 0;
      await yieldToWorkerEventLoop();
    }
    return isStale() ? null : state;
  };
  const centerStartedAt = workerNow();
  for (const origin of orderedOrigins) {
    if (isStale()) return hasCoveredClearPath ? "oneWall" : "blocked";
    const state = await classifyWithCheckpoint(origin, enemy, "center");
    if (state === null) return hasCoveredClearPath ? "oneWall" : "blocked";
    if (state !== "clear") continue;
    const clearState = clearStateForOrigin(origin);
    if (clearState === "clear") return "clear";
    hasCoveredClearPath = true;
  }
  if (diagnostics && diagnostics.centerCalls === 0) diagnostics.centerMs += workerNow() - centerStartedAt;

  const targetSamples = interactive ? 8 : 16;
  const strategicIndexes = targetSamples === 16
    ? [0, 2, 4, 6, 8, 10, 12, 14]
    : [0, 1, 2, 3, 4, 5, 6, 7];
  const refinementIndexes = targetSamples === 16
    ? [1, 3, 5, 7, 9, 11, 13, 15]
    : [];
  for (const origin of orderedOrigins) {
    if (isStale()) return hasCoveredClearPath ? "oneWall" : "blocked";
    const edgeStates = new Array(targetSamples);
    for (const index of strategicIndexes) {
      const angle = index / targetSamples * Math.PI * 2;
      const target = {
        x: enemy.x + Math.cos(angle) * enemyRadius,
        y: enemy.y + Math.sin(angle) * enemyRadius,
      };
      const state = await classifyWithCheckpoint(origin, target, "edge");
      if (state === null) return hasCoveredClearPath ? "oneWall" : "blocked";
      edgeStates[index] = state;
    }
    const bridgeIndexes = targetSamples === 16
      ? strategicIndexes.flatMap((index, strategicIndex) => {
          const nextIndex = strategicIndexes[(strategicIndex + 1) % strategicIndexes.length];
          return edgeStates[index] === "clear" && edgeStates[nextIndex] === "clear"
            ? [(index + 1) % targetSamples]
            : [];
        })
      : [];
    const orderedRefinementIndexes = [
      ...new Set([...bridgeIndexes, ...refinementIndexes]),
    ];
    for (const index of orderedRefinementIndexes) {
      const angle = index / targetSamples * Math.PI * 2;
      const target = {
        x: enemy.x + Math.cos(angle) * enemyRadius,
        y: enemy.y + Math.sin(angle) * enemyRadius,
      };
      const state = await classifyWithCheckpoint(origin, target, "edge");
      if (state === null) return hasCoveredClearPath ? "oneWall" : "blocked";
      edgeStates[index] = state;
      if (hasAdjacentEnemyEdgeSamples(edgeStates, "clear")) {
        const clearState = clearStateForOrigin(origin);
        if (clearState === "clear") return "clear";
        hasCoveredClearPath = true;
        break;
      }
    }
    if (!hasAdjacentEnemyEdgeSamples(edgeStates, "clear")) continue;
    const clearState = clearStateForOrigin(origin);
    if (clearState === "clear") return "clear";
    hasCoveredClearPath = true;
  }
  return hasCoveredClearPath ? "oneWall" : "blocked";
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
  const sourceSurfaceKeys = new Set(origin.sourceSurfaceKeys || []);
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
      if (sourceSurfaceKeys.has(surfaceKey) || touchesTarget) return;
      if (touchesOrigin && touchesTarget) return;
      footprintCrossings += touchesOrigin || touchesTarget ? 1 : 2;
    });
    if (footprintCrossings > 0) return "blocked";
  }
  return "clear";
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

function enemyBaseRadius(pixelsPerInch) {
  return Number.isFinite(pixelsPerInch) && pixelsPerInch > 0
    ? pixelsPerInch * (25 / 25.4) / 2
    : 12.5;
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
      const tolerance = Number.isFinite(polygon.sharedBoundaryTolerance) ? polygon.sharedBoundaryTolerance : 0.75;
      const cuts = [0, 1];

      partnerIndexes.forEach((partnerIndex) => {
        const partner = blockers[partnerIndex];
        for (let partnerEdgeIndex = 0; partnerEdgeIndex < partner.length; partnerEdgeIndex += 1) {
          const partnerStart = partner[partnerEdgeIndex];
          const partnerEnd = partner[(partnerEdgeIndex + 1) % partner.length];
          const intersection = segmentIntersectionParameters(edgeStart, edgeEnd, partnerStart, partnerEnd);
          if (intersection) cuts.push(intersection.t);
          const partnerTolerance = Number.isFinite(partner.sharedBoundaryTolerance) ? partner.sharedBoundaryTolerance : tolerance;
          const overlap = nearParallelEdgeOverlap(edgeStart, edgeEnd, partnerStart, partnerEnd, Math.max(tolerance, partnerTolerance));
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
          const partnerTolerance = Number.isFinite(partner.sharedBoundaryTolerance) ? partner.sharedBoundaryTolerance : tolerance;
          return pointInPoly(midpoint, partner)
            || pointNearParallelPolygonEdge(midpoint, edgeStart, edgeEnd, partner, Math.max(tolerance, partnerTolerance));
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
      const center = { x: (left.point.x + right.point.x) / 2, y: (left.point.y + right.point.y) / 2 };
      const leftDirection = segmentDirectionAwayFromEndpoint(left.segment, left.point);
      const rightDirection = segmentDirectionAwayFromEndpoint(right.segment, right.point);
      const bisector = { x: leftDirection.x + rightDirection.x, y: leftDirection.y + rightDirection.y };
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
    const overlap = nearParallelEdgeOverlap(edgeStart, edgeEnd, polygon[index], polygon[(index + 1) % polygon.length], tolerance);
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

function closestPointOnSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return { ...a };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y))
      && (p.x < ((xj - xi) * (p.y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function dist(a, b) {
  return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
}
