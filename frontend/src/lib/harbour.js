// Harbour detail the City data does not carry, placed by hand at render time:
// the sails of Canada Place and boats moored at the marinas. Positions are approximate, read off the
// aerial, and are the only thing here that is not geometry.
import { pillar } from "./bridges.js";

// The marinas: a corner, the heading of the rows (degrees from east), the
// rows and berths, and the pitch between boats.
export const MARINAS = [
  { name: "Coal Harbour", at: [-123.1262, 49.2920], heading: 15, rows: 3, cols: 18, pitch: [4, 14] },
  { name: "Coal Harbour east", at: [-123.1205, 49.2904], heading: 20, rows: 2, cols: 14, pitch: [4, 14] },
  { name: "Granville Island", at: [-123.1332, 49.2718], heading: 70, rows: 2, cols: 14, pitch: [4, 13] },
  { name: "Quayside", at: [-123.1195, 49.2726], heading: 5, rows: 3, cols: 16, pitch: [4, 13] },
  { name: "Heather", at: [-123.1156, 49.2713], heading: 0, rows: 2, cols: 12, pitch: [4, 13] },
];
export const BOAT = { length: 7, beam: 2.6, hull: 1.1, cabin: [2.2, 1.8, 1.0] };
export const SAILS = { count: 5, height: 24, width: 22, from: 0.28, to: 0.86 };

// Boats as boxes on the water: rows of berths from a corner, headed along
// `dir`, each a hull with a cabin. Returns { pos, edge } in scene units; `u`
// is scene units per metre, `y0` the water level.
export function boatBoxes(x, z, dir, rows, cols, pitch, u, y0 = 0, seed = 1) {
  const pos = [], edge = [], d = [Math.cos(dir), Math.sin(dir)], n = [-d[1], d[0]];
  let t = (seed * 0x9e3779b1) >>> 0;
  const rnd = () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (rnd() < 0.18) continue;                                  // an empty berth here and there
    const cx = x + d[0] * (c * pitch[0] + pitch[0] / 2) * u + n[0] * (r * pitch[1] + pitch[1] / 2) * u;
    const cz = z + d[1] * (c * pitch[0] + pitch[0] / 2) * u + n[1] * (r * pitch[1] + pitch[1] / 2) * u;
    const L = BOAT.length * (0.8 + rnd() * 0.5) * u, B = BOAT.beam * u;
    const hull = pillar(cx, cz, n, L / 2, B / 2, y0, y0 + BOAT.hull * u);   // the boat lies across the row, along n
    const cab = pillar(cx + n[0] * L * 0.1, cz + n[1] * L * 0.1, n, BOAT.cabin[0] / 2 * u, BOAT.cabin[1] / 2 * u, y0 + BOAT.hull * u, y0 + (BOAT.hull + BOAT.cabin[2]) * u);
    pos.push(...hull.pos, ...cab.pos); edge.push(...hull.edge, ...cab.edge);
  }
  return { pos, edge };
}

// The long axis of a ring: its centroid and the unit direction of greatest spread
export function longAxis(xz) {
  const n = xz.length, cx = xz.reduce((t, q) => t + q[0], 0) / n, cz = xz.reduce((t, q) => t + q[1], 0) / n;
  let sxx = 0, szz = 0, sxz = 0;
  xz.forEach(([x, z]) => { sxx += (x - cx) ** 2; szz += (z - cz) ** 2; sxz += (x - cx) * (z - cz); });
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz), d = [Math.cos(ang), Math.sin(ang)];
  let lo = Infinity, hi = -Infinity;
  xz.forEach(([x, z]) => { const s = (x - cx) * d[0] + (z - cz) * d[1]; lo = Math.min(lo, s); hi = Math.max(hi, s); });
  return { cx, cz, d, lo, hi };
}

// Sails along an axis: each a pair of triangular faces leaning out from a
// ridge, like a tent, from the deck height y0 to y0 + h. Returns { pos, edge }.
export function sailRow(axis, count, h, w, from, to, y0) {
  const pos = [], edge = [], { cx, cz, d, lo, hi } = axis, n = [-d[1], d[0]];
  for (let i = 0; i < count; i++) {
    const s = lo + (hi - lo) * (from + (to - from) * (count === 1 ? 0.5 : i / (count - 1)));
    const px = cx + d[0] * s, pz = cz + d[1] * s;
    const half = w / 2, back = half * 0.55;
    const peak = [px, y0 + h, pz];
    const a = [px + n[0] * half - d[0] * back, y0, pz + n[1] * half - d[1] * back], b = [px - n[0] * half - d[0] * back, y0, pz - n[1] * half - d[1] * back];
    const c = [px + d[0] * back * 0.8, y0, pz + d[1] * back * 0.8];
    // three faces of a leaning tetrahedron: two sails and a back
    pos.push(...a, ...peak, ...c, ...c, ...peak, ...b, ...a, ...b, ...peak);
    edge.push(...a, ...peak, ...b, ...peak, ...c, ...peak, ...a, ...c, ...c, ...b);
  }
  return { pos, edge };
}
