// Does a building stand between a point on the ground and the camera? The
// extruded blocks are prisms, so the question is answered in plan: the line of
// sight climbs from the point toward the camera, and a prism hides the point
// if the line enters its footprint while still below its roof. A coarse grid
// over the footprints keeps each test to the few blocks the line crosses.

// blocks: [{ xz: [[x,z],...], top, bb: [x0,z0,x1,z1] }] in scene units
export function blockGrid(blocks, cell) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity, top = 0;
  blocks.forEach((b) => { x0 = Math.min(x0, b.bb[0]); z0 = Math.min(z0, b.bb[1]); x1 = Math.max(x1, b.bb[2]); z1 = Math.max(z1, b.bb[3]); top = Math.max(top, b.top); });
  if (!blocks.length) return { blocks, cell, x0: 0, z0: 0, nx: 0, nz: 0, cells: [], top: 0 };
  const nx = Math.ceil((x1 - x0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1, cells = new Array(nx * nz);
  blocks.forEach((b, k) => {
    const i0 = Math.floor((b.bb[0] - x0) / cell), i1 = Math.floor((b.bb[2] - x0) / cell);
    const j0 = Math.floor((b.bb[1] - z0) / cell), j1 = Math.floor((b.bb[3] - z0) / cell);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const c = j * nx + i; (cells[c] || (cells[c] = [])).push(k); }
  });
  return { blocks, cell, x0, z0, nx, nz, cells, top };
}

function inside(p, r) {
  let k = false;
  for (let a = 0, z = r.length - 1; a < r.length; z = a++)
    if ((r[a][1] > p[1]) !== (r[z][1] > p[1]) && p[0] < (r[z][0] - r[a][0]) * (p[1] - r[a][1]) / (r[z][1] - r[a][1]) + r[a][0]) k = !k;
  return k;
}
// distance along the ray p + s·d (d a unit vector) to its first crossing of the ring's edges, or Infinity
function entry(p, d, r) {
  let best = Infinity;
  for (let a = 0, z = r.length - 1; a < r.length; z = a++) {
    const ex = r[a][0] - r[z][0], ez = r[a][1] - r[z][1], den = d[0] * ez - d[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const wx = r[z][0] - p[0], wz = r[z][1] - p[1];
    const s = (wx * ez - wz * ex) / den, t = (wx * d[1] - wz * d[0]) / den;
    if (s >= 0 && t >= 0 && t <= 1 && s < best) best = s;
  }
  return best;
}

// Is the ground point (x, y, z) hidden from a camera at cam by any block?
// `down` is for a camera looking straight down, where only a block standing on the point itself can hide it.
export function hidden(grid, x, y, z, cam, down) {
  if (!grid || !grid.blocks.length) return false;
  const { blocks, cell, x0, z0, nx, nz, cells } = grid;
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz) ? null : cells[j * nx + i];
  const p = [x, z];
  if (down) {
    const c = at(Math.floor((x - x0) / cell), Math.floor((z - z0) / cell));
    return !!c && c.some((k) => { const b = blocks[k]; return b.top > y && x >= b.bb[0] && x <= b.bb[2] && z >= b.bb[1] && z <= b.bb[3] && inside(p, b.xz); });
  }
  const hx = cam.x - x, hz = cam.z - z, D = Math.hypot(hx, hz), rise = cam.y - y;
  if (rise <= 0) return false;
  if (D < 1e-6) return hidden(grid, x, y, z, cam, true);
  const d = [hx / D, hz / D], slope = rise / D;                 // the line of sight climbs this much per unit of plan distance
  const reach = (grid.top - y) / slope;                          // past this no roof can still be above the line
  if (reach <= 0) return false;
  // walk the cells the line crosses, nearest first, so a hit close by ends the search early
  const seen = new Set();
  const step = cell * 0.5;
  for (let s = 0; s <= reach + step; s += step) {
    const sx = x + d[0] * Math.min(s, reach), sz = z + d[1] * Math.min(s, reach);
    const i = Math.floor((sx - x0) / cell), j = Math.floor((sz - z0) / cell);
    const c = at(i, j);
    if (c) for (const k of c) {
      if (seen.has(k)) continue;
      seen.add(k);
      const b = blocks[k];
      if (b.top <= y) continue;
      const sIn = inside(p, b.xz) ? 0 : entry(p, d, b.xz);
      if (sIn <= reach && y + sIn * slope < b.top) return true;
    }
    if (s > reach) break;
  }
  return false;
}
