// Equirectangular projection onto a 1000-unit-wide drawing: exact enough
// across ~3 km at this latitude.
export function makeProj(bbox) {
  const lat0 = (bbox[1] + bbox[3]) / 2, k = Math.cos(lat0 * Math.PI / 180);
  const w = (bbox[2] - bbox[0]) * k, h = bbox[3] - bbox[1];
  const W = 1000, H = Math.round(W * h / w);
  return {
    W, H, k, bbox,
    x: (lon) => (lon - bbox[0]) * k / w * W,
    y: (lat) => H - (lat - bbox[1]) / h * H,
    lon: (x) => bbox[0] + x / W * w / k,
    lat: (y) => bbox[1] + (H - y) / H * h,
    mPerUnit: (bbox[2] - bbox[0]) * k * 111320 / W
  };
}

// The street extract runs wider than the stock; the drawing is framed on the buildings.
export function mapBbox(surveyed, fallback) {
  const pts = surveyed.filter((b) => b.lon != null);
  if (pts.length < 2) return fallback;
  const lons = pts.map((b) => b.lon), lats = pts.map((b) => b.lat), pad = 0.004;
  return [Math.min(...lons) - pad, Math.min(...lats) - pad, Math.max(...lons) + pad, Math.max(...lats) + pad];
}

export function segInside(c, bbox) {
  return c.some((q) => q[0] >= bbox[0] && q[0] <= bbox[2] && q[1] >= bbox[1] && q[1] <= bbox[3]);
}
export function svgPath(pts, proj) {
  let d = "";
  for (let i = 0; i < pts.length; i++) d += (i ? "L" : "M") + proj.x(pts[i][0]).toFixed(1) + " " + proj.y(pts[i][1]).toFixed(1);
  return d;
}

// Each arterial labelled once, on whichever of its segments sits closest to
// the middle of the frame, so labels do not land on the clipped edges.
export function arterialPicks(streets, proj) {
  const pick = {}, bb = proj.bbox;
  streets.segments.forEach((sg) => {
    if (sg.u !== 2 || !sg.h || sg.c.length < 2) return;
    const name = sg.h.replace(/^[\d–-]+\s+/, "");
    const a = sg.c[0], b = sg.c[sg.c.length - 1];
    if (a[0] < bb[0] || a[0] > bb[2] || a[1] < bb[1] || a[1] > bb[3]) return;
    const mx = (proj.x(a[0]) + proj.x(b[0])) / 2, my = (proj.y(a[1]) + proj.y(b[1])) / 2;
    const d = Math.hypot(mx - proj.W / 2, my - proj.H / 2);
    const edge = Math.min(mx, proj.W - mx, my, proj.H - my);
    if (edge < 60) return;
    if (!pick[name] || d < pick[name].d) pick[name] = { d, sg, name };
  });
  return pick;
}

// street surfaces drawn from the centrelines: pavement width by street use,
// with a sidewalk band either side. A drawing convention, not a survey of curbs.
export const ROAD = { pave: { 2: 13, 1: 11, 0: 8.5 }, walk: 2.5, lane: 5 };   // metres
