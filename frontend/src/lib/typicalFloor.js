// The typical floor, read from the footprint: a double-loaded corridor along
// the long axis of the building's footprint, rooms in equal bays on both
// sides, a stair at one end. The footprint is measured; the corridor, the
// bays and the stair are the type the stock shares, stated as assumptions.
// Rooms are counted from Appendix B and spread over the storeys above a
// retail ground floor.
import { optimise, repeatFloors } from "./search.js";
import { SURVEY } from "./survey.js";

export const MIN_AREA = 60, MAX_AREA = 420;   // a room's area, clamped when read from a footprint
export const FLOOR_M = 3.4;      // assumed floor-to-floor, for storeys read from a height
export const NOMINAL_H = 4;      // metres drawn for a footprint the 2009 survey did not measure
export const PLAN = { corridor: 1.5, stair: 3.0, minDepth: 2.75, maxDepth: 4.6, minWidth: 2.4, groundRetail: true };
// the unit's program, SRA Guidelines p.5-6: a complete bathroom and a kitchen
// run with a 24" fridge. The source dimensions only the fridge; these are
// conventional minimums in metres (5' x 8' bath, 8' x 2' kitchen, 3' door).
export const POD = { bath: [1.52, 2.44], kitchen: [2.44, 0.61], kitchenMin: 1.5, door: 0.9 };
const SF = 10.7639;

// Storeys: from the LiDAR height where the City measured one, otherwise the
// older assumption of about 22 rooms to a floor.
export function floorsOf(b) {
  if (b.hgtM) return Math.max(1, Math.round(b.hgtM / FLOOR_M));
  return Math.max(1, Math.min(12, Math.round((b.rooms || 22) / 22))) || 1;
}
export function residentialFloors(b) {
  const st = floorsOf(b);
  return (PLAN.groundRetail && st > 1) ? st - 1 : st;
}

function localXY(ring, lon0, lat0) {
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  const pts = ring.map((p) => [(p[0] - lon0) * kx, (p[1] - lat0) * ky]);
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  return pts;
}
function hullOf(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  p.forEach((q) => { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
// minimum-area rectangle around the hull: one edge of it lies on a hull edge
function minRect(hull) {
  let best = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (!L) continue;
    const ux = dx / L, uy = dy / L, vx = -uy, vy = ux;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    hull.forEach((q) => {
      const u = q[0] * ux + q[1] * uy, v = q[0] * vx + q[1] * vy;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    });
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) best = { area, ux, uy, vx, vy, u0, u1, v0, v1 };
  }
  if (!best) return null;
  if (best.u1 - best.u0 < best.v1 - best.v0) {   // long axis along u
    best = { area: best.area, ux: best.vx, uy: best.vy, vx: -best.ux, vy: -best.uy,
             u0: best.v0, u1: best.v1, v0: -best.u1, v1: -best.u0 };
  }
  best.L = best.u1 - best.u0; best.W = best.v1 - best.v0;
  return best;
}
function inPoly(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function ringArea(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); }

// The outline a building is drawn from: its matched footprint, else its parcel.
export function outlineOf(b, foot) {
  if (b.foot != null && foot && foot[b.foot]) return { ring: foot[b.foot].p, source: "footprint" };
  if (b.poly) return { ring: b.poly, source: "parcel" };
  return null;
}

// assume: { cap: SF, circ: 0..1 }
export function typicalPlan(b, outline, assume) {
  if (!outline || !outline.ring || outline.ring.length < 3 || !b.rooms) return null;
  const ring = outline.ring, lon0 = ring[0][0], lat0 = ring[0][1];
  const pts = localXY(ring, lon0, lat0), rect = minRect(hullOf(pts));
  if (!rect) return null;
  const res = residentialFloors(b), per = Math.max(1, Math.round(b.rooms / res));
  const toUV = (p) => [p[0] * rect.ux + p[1] * rect.uy - rect.u0, p[0] * rect.vx + p[1] * rect.vy - rect.v0];
  const uv = pts.map(toUV);
  const L = rect.L, W = rect.W, footM2 = ringArea(uv);
  const stair = L > 12 ? PLAN.stair : 0;
  const dbl = (W - PLAN.corridor) / 2 >= PLAN.minDepth;
  const depth = Math.min(PLAN.maxDepth, dbl ? (W - PLAN.corridor) / 2 : Math.max(1, W - PLAN.corridor));
  // the room: footprint less circulation, over the rooms on a floor, capped
  const circ = assume.circ, cap = assume.cap;
  const target = Math.max(MIN_AREA, Math.min(cap, footM2 * SF * (1 - circ) / per));
  const capped = footM2 * SF * (1 - circ) / per > cap;
  const sides = dbl ? 2 : 1, bays = Math.max(1, Math.ceil(per / sides)), Lr = L - stair;
  let width = target / SF / depth, squeezed = false;
  if (bays * width > Lr) { width = Lr / bays; squeezed = true; }
  const cand = [];
  for (let k = 0; k < bays; k++) {
    for (let sd = 0; sd < sides; sd++) {
      const u = stair + k * width, v = sd === 0 ? 0 : W - depth;
      if (!inPoly(u + width / 2, v + depth / 2, uv)) continue;
      cand.push({ side: sd, bay: k, u, v, w: width, d: depth, sf: width * depth * SF });
    }
  }
  cand.sort((a, c) => a.side - c.side || a.bay - c.bay);
  // fill both sides evenly: take bays in order, alternating sides
  const take = [], bySide = [[], []];
  cand.forEach((r) => { bySide[r.side].push(r); });
  let q0 = 0, q1 = 0;
  while (take.length < per && (q0 < bySide[0].length || q1 < bySide[1].length)) {
    if (q0 < bySide[0].length) take.push(bySide[0][q0++]);
    if (take.length < per && q1 < bySide[1].length) take.push(bySide[1][q1++]);
  }
  take.sort((a, c) => a.side - c.side || a.bay - c.bay);
  take.forEach((r, n) => { r.n = n + 1; });
  const runs = [take.filter((r) => r.side === 0).map((r) => r.sf),
                take.filter((r) => r.side === 1).map((r) => r.sf)].filter((r) => r.length);
  return { ring: uv, L, W, stair, corridor: PLAN.corridor, dbl, depth, width,
           rooms: take, perFloor: per, placed: take.length, storeys: floorsOf(b), res,
           sf: take.length ? take.reduce((t, r) => t + r.sf, 0) / take.length : 0,
           footSf: footM2 * SF, runs, narrow: width < PLAN.minWidth, capped, squeezed,
           circ, cap, roomsEnd: stair + bays * width, rect, lon0, lat0, source: outline.source };
}

// The least-loss scheme on the typical floor, repeated on every residential storey.
export function optimumFor(plan, strict, policy) {
  if (!plan || !plan.placed) return null;
  return repeatFloors(optimise(plan.runs.map((r) => r.slice()), strict, policy), plan.res);
}

// The building's floors state from the plan and the scheme: what the tests run
// on and what the plan draws. When nothing passes, every room is kept.
export function buildFloors(p, o, tenancy) {
  const ten = tenancy == null ? SURVEY.tenancyYears : tenancy;
  const floors = [];
  for (let f = 0; f < p.res; f++) {
    const fr = [], fj = [];
    const sch = o && o.feasible ? o.runs.slice(f * p.runs.length, (f + 1) * p.runs.length) : null;
    const none = !!(o && !o.feasible);
    p.runs.forEach((run, ri) => {
      const base = fr.length;
      run.forEach((sf) => {
        fr.push({ id: String(fr.length + 1), area: Math.max(MIN_AREA, Math.min(MAX_AREA, Math.round(sf))), tenancy: ten, keep: none });
        if (fr.length > 1) fj.push(false);
      });
      if (sch && sch[ri]) {
        sch[ri].kept.forEach((k) => { fr[base + k].keep = true; });
        sch[ri].groups.forEach((g) => { for (let q = 0; q < g.length - 1; q++) fj[base + g[q]] = true; });
      }
    });
    floors.push({ rooms: fr, joints: fj });
  }
  return floors;
}

// The rooms to draw: as generated (existing), or from the floors state (proposed).
export function planFromState(p, floors, original) {
  if (!p || !p.placed || !floors.length) return null;
  const fr = floors[0].rooms, fj = floors[0].joints;
  if (original) {
    const perSide = {}, seen = {};
    p.rooms.forEach((r) => { perSide[r.side] = (perSide[r.side] || 0) + 1; });
    return { p, fr, fj, rooms: p.rooms.map((r, k) => {
      seen[r.side] = (seen[r.side] || 0) + 1;
      return { n: r.n, idx: k, side: r.side, k: r.bay, u: r.u, v: r.v, w: r.w, d: r.d, sf: r.sf, keep: false, last: seen[r.side] === perSide[r.side] };
    }) };
  }
  const counts = p.runs.map((r) => r.length);
  const total = counts.reduce((t, n) => t + n, 0);
  if (fr.length !== total) return null;
  const sidesPresent = [];
  p.rooms.forEach((r) => { if (sidesPresent.indexOf(r.side) < 0) sidesPresent.push(r.side); });
  const out = [];
  let idx = 0;
  sidesPresent.forEach((sd, ri) => {
    let u = p.stair;
    for (let k = 0; k < counts[ri]; k++, idx++) {
      const r = fr[idx], w = r.area / SF / p.depth;
      out.push({ n: idx + 1, idx, side: sd, k, u, v: sd === 0 ? 0 : p.W - p.depth, w, d: p.depth, sf: r.area, keep: r.keep, last: k === counts[ri] - 1 });
      u += w;
    }
  });
  return { p, rooms: out, fr, fj };
}
