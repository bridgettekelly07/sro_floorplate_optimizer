// The typical floor as a schematic plan: the footprint gives the floor area,
// Appendix B the rooms, and from those a room size; the plan itself is the
// type the stock shares, a double-loaded corridor of ordinary width with
// rooms of ordinary proportion either side, a dog-leg stair at each end and
// a shared washroom on the corridor. It is not the footprint's shape, which
// a floor of equal rooms never fills convincingly. Rooms are spread over the
// storeys above a retail ground floor.
import { optimise, repeatFloors } from "./search.js";
import { SURVEY } from "./survey.js";

export const MIN_AREA = 60, MAX_AREA = 420;   // a room's area, clamped when read from a footprint
export const FLOOR_M = 3.4;      // assumed floor-to-floor, for storeys read from a height
export const NOMINAL_H = 4;      // metres drawn for an SRO part the 2009 survey did not measure
// A footprint the 2009 survey did not measure is drawn at a guessed one to
// six storeys, varied from footprint to footprint so the unmeasured blocks
// read as a city rather than a flat field; the same footprint always gets the
// same guess. `seed` is any integer that names the footprint.
export const GUESS_STOREYS = [1, 6];
export function guessedHeight(seed) {
  let t = (seed * 2654435761 + 12345) >>> 0;
  t = (t ^ (t >>> 13)) >>> 0; t = Math.imul(t, 0x5bd1e995) >>> 0; t = (t ^ (t >>> 15)) >>> 0;
  const n = GUESS_STOREYS[0] + (t % (GUESS_STOREYS[1] - GUESS_STOREYS[0] + 1));
  return n * FLOOR_M;
}
export const PLAN = { corridor: 1.5, stair: 2.6, minDepth: 2.75, maxDepth: 4.6, minWidth: 2.4, wcPer: 12, wcWidth: 2.4, groundRetail: true };
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
  const footM2 = ringArea(pts.map(toUV)), Lf = rect.L, Wf = rect.W;
  // the room is sized as the footprint allows, exactly as before: the floor area less circulation
  // over the rooms on a floor, capped, at the depth the footprint's width gives, and squeezed where
  // that many rooms must fit along the footprint's length. Only the drawing is schematic.
  const circ = assume.circ, cap = assume.cap;
  const target = Math.max(MIN_AREA, Math.min(cap, footM2 * SF * (1 - circ) / per));
  const capped = footM2 * SF * (1 - circ) / per > cap;
  const stairF = Lf > 12 ? 3.0 : 0;
  const dblF = (Wf - PLAN.corridor) / 2 >= 2.75;
  const depth = Math.min(4.6, dblF ? (Wf - PLAN.corridor) / 2 : Math.max(1, Wf - PLAN.corridor));
  const sidesF = dblF ? 2 : 1, bays = Math.max(1, Math.ceil(per / sidesF)), Lr = Lf - stairF;
  let width = target / SF / depth, squeezed = false;
  if (bays * width > Lr) { width = Lr / bays; squeezed = true; }
  const dbl = dblF;
  const W = dbl ? depth * 2 + PLAN.corridor : depth + PLAN.corridor;
  // the rooms along each side: a stair at the near end of the first side and the far end of the
  // second, and a shared washroom for every so many rooms on the second side. The washrooms take
  // up the difference between the two sides, and whichever side is still short stretches a little.
  const n0 = dbl ? Math.ceil(per / 2) : per, n1 = dbl ? per - n0 : 0;
  const wcs = Math.max(1, Math.round(per / PLAN.wcPer));
  const cores = [], take = [];
  let L;
  if (dbl) {
    // every room the same size, so the search sees the floor the area gives; the washrooms on the
    // second side and a lobby beside the first side's stair take up whatever the sides differ by
    const side0 = PLAN.stair + n0 * width;
    const wcW = Math.max(2.0, Math.min(3.6, (side0 - PLAN.stair - n1 * width) / wcs));
    L = Math.max(side0, PLAN.stair + n1 * width + wcs * wcW);
    cores.push({ kind: "stair", side: 0, u: 0, v: 0, w: PLAN.stair + (L - side0), d: depth });
    let u = PLAN.stair + (L - side0), n = 0;
    for (let k = 0; k < n0; k++) { take.push({ side: 0, bay: k, u, v: 0, w: width, d: depth, sf: width * depth * SF, n: ++n }); u += width; }
    const v1 = W - depth, every = Math.max(1, Math.round(n1 / (wcs + 1)));
    u = 0; let placed = 0;
    for (let k = 0; k < n1; k++) {
      if (k > 0 && k % every === 0 && placed < wcs) { cores.push({ kind: "wc", side: 1, u, v: v1, w: wcW, d: depth }); u += wcW; placed++; }
      take.push({ side: 1, bay: k, u, v: v1, w: width, d: depth, sf: width * depth * SF, n: ++n }); u += width;
    }
    while (placed < wcs) { cores.push({ kind: "wc", side: 1, u, v: v1, w: wcW, d: depth }); u += wcW; placed++; }
    cores.push({ kind: "stair", side: 1, u: L - PLAN.stair, v: v1, w: PLAN.stair, d: depth });
  } else {
    cores.push({ kind: "stair", side: 0, u: 0, v: 0, w: PLAN.stair, d: depth });
    let u = PLAN.stair, n = 0;
    for (let k = 0; k < n0; k++) { take.push({ side: 0, bay: k, u, v: 0, w: width, d: depth, sf: width * depth * SF, n: ++n }); u += width; }
    cores.push({ kind: "wc", side: 0, u, v: 0, w: PLAN.wcWidth, d: depth }); u += PLAN.wcWidth;
    L = u;
  }
  const start = [PLAN.stair, 0];
  take.sort((a, c) => a.side - c.side || a.bay - c.bay);
  const runs = [take.filter((r) => r.side === 0).map((r) => r.sf),
                take.filter((r) => r.side === 1).map((r) => r.sf)].filter((r) => r.length);
  const outlineUV = [[0, 0], [L, 0], [L, W], [0, W]];
  return { ring: outlineUV, L, W, stair: 0, cores, start, corridor: PLAN.corridor, dbl, depth, width,
           rooms: take, perFloor: per, placed: take.length, storeys: floorsOf(b), res,
           sf: take.length ? take.reduce((t, r) => t + r.sf, 0) / take.length : 0,
           footSf: footM2 * SF, runs, narrow: width < PLAN.minWidth, capped, squeezed,
           circ, cap, roomsEnd: L, rect, lon0, lat0, source: outline.source, schematic: true };
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
    // the rooms keep their generated positions, so a merged pair sits where its rooms were
    const gen = p.rooms.filter((r) => r.side === sd);
    for (let k = 0; k < counts[ri]; k++, idx++) {
      const r = fr[idx], g0 = gen[k];
      out.push({ n: idx + 1, idx, side: sd, k, u: g0.u, v: g0.v, w: g0.w, d: g0.d, sf: r.area, keep: r.keep, last: k === counts[ri] - 1 });
    }
  });
  return { p, rooms: out, fr, fj };
}
