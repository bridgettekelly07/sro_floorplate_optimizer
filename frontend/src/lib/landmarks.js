// Buildings the footprints and LiDAR heights cannot describe: a point that
// falls inside the footprint, the height its base is drawn to, and what
// stands on it. Render-time only; the data files are untouched.
export const LANDMARKS = [
  {
    name: "Science World",
    lon: -123.10385, lat: 49.27338,
    baseH: 12,                              // the round two-storey base; the LiDAR reads the top of the dome, 45 m
    dome: { r: 28, lift: 6, detail: 3 },    // the geodesic sphere, drawn a fifth over its 47 m and raised so it sits on the base rather than in it
  },
];

// is a point inside a ring?
export function within(c, r) {
  let k = false;
  for (let a = 0, z = r.length - 1; a < r.length; z = a++) {
    if ((r[a][1] > c[1]) !== (r[z][1] > c[1]) && c[0] < (r[z][0] - r[a][0]) * (c[1] - r[a][1]) / (r[z][1] - r[a][1]) + r[a][0]) k = !k;
  }
  return k;
}

// the landmark whose point falls in a footprint, or null
export function landmarkOf(ring) {
  for (const l of LANDMARKS) if (within([l.lon, l.lat], ring)) return l;
  return null;
}

// The centre and radius of the round part of a footprint, in the ring's own
// units scaled by `kx, ky` to metres: of the circles through every third
// vertex triple, the one the most vertices lie on (within `tol` metres),
// refitted by least squares through those vertices, so a wing or a porch on
// the ring is left out. Returns { x, y } in ring units and `r` in metres.
export function roundCentre(ring, kx = 1, ky = 1, tol = 1.5) {
  const pts = ring.map(([x, y]) => [x * kx, y * ky]), n = pts.length;
  let best = null, bestN = -1;
  const step = n > 40 ? 2 : 1;
  for (let i = 0; i < n; i += step) for (let j = i + step; j < n; j += step) for (let k = j + step; k < n; k += step) {
    const c = through(pts[i], pts[j], pts[k]);
    if (!c || c.r < 8 || c.r > 200) continue;
    let m = 0;
    for (const [x, y] of pts) if (Math.abs(Math.hypot(x - c.x, y - c.y) - c.r) < tol) m++;
    if (m > bestN) { bestN = m; best = c; }
  }
  if (!best) best = fitCircle(pts);
  const keep = pts.filter(([x, y]) => Math.abs(Math.hypot(x - best.x, y - best.y) - best.r) < tol * 2);
  const fit = keep.length >= 3 ? fitCircle(keep) : best;
  return { x: fit.x / kx, y: fit.y / ky, r: fit.r };
}
// the circle through three points, or null when they are in a line
function through(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
  const x = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
  const y = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
  return { x, y, r: Math.hypot(a[0] - x, a[1] - y) };
}
// Kåsa's algebraic circle fit, about the points' mean so large coordinates keep their precision
function fitCircle(pts) {
  const n = pts.length, mx = pts.reduce((t, q) => t + q[0], 0) / n, my = pts.reduce((t, q) => t + q[1], 0) / n;
  const p = pts.map(([x, y]) => [x - mx, y - my]);
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  for (const [x, y] of p) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; }
  // solve [sxx sxy sx; sxy syy sy; sx sy n] [a b c] = [sxz syz sz] for x^2 + y^2 = a x + b y + c
  const m = [[sxx, sxy, sx, sxz], [sxy, syy, sy, syz], [sx, sy, n, sz]];
  for (let i = 0; i < 3; i++) {
    let piv = i; for (let r = i + 1; r < 3; r++) if (Math.abs(m[r][i]) > Math.abs(m[piv][i])) piv = r;
    [m[i], m[piv]] = [m[piv], m[i]];
    for (let r = 0; r < 3; r++) if (r !== i) { const f = m[r][i] / m[i][i]; for (let c = i; c < 4; c++) m[r][c] -= f * m[i][c]; }
  }
  const a = m[0][3] / m[0][0], b = m[1][3] / m[1][1], c = m[2][3] / m[2][2];
  return { x: a / 2 + mx, y: b / 2 + my, r: Math.sqrt(Math.max(0, c + (a * a + b * b) / 4)) };
}

// the unique edges of an indexed or non-indexed triangle geometry, as [x0,y0,z0,x1,y1,z1,...]
export function triangleEdges(positions, index) {
  const seen = new Set(), out = [];
  const key = (a, b) => a < b ? a + ":" + b : b + ":" + a;
  const pt = (i) => [positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]];
  const n = index ? index.length : positions.length / 3;
  const at = (i) => index ? index[i] : i;
  for (let t = 0; t < n; t += 3) {
    const tri = [at(t), at(t + 1), at(t + 2)];
    for (let e = 0; e < 3; e++) {
      const a = tri[e], b = tri[(e + 1) % 3];
      // a non-indexed geometry repeats vertices, so key on the coordinates
      const pa = pt(a), pb = pt(b), k = index ? key(a, b) : key(pa.join(","), pb.join(","));
      if (seen.has(k)) continue;
      seen.add(k); out.push(...pa, ...pb);
    }
  }
  return out;
}
