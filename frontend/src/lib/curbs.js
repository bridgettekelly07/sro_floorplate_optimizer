// Curb lines as geometry: each street centreline offset to both edges of its
// paved width, with mitred corners where the centreline bends, then trimmed
// wherever it would run inside another street's paving, so the lines stop at
// the junction instead of crossing it. Every cut lands exactly on the other
// street's edge, so two curbs meeting at a corner close it.
//
// streets: [{ pts: [[x, z], ...] in scene units, hw: half the paved width in
// scene units }]. Returns runs of points, one array per kept stretch of curb,
// sampled every `step` scene units so a caller can drape them on the ground.

export function curbRuns(streets, step, opt = {}) {
  const slack = opt.slack == null ? 0 : opt.slack;   // shrinks the other street's band before testing (scene units)
  const grid = makeGrid(streets);
  const runs = [];
  streets.forEach((st, si) => {
    for (const side of [1, -1]) {
      const edge = offsetPolyline(st.pts, st.hw * side);
      if (edge.length < 2) continue;
      const inside = (q) => grid.inside(q[0], q[1], si, slack);
      let run = null, prev = null, prevIn = false;
      const push = (q) => { (run || (run = [])).push(q); };
      const close = () => { if (run && run.length > 1) runs.push(run); run = null; };
      for (let i = 1; i < edge.length; i++) {
        const a = edge[i - 1], b = edge[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len === 0) continue;
        const n = Math.max(1, Math.ceil(len / step));
        for (let k = (i === 1 ? 0 : 1); k <= n; k++) {
          const t = k / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], qIn = inside(q);
          if (prev && qIn !== prevIn) {
            // the edge crosses the other street's boundary between prev and q: land a point on it
            const hit = bisect(prev, q, inside, prevIn);
            if (prevIn) { push(hit); } else { push(hit); close(); }
          }
          if (!qIn) push(q); else if (!prev || !prevIn) close();
          prev = q; prevIn = qIn;
        }
      }
      close();
    }
  });
  return runs;
}

// the point on the boundary between an outside point and an inside one, found to a hair, placed just outside
function bisect(p, q, inside, pIn) {
  let out = pIn ? q : p, inn = pIn ? p : q;
  for (let n = 0; n < 24; n++) {
    const m = [(out[0] + inn[0]) / 2, (out[1] + inn[1]) / 2];
    if (inside(m)) inn = m; else out = m;
  }
  return out;
}

// a polyline offset to one side by d, with mitred corners (limited, so a hairpin does not spike)
export function offsetPolyline(pts, d) {
  const p = pts.filter((q, i) => i === 0 || q[0] !== pts[i - 1][0] || q[1] !== pts[i - 1][1]);
  if (p.length < 2) return [];
  const normal = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return [-dz / l, dx / l]; };
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const nPrev = i > 0 ? normal(p[i - 1], p[i]) : null, nNext = i < p.length - 1 ? normal(p[i], p[i + 1]) : null;
    if (!nPrev || !nNext) { const n = nPrev || nNext; out.push([p[i][0] + n[0] * d, p[i][1] + n[1] * d]); continue; }
    // the mitre direction is the mean of the two normals, scaled so the offset to each segment is d
    let mx = nPrev[0] + nNext[0], mz = nPrev[1] + nNext[1];
    const ml = Math.hypot(mx, mz);
    if (ml < 1e-9) { out.push([p[i][0] + nPrev[0] * d, p[i][1] + nPrev[1] * d]); continue; }
    mx /= ml; mz /= ml;
    const cosHalf = mx * nPrev[0] + mz * nPrev[1];
    const scale = Math.min(4, 1 / Math.max(1e-6, cosHalf));   // the mitre limit
    out.push([p[i][0] + mx * d * scale, p[i][1] + mz * d * scale]);
  }
  return out;
}

// the distance from a point to a segment
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

// a coarse grid of the street segments, to ask which streets are near a point
function makeGrid(streets) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity, maxHw = 0;
  streets.forEach((st) => { st.pts.forEach(([x, z]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }); maxHw = Math.max(maxHw, st.hw); });
  const cell = Math.max(1e-9, maxHw * 6), nx = Math.max(1, Math.ceil((maxX - minX) / cell) + 1), nz = Math.max(1, Math.ceil((maxZ - minZ) / cell) + 1);
  const cells = new Map();
  const key = (i, j) => i * nz + j;
  streets.forEach((st, si) => {
    for (let i = 1; i < st.pts.length; i++) {
      const a = st.pts[i - 1], b = st.pts[i];
      const i0 = Math.floor((Math.min(a[0], b[0]) - st.hw - minX) / cell), i1 = Math.floor((Math.max(a[0], b[0]) + st.hw - minX) / cell);
      const j0 = Math.floor((Math.min(a[1], b[1]) - st.hw - minZ) / cell), j1 = Math.floor((Math.max(a[1], b[1]) + st.hw - minZ) / cell);
      for (let ci = Math.max(0, i0); ci <= Math.min(nx - 1, i1); ci++) for (let cj = Math.max(0, j0); cj <= Math.min(nz - 1, j1); cj++) {
        const k = key(ci, cj);
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push([si, i - 1]);
      }
    }
  });
  return {
    // is the point inside the paving of any street other than `skip`?
    inside(x, z, skip, slack) {
      const ci = Math.floor((x - minX) / cell), cj = Math.floor((z - minZ) / cell);
      const list = cells.get(key(ci, cj));
      if (!list) return false;
      for (const [si, i] of list) {
        if (si === skip) continue;
        const st = streets[si], a = st.pts[i], b = st.pts[i + 1];
        if (segDist(x, z, a[0], a[1], b[0], b[1]) < st.hw - slack) return true;
      }
      return false;
    },
  };
}
