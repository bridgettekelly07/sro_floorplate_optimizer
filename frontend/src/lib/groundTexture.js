// The ground painted once into a canvas and laid over the terrain: water,
// land, parks, the street surfaces with their sidewalks and curbs, the
// lanes. The contour lines are drawn as geometry, not here. Everything is drawn in projection units
// through one scale transform, so widths are given in metres.
import { css } from "./colours.js";
import { segInside, ROAD } from "./projection.js";
import { toneOf, fbm, prng, PARK } from "./parkShade.js";

// the water: a wash, cloudy at a large scale with a fine grain over it
// the water: a calm cloudy wash, and a deepening with distance from the shore
export const WATER = {
  mottle: 0.14, mottleM: 220,     // broad clouds: lightness swing and metres across
  mottle2: 0.04, mottle2M: 60,    // a faint finer layer
  deepM: 3000,                    // metres from shore over which most of the deepening happens (an exponential fall-off: 63% there, 86% at twice it)
  deep: 0.34,                     // how much darker the deep water is, far out
  washPx: 1024,
};

// ext: the extent to paint, in projection units {x0, x1, z0, z1}; bb: the same in degrees
export function paintGround(proj, data, maxSize, ext, bb, shades, shore, outline) {
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

  // the land: the traced shoreline where there is a mask, else the land polygon. The water is left clear:
  // the shader paints it from the wash and the shoreline distance field, so the edge is crisp at any zoom.
  // The land is pushed a texel and a half past the line so no clear texel blends into the shore.
  if (outline && terrain) {
    const tb = terrain.bbox, ox = proj.x(tb[0]), oz = proj.y(tb[3]);
    const sx = (proj.x(tb[2]) - ox) / terrain.land.nx, sz = (proj.y(tb[1]) - oz) / terrain.land.ny;
    ctx.fillStyle = ctx.strokeStyle = css("--m3-ground") || "#f4f1ea";
    ctx.beginPath();
    outline.forEach((r) => { r.forEach(([x, y], i) => { if (i) ctx.lineTo(ox + x * sx, oz + y * sz); else ctx.moveTo(ox + x * sx, oz + y * sz); }); ctx.closePath(); });
    ctx.lineWidth = 3 * W / TW; ctx.stroke();
    ctx.fill("evenodd");
  } else if (ground) {
    ctx.fillStyle = css("--m3-ground") || "#f4f1ea";
    ground.land.forEach((r) => { path(r, true); ctx.fill(); });
  }
  if (ground) paintParks(ctx, proj, ground.parks, terrain, m, path, W / TW, shades);
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

// The parks: each one shaded from its own contour lines (see parkShade.js),
// the tone stepping at the drawn lines and grading between them, under a
// mottled wash; a park within one band is one tone.
function paintParks(ctx, proj, parks, terrain, m, path, texel, shades) {
  const hi = css("--m3-park") || "#dfe7db", lo = css("--m3-park-low") || hi;
  const mpu = proj.mPerUnit;
  parks.forEach((p, pi) => {
    path(p.r, true);
    const sh = shades && shades.get(pi);
    if (!sh || sh.flat || hi === lo) { ctx.fillStyle = hi; ctx.fill(); return; }
    const { box } = sh;
    const step = Math.max(texel, m(1)), cols = Math.max(2, Math.ceil(box.w / step) + 1), rows = Math.max(2, Math.ceil(box.h / step) + 1);
    const r = prng(31 + pi), wash = (xm, zm) => 1 + (fbm(xm / PARK.mottleM, zm / PARK.mottleM) - 0.5) * PARK.mottle + (r() - 0.5) * PARK.grain;
    const off = document.createElement("canvas"); off.width = cols; off.height = rows;
    const octx = off.getContext("2d"), img = octx.createImageData(cols, rows), H = hex(hi);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = box.x0 + i * step, z = box.z0 + j * step, smp = sh.sample(x, z);
      const t = smp ? toneOf(smp, sh, hi, lo) : H, wsh = wash(x * mpu, z * mpu), k = (j * cols + i) * 4;
      img.data[k] = Math.min(255, t[0] * wsh); img.data[k + 1] = Math.min(255, t[1] * wsh); img.data[k + 2] = Math.min(255, t[2] * wsh); img.data[k + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.save(); ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, box.x0 - step / 2, box.z0 - step / 2, cols * step, rows * step);
    ctx.restore();
  });
}
// The water wash: the base colour with a cloudy lightness variation at two
// scales, a function of position in metres, so any two canvases of it join
// without a seam. Painted at a modest resolution and stretched; the clouds
// are tens of metres across, so nothing is lost.
export function waterWash(colour, x0, z0, w, h, mpu, px, shore) {
  const C = hex(colour), pw = px, ph = Math.max(2, Math.round(pw * h / w));
  const cv = document.createElement("canvas"); cv.width = pw; cv.height = ph;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(pw, ph);
  for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
    const xm = (x0 + i / pw * w) * mpu, zm = (z0 + j / ph * h) * mpu;
    const v = (fbm(xm / WATER.mottleM, zm / WATER.mottleM) - 0.5) * WATER.mottle + (fbm(xm / WATER.mottle2M + 7, zm / WATER.mottle2M + 3) - 0.5) * WATER.mottle2;
    // deeper away from the shore: darker and a little bluer, fading in steadily all the way out
    let t = 0;
    if (shore) t = 1 - Math.exp(-Math.max(0, shore.at(x0 + i / pw * w, z0 + j / ph * h)) / WATER.deepM);
    const deep = 1 - WATER.deep * t;
    const k = (j * pw + i) * 4;
    img.data[k] = Math.max(0, Math.min(255, C[0] * (1 + v * 1.15) * (deep - 0.06 * t)));
    img.data[k + 1] = Math.max(0, Math.min(255, C[1] * (1 + v) * (deep - 0.03 * t)));
    img.data[k + 2] = Math.max(0, Math.min(255, C[2] * (1 + v * 0.8) * deep));
    img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
function hex(c) { const v = parseInt(c.replace("#", ""), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
