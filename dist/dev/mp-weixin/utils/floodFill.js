"use strict";
const FloodFillRejectReason = {
  ON_LINE: "on_line",
  OUT_OF_BOUNDS: "out_of_bounds"
};
const BOUNDARY_BRIGHTNESS = 140;
const START_DARK_REJECT = 60;
const START_LIGHT_ALLOW = 180;
const NEIGHBOR_DARK_THRESHOLD = 100;
const MAX_FILL_PIXELS = 5e5;
const DEFAULT_BATCH_OPS = 12e3;
function getBrightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function isColorSimilar(r1, g1, b1, a1, r2, g2, b2, a2, tolerance) {
  const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2);
  return diff <= tolerance;
}
function isLineBoundaryPixel(r, g, b, a, targetR, targetG, targetB, targetA, tolerance) {
  if (a < 10) return false;
  const brightness = getBrightness(r, g, b);
  if (brightness >= BOUNDARY_BRIGHTNESS) return false;
  if (isColorSimilar(r, g, b, a, targetR, targetG, targetB, targetA, tolerance)) {
    return false;
  }
  return true;
}
function isStartPointOnLine(data, width, height, sx, sy, r, g, b, a, tolerance) {
  if (a < 10) return false;
  const brightness = getBrightness(r, g, b);
  if (brightness < START_DARK_REJECT) return true;
  if (brightness >= START_LIGHT_ALLOW) return false;
  let lineNeighborCount = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = sx + dx;
      const ny = sy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const idx = (ny * width + nx) * 4;
      const na = data[idx + 3];
      if (na < 10) continue;
      const nr = data[idx];
      const ng = data[idx + 1];
      const nb = data[idx + 2];
      if (getBrightness(nr, ng, nb) >= NEIGHBOR_DARK_THRESHOLD) continue;
      if (!isColorSimilar(nr, ng, nb, na, r, g, b, a, tolerance)) {
        lineNeighborCount++;
      }
    }
  }
  if (lineNeighborCount >= 2) return true;
  if (lineNeighborCount >= 1 && brightness < START_DARK_REJECT) return true;
  return false;
}
function createFloodFillState(data, width, height, startX, startY, fillColor, tolerance) {
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return { reason: FloodFillRejectReason.OUT_OF_BOUNDS };
  }
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  const fillR = fillColor[0] ?? 0;
  const fillG = fillColor[1] ?? 0;
  const fillB = fillColor[2] ?? 0;
  const fillA = fillColor[3] ?? 255;
  const startIndex = (sy * width + sx) * 4;
  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];
  if (isStartPointOnLine(data, width, height, sx, sy, targetR, targetG, targetB, targetA, tolerance)) {
    return { reason: FloodFillRejectReason.ON_LINE };
  }
  const visited = new Uint8Array(width * height);
  const stack = [sy * width + sx];
  return {
    state: {
      data,
      width,
      height,
      visited,
      stack,
      targetR,
      targetG,
      targetB,
      targetA,
      fillR,
      fillG,
      fillB,
      fillA,
      tolerance,
      filledCount: 0
    }
  };
}
function floodFillProcessBatch(state, maxOps) {
  const {
    data,
    width,
    height,
    visited,
    stack,
    targetR,
    targetG,
    targetB,
    targetA,
    fillR,
    fillG,
    fillB,
    fillA,
    tolerance
  } = state;
  let ops = 0;
  while (stack.length > 0 && ops < maxOps && state.filledCount < MAX_FILL_PIXELS) {
    ops++;
    const pixelIndex = stack.pop();
    if (visited[pixelIndex] === 1) {
      continue;
    }
    visited[pixelIndex] = 1;
    const x = pixelIndex % width;
    const y = (pixelIndex - x) / width;
    if (x < 0 || x >= width || y < 0 || y >= height) {
      continue;
    }
    const dataIndex = pixelIndex * 4;
    const r = data[dataIndex];
    const g = data[dataIndex + 1];
    const b = data[dataIndex + 2];
    const a = data[dataIndex + 3];
    if (isLineBoundaryPixel(r, g, b, a, targetR, targetG, targetB, targetA, tolerance)) {
      continue;
    }
    if (!isColorSimilar(
      r,
      g,
      b,
      a,
      targetR,
      targetG,
      targetB,
      targetA,
      tolerance
    )) {
      continue;
    }
    data[dataIndex] = fillR;
    data[dataIndex + 1] = fillG;
    data[dataIndex + 2] = fillB;
    data[dataIndex + 3] = fillA;
    state.filledCount++;
    if (x > 0) {
      const leftIdx = pixelIndex - 1;
      if (visited[leftIdx] === 0) stack.push(leftIdx);
    }
    if (x < width - 1) {
      const rightIdx = pixelIndex + 1;
      if (visited[rightIdx] === 0) stack.push(rightIdx);
    }
    if (y > 0) {
      const upIdx = pixelIndex - width;
      if (visited[upIdx] === 0) stack.push(upIdx);
    }
    if (y < height - 1) {
      const downIdx = pixelIndex + width;
      if (visited[downIdx] === 0) stack.push(downIdx);
    }
  }
  return stack.length === 0 || state.filledCount >= MAX_FILL_PIXELS;
}
function createFloodFillTask(data, width, height, startX, startY, fillColor, tolerance = 12) {
  const result = createFloodFillState(data, width, height, startX, startY, fillColor, tolerance);
  if (result.reason) {
    return { task: null, reason: result.reason };
  }
  const state = result.state;
  return {
    task: {
      step(maxOps = DEFAULT_BATCH_OPS) {
        return floodFillProcessBatch(state, maxOps);
      }
    },
    reason: null
  };
}
exports.createFloodFillTask = createFloodFillTask;
