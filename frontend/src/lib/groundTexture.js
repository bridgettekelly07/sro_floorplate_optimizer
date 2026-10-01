// The ground painted once into a canvas and laid over the terrain: water,
// land, parks, the street surfaces with their sidewalks and curbs, the
// lanes. The contour lines are drawn as geometry, not here. Everything is drawn in projection units
// through one scale transform, so widths are given in metres.
import { css } from "./colours.js";
import { landCanvas } from "./terrain.js";
import { segInside, ROAD } from "./projection.js";

// ext: the extent to paint, in projection units {x0, x1, z0, z1}; bb: the same in degrees
export function paintGround(proj, data, maxSize, ext, bb) {
  const W = ext.x1 - ext.x0, H = ext.z1 - ext.z0, mpu = proj.mPerUnit;
  const TW = Math.min(maxSize || 8192, 8192), TH = Math.round(TW * H / W);
  const cv = document.createElement("canvas");
  cv.width = TW; cv.height = TH;
  const ctx = cv.getContext("2d");
  ctx.scale(TW / W, TH / H);
  ctx.translate(-ext.x0, -ext.z0);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const m = (metres) => metres / mpu;
  const path = (pts, close) => {
    ctx.beginPath();
    pts.forEach((p, i) => { const x = proj.x(p[0]), y = proj.y(p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    if (close) ctx.closePath();
  };
  const inside = (c) => segInside(c, bb || proj.bbox);
  const { streets, ground, sidewalks, terrain } = data;

  ctx.fillStyle = css("--m3-water") || "#d9e0df";
  ctx.fillRect(ext.x0, ext.z0, W, H);
  // the land: the shoreline mask where there is one, else the land polygon
  const mask = landCanvas(terrain, css("--m3-ground") || "#f4f1ea", css("--m3-water") || "#d9e0df");
  if (mask && terrain) {
    const tb = terrain.bbox;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mask, proj.x(tb[0]), proj.y(tb[3]), proj.x(tb[2]) - proj.x(tb[0]), proj.y(tb[1]) - proj.y(tb[3]));
  } else if (ground) {
    ctx.fillStyle = css("--m3-ground") || "#f4f1ea";
    ground.land.forEach((r) => { path(r, true); ctx.fill(); });
  }
  if (ground) paintParks(ctx, proj, ground.parks, terrain, m, path, W / TW);
  // streets: the sidewalk band, then the curb as a dark edge, then the road
  if (streets) {
    const segs = streets.segments.filter((sg) => inside(sg.c));
    const pave = (sg) => (ROAD.pave[sg.u] || ROAD.pave[0]);
    ctx.strokeStyle = css("--m3-walk") || "#ece8de";
    segs.forEach((sg) => { ctx.lineWidth = m(pave(sg) + 2 * ROAD.walk); path(sg.c); ctx.stroke(); });
    ctx.strokeStyle = css("--m3-curb") || "#b9b2a3";
    segs.forEach((sg) => { ctx.lineWidth = m(pave(sg) + 0.5); path(sg.c); ctx.stroke(); });
    // a drawn line along each edge of the roadway, left standing when the road is painted over it
    ctx.strokeStyle = css("--m3-road-line") || "#2b2b2b";
    ctx.globalAlpha = parseFloat(css("--m3-road-line-a")) || 0.35;
    segs.forEach((sg) => { if (!segInside(sg.c, proj.bbox)) { ctx.lineWidth = m(pave(sg) + 1.6); path(sg.c); ctx.stroke(); } });   // the surveyed extent gets drawn curbs instead
    ctx.globalAlpha = 1;
    ctx.strokeStyle = css("--m3-road") || "#e3dfd5";
    segs.forEach((sg) => { ctx.lineWidth = m(pave(sg)); path(sg.c); ctx.stroke(); });
    if (ground) {
      ctx.strokeStyle = css("--m3-lane") || "#d3cdbf";
      ctx.lineWidth = m(ROAD.lane);
      ground.lanes.forEach((c) => { if (inside(c)) { path(c); ctx.stroke(); } });
    }
    // the City's sidewalk centrelines, where it rated them: a lighter band with a hairline at the curb side
    if (sidewalks) {
      ctx.strokeStyle = css("--m3-sidewalk") || "#f1ede3";
      ctx.lineWidth = m(1.8);
      sidewalks.forEach((pts) => { path(pts); ctx.stroke(); });
    }
  }
  return cv;
}

// The parks: shaded by the ground, the lowest part of each the darkest, with
// a meadow stipple that also darkens downhill; a flat park is one tone.
function paintParks(ctx, proj, parks, terrain, m, path, texel) {
  const hi = css("--m3-park") || "#dfe7db", lo = css("--m3-park-low") || hi, dot = css("--m3-park-stipple") || "#5f6e48";
  const H = hex(hi), L = hex(lo), r = prng(11);
  parks.forEach((p) => {
    path(p.r, true);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    p.r.forEach((q) => { const x = proj.x(q[0]), z = proj.y(q[1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
    const w = x1 - x0, h = z1 - z0;
    if (!terrain || H.join() === L.join() || w <= 0 || h <= 0) { ctx.fillStyle = hi; ctx.fill(); return; }
    // heights on a coarse grid over the park's box
    const step = Math.max(texel * 3, m(6)), cols = Math.max(2, Math.ceil(w / step) + 1), rows = Math.max(2, Math.ceil(h / step) + 1);
    const hs = new Float32Array(cols * rows);
    let mn = Infinity, mx = -Infinity;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const v = terrain.at(proj.lon(x0 + i * step), proj.lat(z0 + j * step));
      hs[j * cols + i] = v; if (v < mn) mn = v; if (v > mx) mx = v;
    }
    ctx.save(); ctx.clip();
    if (mx - mn < 0.5) { ctx.fillStyle = hi; ctx.fillRect(x0, z0, w, h); }
    else {
      const off = document.createElement("canvas"); off.width = cols; off.height = rows;
      const octx = off.getContext("2d"), img = octx.createImageData(cols, rows);
      for (let k = 0; k < cols * rows; k++) {
        const t = 1 - (hs[k] - mn) / (mx - mn);   // 1 at the bottom of the park
        img.data[k * 4] = H[0] + (L[0] - H[0]) * t; img.data[k * 4 + 1] = H[1] + (L[1] - H[1]) * t; img.data[k * 4 + 2] = H[2] + (L[2] - H[2]) * t; img.data[k * 4 + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, x0 - step / 2, z0 - step / 2, cols * step, rows * step);
    }
    // the stipple: about one mark per 30 square metres, darker the lower it sits
    const n = Math.min(80000, Math.round((w * h) / (m(1) * m(1)) / 30 * 0.6));
    ctx.fillStyle = dot;
    const size = Math.max(texel, m(1.2));
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * w, z = z0 + r() * h;
      const t = mx - mn < 0.5 ? 0.5 : 1 - (terrain.at(proj.lon(x), proj.lat(z)) - mn) / (mx - mn);
      ctx.globalAlpha = 0.2 + 0.45 * t;
      ctx.fillRect(x, z, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });
}
function hex(c) { const v = parseInt(c.replace("#", ""), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
