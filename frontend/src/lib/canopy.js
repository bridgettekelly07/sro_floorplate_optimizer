// The tree canopies: lobed, opaque, in a light and a shade green, painted
// once into a texture atlas and shown on a camera-facing quad per tree.
//
// The eight canopies are the seeds picked from the variant sheet; the
// generator is the sheet's, so they draw the same here. Everything is
// deterministic: the same seed always gives the same tree.

export const CANOPY_SEEDS = [1, 8, 9, 15, 16, 17, 19, 20];
// How upright the canopies are: the lobes spread this much taller and
// 1/sqrt of it narrower. 1 is round; 1.35 is a mildly fastigiate street tree.
export const FASTIGIATE = 1.35;

function prng(seed) { let t = seed * 7919 + 17; return () => { t = (t * 9301 + 49297) % 233280; return t / 233280; }; }

// a smooth irregular blob as a list of quadratic segments [[cx, cy], [x, y]] from a start point
function blob(cx, cy, rx, ry, r, n = 8, wob = 0.2) {
  const pts = [], ph = r() * 6.283;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + ph, rr = 1 + (r() - 0.5) * 2 * wob; pts.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr]); }
  const segs = [];
  let start = null;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    if (!i) start = m;
    const nq = pts[(i + 1) % n], nn = pts[(i + 2) % n], nm = [(nq[0] + nn[0]) / 2, (nq[1] + nn[1]) / 2];
    segs.push([nq, nm]);
  }
  return { start, segs };
}

// The canopy for a seed, in a unit where the nominal radius is 1 and the
// centre is the origin: a list of blobs to fill, back to front, each marked
// light or dark. Pure, so it can be tested without a canvas.
export function canopyShape(seed, F = FASTIGIATE) {
  const r = prng(seed), rad = 1, cx = 0, cy = 0;
  const sx = 1 / Math.sqrt(F), sy = F;
  const lobes = 4 + Math.floor(r() * 4);
  const ring = rad * (0.34 + r() * 0.16);
  const lsize = rad * (0.42 + r() * 0.2);
  const wob = 0.1 + r() * 0.12;
  const shadeDir = (r() - 0.5) * 0.8;
  const shadeShare = 0.25 + r() * 0.3;
  const squash = 0.86 + r() * 0.2;
  const L = [], ph = r() * 6.283;
  for (let i = 0; i < lobes; i++) {
    const a = ph + i / lobes * 6.283 + (r() - 0.5) * 0.5, d = ring * (0.85 + r() * 0.3);
    const lx = cx + Math.cos(a) * d * sx, ly = cy + Math.sin(a) * d * squash * sy, lr = lsize * (0.85 + r() * 0.3);
    const ax = Math.cos(Math.PI / 4 + shadeDir), ay = Math.sin(Math.PI / 4 + shadeDir);
    L.push({ lx, ly, lr, sc: ((lx - cx) * ax + (ly - cy) * ay) / rad });
  }
  L.sort((a, b) => b.sc - a.sc);
  const nd = Math.max(1, Math.round(L.length * shadeShare));
  L.forEach((l, i) => { l.dark = i < nd; });
  const out = [];
  const kx = Math.sqrt(sx), ky = Math.sqrt(sy);
  L.filter((l) => l.dark).forEach((l) => out.push({ dark: true, ...blob(l.lx, l.ly, l.lr * kx, l.lr * squash * ky, r, 8, wob) }));
  L.filter((l) => !l.dark).forEach((l) => out.push({ dark: false, ...blob(l.lx, l.ly, l.lr * kx, l.lr * squash * ky, r, 8, wob) }));
  out.push({ dark: false, ...blob(cx - rad * 0.14 * sx, cy - rad * 0.16 * sy, rad * (0.5 + r() * 0.12) * kx, rad * (0.46 + r() * 0.1) * squash * ky, r, 8, wob) });
  return { lobes, shadeShare, blobs: out, aspect: F };
}

// Paint the atlas: one cell per seed, side by side, transparent background.
// `cell` is the cell width in pixels; cells are FASTIGIATE times taller than
// wide, and the tree quad is drawn with the same aspect. Returns the canvas.
export function paintCanopyAtlas(cell, light, dark, seeds = CANOPY_SEEDS) {
  const cv = document.createElement("canvas");
  cv.width = cell * seeds.length; cv.height = Math.round(cell * FASTIGIATE);
  const ctx = cv.getContext("2d");
  const scale = cell * 0.36;   // the nominal radius in pixels; lobes reach about 1.25 of it
  seeds.forEach((seed, i) => {
    const { blobs } = canopyShape(seed);
    const ox = cell * (i + 0.5), oy = cv.height * 0.5;
    blobs.forEach((b) => {
      ctx.fillStyle = b.dark ? dark : light;
      ctx.beginPath();
      ctx.moveTo(ox + b.start[0] * scale, oy + b.start[1] * scale);
      b.segs.forEach(([c, p]) => ctx.quadraticCurveTo(ox + c[0] * scale, oy + c[1] * scale, ox + p[0] * scale, oy + p[1] * scale));
      ctx.closePath(); ctx.fill();
    });
  });
  return cv;
}

// The drawn height for a recorded one. The City records trees in 10 ft
// classes and the data carries the class midpoint in metres, from 1.5 m for
// "under 10 ft" to 32 m for "100 ft and over". Drawn, the range is squeezed
// to 15 to 60 ft and weighted toward the low end: the three smallest classes
// (over half the trees) land between 15 and 22 ft, the big old trees still
// read as the biggest, and nothing stands at twice a hotel's height.
const FT = 0.3048;
const HEIGHT_MAP = [   // [recorded metres, drawn feet]
  [1.5, 15], [4.5, 18], [7.5, 22], [10.5, 27], [13.5, 32],
  [17, 38], [20, 44], [23, 49], [26, 53], [29, 56], [32, 60],
];
export function drawnHeight(h) {
  const m = HEIGHT_MAP;
  if (!(h > 0) || h <= m[0][0]) return m[0][1] * FT;
  if (h >= m[m.length - 1][0]) return m[m.length - 1][1] * FT;
  for (let i = 1; i < m.length; i++) {
    if (h <= m[i][0]) { const t = (h - m[i - 1][0]) / (m[i][0] - m[i - 1][0]); return (m[i - 1][1] + (m[i][1] - m[i - 1][1]) * t) * FT; }
  }
  return m[m.length - 1][1] * FT;
}
