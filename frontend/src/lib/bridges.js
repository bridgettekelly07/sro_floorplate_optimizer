// The False Creek bridges, built from the street centrelines the City names
// as bridges: each a deck ribbon that climbs from the approach grade to its
// clearance over the water and down again, on piers where it stands over
// water. Pure geometry here; the scene wraps it in meshes.

export const BRIDGES = [
  { match: /GRANVILLE BRIDGE/, clearance: 27, width: 27 },
  { match: /BURRARD BRIDGE/, clearance: 27, width: 27, towers: true },
  { match: /CAMBIE BRIDGE/, clearance: 12, width: 27 },
];
export const DECK = { thickness: 2.2, grade: 0.06, sample: 12, pierEvery: 70, pierWide: 3, rampWidth: 11, tower: { along: 8, above: 10 } };

// Join a bridge's segments into chains wherever they share an endpoint, so a
// deck is one polyline. Chains split at junctions; the longest is the main
// deck and the rest are ramps. Points are [lon, lat].
export function bridgeChains(segments) {
  const key = (p) => p[0].toFixed(6) + "," + p[1].toFixed(6);
  const ends = new Map();
  segments.forEach((s, i) => { [s.c[0], s.c[s.c.length - 1]].forEach((p) => { const k = key(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); }); });
  const used = new Set(), chains = [];
  const extend = (pts, forward) => {
    for (;;) {
      const p = forward ? pts[pts.length - 1] : pts[0], list = ends.get(key(p)) || [];
      const next = list.filter((i) => !used.has(i));
      if (list.length !== 2 || next.length !== 1) return;          // a junction or a free end
      const s = segments[next[0]], c = s.c.slice();
      used.add(next[0]);
      if (key(c[0]) !== key(p)) c.reverse();
      if (forward) pts.push(...c.slice(1)); else pts.unshift(...c.slice(0, -1).reverse());
    }
  };
  segments.forEach((s, i) => {
    if (used.has(i)) return;
    used.add(i);
    const pts = s.c.slice();
    extend(pts, true); extend(pts, false);
    chains.push(pts);
  });
  return chains;
}

// The polyline with points added so no stretch is longer than `step`: the
// City's bridge centrelines can run 600 m on two vertices, and the deck
// profile and the ground under it are read at the points.
export function densify(xz, step) {
  const out = [xz[0]];
  for (let i = 1; i < xz.length; i++) {
    const a = xz[i - 1], b = xz[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return out;
}

// Arc length along a polyline in scene units
export function arcLengths(xz) {
  const s = [0];
  for (let i = 1; i < xz.length; i++) s.push(s[i - 1] + Math.hypot(xz[i][0] - xz[i - 1][0], xz[i][1] - xz[i - 1][1]));
  return s;
}

// The deck height at each point, metres: never below the ground, climbing at
// the grade from each end's height toward the clearance, so a short ramp is a
// slope and a long span a flat deck. hA and hB are the end heights.
export function deckHeights(s, ground, hA, hB, top, grade = DECK.grade) {
  const L = s[s.length - 1];
  return s.map((d, i) => Math.max(ground[i], Math.min(top, hA + grade * d, hB + grade * (L - d))));
}

// The stretches of a deck that stand above the ground by more than `lift`
// metres, as index ranges [from, to]. Each stretch keeps the point where it
// meets the ground, so the slab lands on the road rather than stopping short.
// Where the deck lies at grade the road surface carries on and nothing is drawn.
export function aboveRuns(y, ground, lift = 0.3) {
  const up = y.map((v, i) => v - ground[i] > lift), runs = [];
  let from = null;
  for (let i = 0; i < y.length; i++) {
    if (up[i] && from === null) from = Math.max(0, i - 1);
    if (!up[i] && from !== null) { runs.push([from, i]); from = null; }
  }
  if (from !== null) runs.push([from, y.length - 1]);
  return runs.filter(([a, b]) => b > a);
}

// A ribbon of the given width along the polyline at the given heights, as a
// closed box (top, bottom, two sides, two ends). Returns the triangle
// positions and the ink edges along the four long corners.
export function ribbon(xz, y, width, thickness) {
  const n = xz.length, hw = width / 2, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = xz[Math.max(0, i - 1)], b = xz[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    L.push([xz[i][0] + nx * hw, xz[i][1] + nz * hw]); R.push([xz[i][0] - nx * hw, xz[i][1] - nz * hw]);
  }
  const pos = [], edge = [];
  const quad = (p, q, r, t) => { pos.push(...p, ...q, ...r, ...p, ...r, ...t); };
  for (let i = 1; i < n; i++) {
    const yt0 = y[i - 1], yt1 = y[i], yb0 = yt0 - thickness, yb1 = yt1 - thickness;
    const Lt0 = [L[i - 1][0], yt0, L[i - 1][1]], Lt1 = [L[i][0], yt1, L[i][1]], Rt0 = [R[i - 1][0], yt0, R[i - 1][1]], Rt1 = [R[i][0], yt1, R[i][1]];
    const Lb0 = [L[i - 1][0], yb0, L[i - 1][1]], Lb1 = [L[i][0], yb1, L[i][1]], Rb0 = [R[i - 1][0], yb0, R[i - 1][1]], Rb1 = [R[i][0], yb1, R[i][1]];
    quad(Lt0, Lt1, Rt1, Rt0); quad(Rb0, Rb1, Lb1, Lb0);      // top, bottom
    quad(Lb0, Lb1, Lt1, Lt0); quad(Rt0, Rt1, Rb1, Rb0);      // sides
    edge.push(...Lt0, ...Lt1, ...Rt0, ...Rt1, ...Lb0, ...Lb1, ...Rb0, ...Rb1);
  }
  // the ends
  const cap = (i) => { const yt = y[i], yb = yt - thickness; quad([L[i][0], yb, L[i][1]], [L[i][0], yt, L[i][1]], [R[i][0], yt, R[i][1]], [R[i][0], yb, R[i][1]]);
    edge.push(L[i][0], yb, L[i][1], L[i][0], yt, L[i][1], R[i][0], yb, R[i][1], R[i][0], yt, R[i][1]); };
  cap(0); cap(n - 1);
  return { pos, edge, L, R };
}

// A box standing on the ground: footprint centred at (x, z) with half sizes
// along the deck (ha, in the direction d) and across (hb), from y0 to y1.
export function pillar(x, z, d, ha, hb, y0, y1) {
  const nx = -d[1], nz = d[0];
  const c = [[x + d[0] * ha + nx * hb, z + d[1] * ha + nz * hb], [x - d[0] * ha + nx * hb, z - d[1] * ha + nz * hb],
             [x - d[0] * ha - nx * hb, z - d[1] * ha - nz * hb], [x + d[0] * ha - nx * hb, z + d[1] * ha - nz * hb]];
  const pos = [], edge = [];
  for (let i = 0; i < 4; i++) {
    const p = c[i], q = c[(i + 1) % 4];
    pos.push(p[0], y0, p[1], q[0], y0, q[1], q[0], y1, q[1], p[0], y0, p[1], q[0], y1, q[1], p[0], y1, p[1]);
    edge.push(p[0], y0, p[1], p[0], y1, p[1], p[0], y1, p[1], q[0], y1, q[1]);
  }
  pos.push(c[0][0], y1, c[0][1], c[1][0], y1, c[1][1], c[2][0], y1, c[2][1], c[0][0], y1, c[0][1], c[2][0], y1, c[2][1], c[3][0], y1, c[3][1]);
  return { pos, edge };
}

// The point and direction at arc length d along the polyline
export function along(xz, s, d) {
  for (let i = 1; i < s.length; i++) {
    if (d <= s[i] || i === s.length - 1) {
      const t = (d - s[i - 1]) / Math.max(1e-9, s[i] - s[i - 1]);
      const dx = xz[i][0] - xz[i - 1][0], dz = xz[i][1] - xz[i - 1][1], l = Math.hypot(dx, dz) || 1;
      return { x: xz[i - 1][0] + dx * t, z: xz[i - 1][1] + dz * t, d: [dx / l, dz / l], i };
    }
  }
  return null;
}
