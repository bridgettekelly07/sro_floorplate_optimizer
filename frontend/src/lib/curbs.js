// Curb lines as geometry: each street centreline offset to both edges of its
// paved width, then trimmed wherever it would run inside another street's
// paving, so the lines stop at the junction instead of crossing it.
//
// streets: [{ pts: [[x, z], ...] in scene units, hw: half the paved width in
// scene units }]. Returns runs of points, one array per kept stretch of curb,
// sampled every `step` scene units so a caller can drape them on the ground.

export function curbRuns(streets, step, opt = {}) {
  const slack = opt.slack == null ? 0 : opt.slack;   // shrinks the other street's band before testing (scene units)
  const grid = makeGrid(streets);
  const runs = [];
  streets.forEach((st, si) => {
    const p = st.pts;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len === 0) continue;
      const nx = -dz / len, nz = dx / len;
      for (const side of [1, -1]) {
        const ox = nx * st.hw * side, oz = nz * st.hw * side;
        const n = Math.max(1, Math.ceil(len / step));
        let run = null;
        for (let k = 0; k <= n; k++) {
          const t = k / n, x = a[0] + dx * t + ox, z = a[1] + dz * t + oz;
          if (grid.inside(x, z, si, slack)) { if (run && run.length > 1) runs.push(run); run = null; continue; }
          (run || (run = [])).push([x, z]);
        }
        if (run && run.length > 1) runs.push(run);
      }
    }
  });
  return runs;
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
