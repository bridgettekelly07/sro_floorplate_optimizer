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
  if (ground) {
    ctx.fillStyle = css("--m3-park") || "#dfe7db";
    ground.parks.forEach((p) => { path(p.r, true); ctx.fill(); });
  }
  // streets: the sidewalk band, then the curb as a dark edge, then the road
  if (streets) {
    const segs = streets.segments.filter((sg) => inside(sg.c));
    const pave = (sg) => (ROAD.pave[sg.u] || ROAD.pave[0]);
    ctx.strokeStyle = css("--m3-walk") || "#ece8de";
    segs.forEach((sg) => { ctx.lineWidth = m(pave(sg) + 2 * ROAD.walk); path(sg.c); ctx.stroke(); });
    ctx.strokeStyle = css("--m3-curb") || "#b9b2a3";
    segs.forEach((sg) => { ctx.lineWidth = m(pave(sg) + 0.5); path(sg.c); ctx.stroke(); });
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
