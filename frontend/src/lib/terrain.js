// The ground: a heightfield interpolated from the City's 1-metre contours,
// sampled bilinearly, in metres above the datum.
export function decodeTerrain(d) {
  if (!d || !d.heights) return null;
  const bin = atob(d.heights), n = bin.length / 2, h = new Float32Array(n);
  for (let i = 0; i < n; i++) h[i] = ((bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) - 100) / 10;
  const [lon0, lat0, lon1, lat1] = d.bbox, nx = d.nx, ny = d.ny;
  const lat0r = (lat0 + lat1) / 2, kx = 111320 * Math.cos(lat0r * Math.PI / 180), ky = 110540;
  const contours = decodeContours(d.contours);
  return {
    bbox: d.bbox, cell: d.cell, nx, ny, heights: h, contours, land: d.land || null,
    min: h.reduce((a, b) => Math.min(a, b), Infinity), max: h.reduce((a, b) => Math.max(a, b), -Infinity),
    // elevation in metres at a longitude and latitude; the edge value beyond the grid
    at(lon, lat) {
      const fx = (lon - lon0) * kx / d.cell, fy = (lat - lat0) * ky / d.cell;
      const i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(ny - 2, Math.floor(fy)));
      const tx = Math.max(0, Math.min(1, fx - i)), ty = Math.max(0, Math.min(1, fy - j));
      const a = h[j * nx + i], b = h[j * nx + i + 1], c = h[(j + 1) * nx + i], e = h[(j + 1) * nx + i + 1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty;
    }
  };
}

function decodeContours(c) {
  if (!c) return [];
  const o = c.origin, k = c.scale;
  return c.lines.map((e, n) => {
    const pts = []; let x = e[0], y = e[1];
    pts.push([o[0] + x * k, o[1] + y * k]);
    for (let i = 2; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; pts.push([o[0] + x * k, o[1] + y * k]); }
    return { z: c.levels[n], pts };
  });
}

export function decodeLines(d) {
  if (!d || !d.lines) return null;
  const o = d.origin, k = d.scale;
  return d.lines.map((e) => {
    const pts = []; let x = e[0], y = e[1];
    pts.push([o[0] + x * k, o[1] + y * k]);
    for (let i = 2; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; pts.push([o[0] + x * k, o[1] + y * k]); }
    return pts;
  });
}

export function decodeTrees(d) {
  if (!d || !d.x) return null;
  const o = d.origin, k = d.scale, out = [];
  let x = 0, y = 0;
  for (let i = 0; i < d.x.length; i++) {
    x += d.x[i]; y += d.y[i];
    out.push({ lon: o[0] + x * k, lat: o[1] + y * k, h: d.h[i] / 2, d: d.d[i] });
  }
  return out;
}

// The land mask as a small canvas, land one colour and water another, to be
// drawn scaled over the terrain's extent. Rows run from the south-west corner.
export function landCanvas(terrain, landColour, waterColour) {
  const m = terrain && terrain.land;
  if (!m || typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = m.nx; cv.height = m.ny;
  const ctx = cv.getContext("2d");
  if (waterColour) { ctx.fillStyle = waterColour; ctx.fillRect(0, 0, m.nx, m.ny); }   // null leaves the water clear, for a painted wash beneath
  ctx.fillStyle = landColour;
  m.rows.forEach((runs, j) => {
    let x = 0, land = false;
    const y = m.ny - 1 - j;                       // row 0 is the south edge; canvas row 0 is the top
    runs.forEach((n) => { if (land && n) ctx.fillRect(x, y, n, 1); x += n; land = !land; });
  });
  return cv;
}

// The land mask as cells: 1 for land, in canvas order (row 0 at the north).
export function landCells(m) {
  const nx = m.nx, ny = m.ny, on = new Uint8Array(nx * ny);
  m.rows.forEach((runs, j) => {
    let x = 0, land = false;
    const y = ny - 1 - j;                       // row 0 of the data is the south edge
    runs.forEach((n) => { if (land) for (let i = x; i < x + n && i < nx; i++) on[y * nx + i] = 1; x += n; land = !land; });
  });
  return on;
}

// The shoreline as smooth closed rings, traced from the land mask so the
// shore is drawn as a line rather than as 6 m cells. Marching squares runs
// over the cell centres (padded with water, so every ring closes), then the
// corners are rounded. Rings are in mask canvas units: x from 0 to nx
// eastward, y from 0 to ny southward, matching landCanvas. Fill them with
// the even-odd rule: an inland lake is a ring inside a ring.
// How the drawn shoreline departs from the mask: `smooth` averages each ring
// vertex with that many neighbours either side, `passes` times over (the
// vertices sit about 4 m apart, so 10 twice irons out wobble up to some 40 m
// across and leaves a flowing line), then `rounds` of corner rounding follow. `px` is the width of the distance field the shader reads,
// and `rangeM` the distance either side of the line it encodes.
export const SHORE = { smooth: 10, passes: 2, rounds: 3, px: 4096, rangeM: 24 };
export function shoreOutline(terrain, rounds = SHORE.rounds, smooth = SHORE.smooth, passes = SHORE.passes) {
  const m = terrain && terrain.land;
  if (!m) return null;
  const nx = m.nx, ny = m.ny, on = landCells(m);
  const W = nx + 2, H = ny + 2;                                   // padded vertex grid
  const F = (i, j) => (i < 1 || j < 1 || i > nx || j > ny) ? 0 : on[(j - 1) * nx + (i - 1)];
  // edge ids: the horizontal edge from vertex (i, j) east is 2 * (j * W + i), the vertical edge south of it is that + 1
  const hE = (i, j) => 2 * (j * W + i), vE = (i, j) => 2 * (j * W + i) + 1;
  const next = new Map();                                          // start edge -> end edge
  // one segment from edge p to edge q, oriented so the corner (cx, cy) is on its left when that corner is land
  // and on its right when it is water: land then sits on the same side of every ring
  const seg = (p, q, cx, cy, land) => {
    const cross = (q[1] - p[1]) * (cy - p[2]) - (q[2] - p[2]) * (cx - p[1]);
    if ((cross < 0) === land) next.set(p[0], q[0]); else next.set(q[0], p[0]);
  };
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = F(i, j), b = F(i + 1, j), c = F(i + 1, j + 1), d = F(i, j + 1);
    const k = a | (b << 1) | (c << 2) | (d << 3);
    if (k === 0 || k === 15) continue;
    const T = [hE(i, j), i + 0.5, j], R = [vE(i + 1, j), i + 1, j + 0.5], B = [hE(i, j + 1), i + 0.5, j + 1], L = [vE(i, j), i, j + 0.5];
    switch (k) {
      case 1: case 14: seg(L, T, i, j, k === 1); break;
      case 2: case 13: seg(T, R, i + 1, j, k === 2); break;
      case 4: case 11: seg(R, B, i + 1, j + 1, k === 4); break;
      case 8: case 7: seg(B, L, i, j + 1, k === 8); break;
      case 3: case 12: seg(L, R, i, j, k === 3); break;
      case 6: case 9: seg(T, B, i + 1, j, k === 6); break;
      case 5: seg(L, T, i, j, true); seg(R, B, i + 1, j + 1, true); break;        // saddles: keep the two land corners apart
      case 10: seg(T, R, i + 1, j, true); seg(B, L, i, j + 1, true); break;
    }
  }
  const at = (e) => { const v = e >> 1, i = v % W, j = (v - i) / W; return (e & 1) ? [i, j + 0.5] : [i + 0.5, j]; };
  const rings = [], seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const ring = []; let e = start;
    while (e !== undefined && !seen.has(e)) { seen.add(e); ring.push(at(e)); e = next.get(e); }
    if (ring.length > 2) rings.push(ring);
  }
  // round the corners, then shift from vertex coordinates to the canvas (vertex i sits at the centre of cell i - 1)
  return rings.map((r) => {
    let q = r;
    for (let n = 0; n < passes && smooth > 0; n++) q = average(q, smooth);
    for (let n = 0; n < rounds; n++) q = chaikin(q);
    return q.map(([x, y]) => [x - 0.5, y - 0.5]);
  });
}
// each vertex replaced by the mean of itself and `k` neighbours either side, around the closed ring
function average(r, k) {
  const n = r.length, out = new Array(n);
  if (n <= 2 * k + 1) return r;
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    for (let d = -k; d <= k; d++) { const p = r[(i + d + n) % n]; x += p[0]; y += p[1]; }
    out[i] = [x / (2 * k + 1), y / (2 * k + 1)];
  }
  return out;
}

// The signed distance to the drawn shoreline, as bytes for a texture the
// ground shader thresholds: 128 on the line, more inland, less at sea, with
// `rangeM` metres mapping to the full 127 either way. The rings are drawn at
// `px` across for the sign and a first distance, then every pixel within
// range is measured exactly against the outline's segments: a distance
// transform alone only knows pixel centres and saws the line at every texel.
export function shoreField(rings, nx, ny, cellM, px = SHORE.px, rangeM = SHORE.rangeM) {
  if (!rings || typeof document === "undefined") return null;
  const w = px, h = Math.max(2, Math.round(px * ny / nx)), k = w / nx;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  rings.forEach((r) => { r.forEach(([x, y], i) => { if (i) ctx.lineTo(x * k, y * k); else ctx.moveTo(x * k, y * k); }); ctx.closePath(); });
  ctx.fill("evenodd");
  const img = ctx.getImageData(0, 0, w, h).data, n = w * h;
  const land = new Uint8Array(n), water = new Uint8Array(n);
  for (let i = 0; i < n; i++) { if (img[i * 4] > 127) land[i] = 1; else water[i] = 1; }
  const toWater = distanceTransform(water, w, h), toLand = distanceTransform(land, w, h);
  const scaled = rings.map((r) => r.map(([x, y]) => [x * k, y * k]));
  return { w, h, data: fieldBytes(scaled, w, h, land, toWater, toLand, cellM / k, rangeM) };
}

// The bytes of the field: the sign and a far value from the two distance
// transforms (in pixels), and for every pixel within range the exact distance
// to the nearest outline segment, found through a grid of the segments.
export function fieldBytes(rings, w, h, land, toWater, toLand, pxM, rangeM) {
  const n = w * h, out = new Uint8Array(n), rangePx = rangeM / pxM;
  const B = Math.max(1, Math.ceil(rangePx)), bw = Math.ceil(w / B) + 1, bh = Math.ceil(h / B) + 1;
  const buckets = new Map();
  const put = (bx, by, seg) => { const key = by * bw + bx; let l = buckets.get(key); if (!l) buckets.set(key, l = []); l.push(seg); };
  rings.forEach((r) => {
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], seg = [a[0], a[1], b[0], b[1]];
      const x0 = Math.floor(Math.min(a[0], b[0]) / B), x1 = Math.floor(Math.max(a[0], b[0]) / B);
      const y0 = Math.floor(Math.min(a[1], b[1]) / B), y1 = Math.floor(Math.max(a[1], b[1]) / B);
      for (let by = Math.max(0, y0); by <= Math.min(bh - 1, y1); by++) for (let bx = Math.max(0, x0); bx <= Math.min(bw - 1, x1); bx++) put(bx, by, seg);
    }
  });
  const band = rangePx + 1.5;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const q = j * w + i, onLand = land[q] === 1;
    let d = onLand ? toWater[q] - 0.5 : toLand[q] - 0.5;
    if (d < band) {
      const px = i + 0.5, py = j + 0.5, bx = Math.floor(px / B), by = Math.floor(py / B);
      let best = Infinity;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const l = buckets.get((by + dy) * bw + bx + dx);
        if (!l) continue;
        for (const s of l) { const e = segDist2(px, py, s[0], s[1], s[2], s[3]); if (e < best) best = e; }
      }
      if (best < Infinity) d = Math.sqrt(best);
    }
    const v = (onLand ? d : -d) * pxM / rangeM;
    out[q] = Math.round(128 + Math.max(-1, Math.min(1, v)) * 127);
  }
  return out;
}
function chaikin(r) {
  const out = [];
  for (let i = 0; i < r.length; i++) {
    const p = r[i], q = r[(i + 1) % r.length];
    out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
  }
  return out;
}
function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  const ex = px - (ax + dx * t), ey = py - (ay + dy * t);
  return ex * ex + ey * ey;
}

// Distance from the shoreline, for the water: the land mask's cells are
// marked and a distance transform gives every water cell its distance to the
// nearest land, in metres. Read by scene position; outside the mask the
// nearest edge value carries on, plus the distance to that edge.
import { distanceTransform } from "./parkShade.js";
export function shoreDistance(terrain, proj) {
  const m = terrain && terrain.land;
  if (!m) return null;
  const nx = m.nx, ny = m.ny, on = landCells(m), off = new Uint8Array(nx * ny);
  for (let i = 0; i < off.length; i++) off[i] = 1 - on[i];
  const d = distanceTransform(on, nx, ny), dIn = distanceTransform(off, nx, ny);   // to land, and to water
  const bb = terrain.bbox, x0 = proj.x(bb[0]), x1 = proj.x(bb[2]), z0 = proj.y(bb[3]), z1 = proj.y(bb[1]);
  const cellM = ((x1 - x0) / nx) * proj.mPerUnit;
  const read = (grid, x, z) => {
    const fx = (x - x0) / (x1 - x0) * nx - 0.5, fz = (z - z0) / (z1 - z0) * ny - 0.5;   // cell centres
    const cx = Math.max(0, Math.min(nx - 1, fx)), cz = Math.max(0, Math.min(ny - 1, fz));
    const i = Math.floor(cx), j = Math.floor(cz), tx = cx - i, tz = cz - j, i1 = Math.min(nx - 1, i + 1), j1 = Math.min(ny - 1, j + 1);
    const v = (grid[j * nx + i] * (1 - tx) + grid[j * nx + i1] * tx) * (1 - tz) + (grid[j1 * nx + i] * (1 - tx) + grid[j1 * nx + i1] * tx) * tz;
    const out = Math.hypot(fx - cx, fz - cz);   // cells beyond the mask's edge
    return (v + out) * cellM;
  };
  return {
    cellM,
    at(x, z) { return read(d, x, z); },          // metres from the nearest land; zero on land
    inland(x, z) { return read(dIn, x, z); },    // metres from the nearest water; zero at sea
  };
}
