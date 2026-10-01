// How a park is shaded: tone bands that step at the drawn contour levels and
// grade within each band toward the line below, a mottled wash over that,
// and a seeded field of short grass strokes, denser and darker downhill.
// Pure, so the painter and the stroke geometry share one reading of a park.

export const PARK = {
  grade: 0.55,      // how far a band darkens toward the next one down, within the step
  mottle: 0.14,     // peak-to-peak lightness swing of the cloudy wash
  mottleM: 16,      // metres per mottle cell
  grain: 0.04,      // fine per-sample grain
  strokePer: 45,    // square metres per grass stroke
  strokeLen: [1.6, 3.2],   // metres
  strokeLean: -0.4, // radians from horizontal, leaning left
  strokeSpread: 0.9,
  strokeMix: [0.35, 0.75], // how far a stroke's colour goes from the ground tone to the stroke colour, high to low ground
  // how much of the high-to-low ramp a park uses, by how many bands it spans:
  // a park crossed by one or two lines keeps its tones close, more relief gets the full range
  reachBySpan: { 1: 0.35, 2: 0.6 },
};

// a small deterministic generator (mulberry32)
export function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// value noise with three octaves, in [0, 1]
function hash2(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function fbm(x, y) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < 3; i++) { v += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.1; }
  return v / n;
}

export const hex = (c) => { const v = parseInt(c.replace("#", ""), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// The shading for one park. `levels` are the drawn contour heights, sorted;
// `heights` are samples of the ground inside the park, to find its band range.
export function parkShading(levels, heights, hi, lo, opt = PARK) {
  const band = (v) => { let a = 0, b = levels.length; while (a < b) { const m = (a + b) >> 1; if (levels[m] <= v) a = m + 1; else b = m; } return a; };
  let bmin = Infinity, bmax = -Infinity;
  heights.forEach((h) => { const b = band(h); if (b < bmin) bmin = b; if (b > bmax) bmax = b; });
  const span = Math.max(1, bmax - bmin), H = hex(hi), L = hex(lo);
  const flat = bmax === bmin;
  // 0 on the high ground, 1 in the lowest band
  const lowness = (h) => (flat ? 0 : (bmax - band(h)) / span);
  // the band tone, graded toward the band below within the step
  const tone = (h) => {
    if (flat) return H;
    const b = band(h), i = (bmax - b) / span, below = Math.min(1, (bmax - b + 1) / span);
    const step = levels.length ? (b > 0 && b < levels.length ? levels[b] - levels[b - 1] : 2) : 2;
    const f = b > 0 && b <= levels.length ? (h - levels[b - 1]) / step : 0.5;   // 0 at the line below, 1 at the line above
    return mix(mix(H, L, i), mix(H, L, below), (1 - Math.max(0, Math.min(1, f))) * opt.grade);
  };
  // the wash: a cloudy multiplier around 1, plus grain
  const wash = (xm, zm, r) => 1 + (fbm(xm / opt.mottleM, zm / opt.mottleM) - 0.5) * opt.mottle + ((r ? r() : 0.5) - 0.5) * opt.grain;
  return { band, bmin, bmax, flat, lowness, tone, wash };
}

// An exact Euclidean distance transform (Felzenszwalb and Huttenlocher):
// for a raster where `on[k]` marks cells on a line, the distance in cells from
// every cell to the nearest marked one. Linear in the number of cells.
export function distanceTransform(on, cols, rows) {
  const INF = 1e20, f = new Float64Array(Math.max(cols, rows)), d = new Float64Array(Math.max(cols, rows));
  const v = new Int32Array(Math.max(cols, rows)), z = new Float64Array(Math.max(cols, rows) + 1);
  const out = new Float32Array(cols * rows);
  const pass1 = (n) => {   // 1-D squared distance of f into d
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) {
      let sIntersect = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (sIntersect <= z[k]) { k--; sIntersect = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = sIntersect; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  };
  // columns, then rows
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) f[j] = on[j * cols + i] ? 0 : INF;
    pass1(rows);
    for (let j = 0; j < rows; j++) out[j * cols + i] = d[j];
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) f[i] = out[j * cols + i];
    pass1(cols);
    for (let i = 0; i < cols; i++) out[j * cols + i] = Math.sqrt(d[i]);
  }
  return out;
}

// The shading of one park, read from the contour lines alone. The lines are
// drawn into a raster over the park and the cells between them flood-filled
// into regions; each region's band comes from the levels of the lines around
// it (the heightfield only breaks a tie), and within a region the gradient
// runs by distance from the lower bounding line to the upper one. So the tone
// steps exactly at the drawn lines and grades along their shape. The result
// is two rasters, band and place-in-band, with no colour in them, so it can
// be kept across theme changes.
//
//   box:    { x0, z0, w, h } in scene units
//   res:    raster cell, scene units
//   segs:   [{ ax, az, bx, bz, z }] contour segments near the park, scene units
//   step:   the contour interval in metres
//   ring:   the park outline, [[x, z], ...] in scene units
//   height: (x, z) => metres, the gridded heightfield, for ties only
export function shadePark(box, res, segs, step, ring, height) {
  const cols = Math.max(2, Math.ceil(box.w / res) + 1), rows = Math.max(2, Math.ceil(box.h / res) + 1), n = cols * rows;
  const px = (x) => Math.round((x - box.x0) / res), pz = (z) => Math.round((z - box.z0) / res);
  // 1. the park itself, scan-filled from its outline
  const inPark = new Uint8Array(n), xs = [];
  const R = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring;
  for (let j = 0; j < rows; j++) {
    const z = box.z0 + j * res; xs.length = 0;
    for (let i = 0, m = R.length; i < m; i++) {
      const a = R[i], b = R[(i + 1) % m];
      if ((a[1] <= z) !== (b[1] <= z)) xs.push(a[0] + (z - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      const i0 = Math.max(0, Math.ceil((xs[q] - box.x0) / res)), i1 = Math.min(cols - 1, Math.floor((xs[q + 1] - box.x0) / res));
      for (let i = i0; i <= i1; i++) inPark[j * cols + i] = 1;
    }
  }
  // 2. the lines, drawn into the raster; wall[k] = level index + 1, 0 for open ground
  const levels = [...new Set(segs.map((sg) => sg.z))].sort((a, b) => a - b), li = new Map(levels.map((z, i) => [z, i]));
  const wall = new Uint8Array(n);
  segs.forEach((sg) => {
    let x0 = px(sg.ax), z0 = pz(sg.az); const x1 = px(sg.bx), z1 = pz(sg.bz), v = li.get(sg.z) + 1;
    const dx = Math.abs(x1 - x0), dz = -Math.abs(z1 - z0), sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
    let err = dx + dz;
    for (let guard = 0; guard < 1e5; guard++) {
      if (x0 >= 0 && x0 < cols && z0 >= 0 && z0 < rows) wall[z0 * cols + x0] = v;
      if (x0 === x1 && z0 === z1) break;
      const e2 = 2 * err;
      if (e2 >= dz) { err += dz; x0 += sx; }
      if (e2 <= dx) { err += dx; z0 += sz; }
    }
  });
  // 3. regions between the lines, inside the park
  const region = new Int32Array(n).fill(-1), regions = [];
  const stack = new Int32Array(n), wallA = new Int32Array(n).fill(-1), wallB = new Int32Array(n).fill(-1);
  const visit = (m, id, Rg) => {
    if (wall[m]) { Rg.walls.add(wall[m] - 1); if (wallA[m] === -1) wallA[m] = id; else if (wallA[m] !== id && wallB[m] === -1) wallB[m] = id; return -1; }
    if (region[m] !== -1 || !inPark[m]) return -1;
    region[m] = id; return m;
  };
  for (let k0 = 0; k0 < n; k0++) {
    if (region[k0] !== -1 || wall[k0] || !inPark[k0]) continue;
    const id = regions.length, Rg = { walls: new Set(), hsum: 0, hn: 0 };
    regions.push(Rg);
    let top = 0; stack[top++] = k0; region[k0] = id;
    while (top) {
      const k = stack[--top], i = k % cols, j = (k - i) / cols;
      if ((Rg.hn & 7) === 0) Rg.hsum += height(box.x0 + i * res, box.z0 + j * res);
      Rg.hn++;
      let m;
      if (i > 0 && (m = visit(k - 1, id, Rg)) >= 0) stack[top++] = m;
      if (i < cols - 1 && (m = visit(k + 1, id, Rg)) >= 0) stack[top++] = m;
      if (j > 0 && (m = visit(k - cols, id, Rg)) >= 0) stack[top++] = m;
      if (j < rows - 1 && (m = visit(k + cols, id, Rg)) >= 0) stack[top++] = m;
    }
  }
  // 4. each region's band: the index of the lower bounding level. Between two
  // lines it is the lower one. Beside a single line, the region across that
  // line decides: whichever reads higher on the heightfield is the upper one
  // (both share the heightfield's bias, so it cancels). With no neighbour
  // across, or no lines at all, the heightfield decides alone.
  const across = regions.map(() => new Set());
  for (let k = 0; k < n; k++) if (wallA[k] !== -1 && wallB[k] !== -1) { across[wallA[k]].add(wallB[k]); across[wallB[k]].add(wallA[k]); }
  const meanOf = (Rg) => Rg.hsum / Math.max(1, Math.ceil(Rg.hn / 8));
  const bandOf = regions.map((Rg, id) => {
    const w = [...Rg.walls].sort((a, b) => a - b), hbar = meanOf(Rg);
    if (w.length >= 2) return w[0];
    if (w.length === 1) {
      let other = null; across[id].forEach((o) => { if (other === null || regions[o].hn > regions[other].hn) other = o; });
      if (other !== null) return hbar >= meanOf(regions[other]) ? w[0] : w[0] - 1;
      return hbar >= levels[w[0]] ? w[0] : w[0] - 1;
    }
    let b = -1; for (let i = 0; i < levels.length; i++) if (levels[i] <= hbar) b = i; return b;
  });
  let bmin = Infinity, bmax = -Infinity;
  bandOf.forEach((b) => { if (b < bmin) bmin = b; if (b > bmax) bmax = b; });
  if (!regions.length) { bmin = bmax = 0; }
  const flat = bmax <= bmin;
  // 5. the band of every cell (walls take the lower neighbouring band) and, for
  // the bands in use, the distance to each bounding level by distance transform
  const band = new Int8Array(n).fill(-128);
  for (let k = 0; k < n; k++) {
    if (region[k] !== -1) { band[k] = bandOf[region[k]]; continue; }
    if (!wall[k] && !inPark[k]) continue;
    let b = 127; const i = k % cols;
    if (i > 0 && region[k - 1] !== -1) b = Math.min(b, bandOf[region[k - 1]]);
    if (i < cols - 1 && region[k + 1] !== -1) b = Math.min(b, bandOf[region[k + 1]]);
    if (k >= cols && region[k - cols] !== -1) b = Math.min(b, bandOf[region[k - cols]]);
    if (k + cols < n && region[k + cols] !== -1) b = Math.min(b, bandOf[region[k + cols]]);
    if (b !== 127) band[k] = b;
  }
  const place = new Uint8Array(n);   // 0 at the lower line .. 255 at the upper
  if (!flat) {
    const used = new Set(); bandOf.forEach((b) => { used.add(b); used.add(b + 1); });
    const dist = new Map(), on = new Uint8Array(n);
    used.forEach((lv) => {
      if (lv < 0 || lv >= levels.length) return;
      on.fill(0); let any = false;
      for (let k = 0; k < n; k++) if (wall[k] === lv + 1) { on[k] = 1; any = true; }
      if (any) dist.set(lv, distanceTransform(on, cols, rows));
    });
    for (let k = 0; k < n; k++) {
      const b = band[k]; if (b === -128) continue;
      const dL = dist.get(b), dH = dist.get(b + 1);
      let f;
      if (dL && dH) f = dL[k] / (dL[k] + dH[k] || 1);
      else {   // a band with only one bounding line in the park: the heightfield fills in
        const i = k % cols, j = (k - i) / cols, lower = b >= 0 && b < levels.length ? levels[b] : (levels[0] || 0) - step;
        f = (height(box.x0 + i * res, box.z0 + j * res) - lower) / step;
      }
      place[k] = Math.max(0, Math.min(255, Math.round(f * 255)));
    }
  }
  return {
    levels, bmin, bmax, flat, cols, rows, res, box,
    sample(x, z) {
      const i = px(x), j = pz(z);
      if (i < 0 || j < 0 || i >= cols || j >= rows) return null;
      const k = j * cols + i, b = band[k];
      if (b === -128) return null;
      return { band: b, f: place[k] / 255, lowness: flat ? 0 : (bmax - b) / (bmax - bmin) };
    },
  };
}

// the tone for a sample: the band's colour graded toward the band below within the step
export function toneOf(sampleResult, shadeRange, hi, lo, grade = PARK.grade) {
  const H = hex(hi), { band, f, lowness } = sampleResult, span = Math.max(1, shadeRange.bmax - shadeRange.bmin);
  if (shadeRange.flat) return H;
  const L = mix(H, hex(lo), PARK.reachBySpan[span] == null ? 1 : PARK.reachBySpan[span]);   // the low tone this park reaches
  const here = mix(H, L, lowness), below = mix(H, L, Math.min(1, (shadeRange.bmax - band + 1) / span));
  return mix(here, below, (1 - Math.max(0, Math.min(1, f))) * grade);
}
