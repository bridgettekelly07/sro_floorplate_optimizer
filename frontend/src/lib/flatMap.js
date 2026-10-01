// The flat map: the district as one SVG string, drawn for a view rectangle
// in projection units. Pan and zoom only move the view; the component that
// owns it redraws on a short timer.
import { segInside, svgPath, arterialPicks, ROAD } from "./projection.js";
import { esc } from "./format.js";
import { landCanvas } from "./terrain.js";
import { css } from "./colours.js";

let landUrl = null, landKey = "";   // the land mask as a data URL, cached per colour scheme

export function resetView(proj, aspect) {
  let w = proj.W, h = w * aspect;
  if (h < proj.H) { h = proj.H; w = h / aspect; }
  return { x: (proj.W - w) / 2, y: (proj.H - h) / 2, w, h };
}
export function refitView(view, aspect) {
  const cy = view.y + view.h / 2, h = view.w * aspect;
  return { x: view.x, y: cy - h / 2, w: view.w, h };
}
export function clampView(view, proj, aspect) {
  const minW = proj.W / 60, maxW = Math.max(proj.W, proj.H / aspect);
  const w = Math.max(minW, Math.min(maxW, view.w)), h = w * aspect;
  return { w, h,
    x: Math.max(-proj.W * 0.2, Math.min(proj.W * 1.2 - w, view.x)),
    y: Math.max(-proj.H * 0.2, Math.min(proj.H * 1.2 - h, view.y)) };
}
export function zoomView(view, proj, aspect, factor, ax, ay) {
  const px = ax == null ? view.x + view.w / 2 : ax, py = ay == null ? view.y + view.h / 2 : ay;
  const fx = (px - view.x) / view.w, fy = (py - view.y) / view.h;
  const w = view.w * factor, h = w * aspect;
  return clampView({ x: px - fx * w, y: py - fy * h, w, h }, proj, aspect);
}
export function viewBox(v) {
  return v.x.toFixed(1) + " " + v.y.toFixed(1) + " " + v.w.toFixed(1) + " " + v.h.toFixed(1);
}

// colourOf(b, i) gives the fill for each Appendix B building
export function drawFlatMap({ proj, view, streets, ground, foot, context, terrain, surveyed, sel, colourOf }) {
  const z = view.w / proj.W;   // user units per screen pixel, so text and dots keep their size
  const vx0 = view.x, vy0 = view.y, vx1 = view.x + view.w, vy1 = view.y + view.h;
  const parts = ['<svg viewBox="' + viewBox(view) + '" role="img" aria-label="Map of the Downtown Eastside: building footprints, streets and SRO buildings">'];
  const P = (pts) => svgPath(pts, proj);
  // features are kept to the view, with a margin, so the string stays short
  const vb = [proj.lon(vx0 - view.w * 0.2), proj.lat(vy1 + view.h * 0.2), proj.lon(vx1 + view.w * 0.2), proj.lat(vy0 - view.h * 0.2)];
  const inside = (c) => segInside(c, vb);

  parts.push('<rect x="' + vx0.toFixed(1) + '" y="' + vy0.toFixed(1) + '" width="' + view.w.toFixed(1) + '" height="' + view.h.toFixed(1) + '" fill="var(--map-water)"/>');
  if (terrain && terrain.land) {
    const key = css("--surface") + css("--map-water");
    if (key !== landKey) { landKey = key; const cv = landCanvas(terrain, css("--surface") || "#fbf9f5", css("--map-water") || "#d9e0df"); landUrl = cv ? cv.toDataURL("image/png") : null; }
    const tb = terrain.bbox;
    if (landUrl) parts.push('<image href="' + landUrl + '" x="' + proj.x(tb[0]).toFixed(1) + '" y="' + proj.y(tb[3]).toFixed(1) + '" width="' + (proj.x(tb[2]) - proj.x(tb[0])).toFixed(1) + '" height="' + (proj.y(tb[1]) - proj.y(tb[3])).toFixed(1) + '" preserveAspectRatio="none" style="image-rendering:auto"/>');
  } else if (ground) {
    parts.push('<path d="' + ground.land.map(P).join("") + 'Z" fill="var(--surface)" stroke="none"/>');
  }
  if (ground) parts.push('<path d="' + ground.parks.filter((p) => inside(p.r)).map((p) => P(p.r) + "Z").join("") + '" fill="var(--map-park)" stroke="none"/>');
  const mpu = proj.mPerUnit, walkD = [], roadD = [];
  streets.segments.forEach((sg) => {
    if (!inside(sg.c)) return;
    const pave = (ROAD.pave[sg.u] || ROAD.pave[0]) / mpu;
    walkD.push([P(sg.c), pave + 2 * ROAD.walk / mpu]);
    roadD.push([P(sg.c), pave]);
  });
  function strokes(list, colour) {
    const byW = {};
    list.forEach((it) => { const k = it[1].toFixed(2); (byW[k] = byW[k] || []).push(it[0]); });
    Object.keys(byW).forEach((k) => {
      parts.push('<path d="' + byW[k].join("") + '" fill="none" stroke="' + colour + '" stroke-width="' + k + '" stroke-linecap="round" stroke-linejoin="round"/>');
    });
  }
  strokes(walkD, "var(--map-walk)");
  strokes(roadD, "var(--map-road)");
  if (ground) {
    const laneD = ground.lanes.filter(inside).map(P).join("");
    if (laneD) parts.push('<path d="' + laneD + '" fill="none" stroke="var(--map-road)" stroke-width="' + (ROAD.lane / mpu).toFixed(2) + '" stroke-linecap="round"/>');
  }
  const fp = [];
  [foot, context].forEach((list) => {
    if (!list) return;
    for (let fi = 0; fi < list.length; fi++) {
      const b4 = list[fi].b;
      if (proj.x(b4[2]) < vx0 || proj.x(b4[0]) > vx1) continue;
      if (proj.y(b4[1]) < vy0 || proj.y(b4[3]) > vy1) continue;
      fp.push(P(list[fi].p) + "Z");
    }
  });
  if (fp.length) parts.push('<path d="' + fp.join("") + '" fill="var(--map-foot)" stroke="var(--map-foot-line)" stroke-width="' + (0.6 * z).toFixed(2) + '"/>');
  const pick = arterialPicks(streets, proj);
  Object.keys(pick).forEach((name) => {
    const sg = pick[name].sg, a = sg.c[0], b = sg.c[sg.c.length - 1];
    const x1 = proj.x(a[0]), y1 = proj.y(a[1]), x2 = proj.x(b[0]), y2 = proj.y(b[1]);
    let ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    const cx = ((x1 + x2) / 2).toFixed(1), cy = ((y1 + y2) / 2 - 5).toFixed(1);
    parts.push('<text x="' + cx + '" y="' + cy + '" font-size="' + (11 * z).toFixed(2) + '" fill="var(--ink-3)" text-anchor="middle" letter-spacing="' + (1.1 * z).toFixed(2) + '" '
      + 'font-family="IBM Plex Sans Condensed, sans-serif" transform="rotate(' + ang.toFixed(1) + ' ' + cx + ' ' + cy + ')">' + esc(name) + '</text>');
  });
  // matched parcel outlines: the lot each SRO building sits on
  surveyed.forEach((b, i) => {
    if (!b.poly) return;
    const col = colourOf(b, i), on = sel === i;
    parts.push('<path data-s="' + i + '" d="' + P(b.poly) + 'Z" fill="' + col + '" fill-opacity="' + (on ? "0.95" : "0.55")
      + '" stroke="' + (on ? "var(--ink)" : col) + '" stroke-width="' + ((on ? 2.2 : 0.8) * z).toFixed(2) + '" style="cursor:pointer"/>');
  });
  // Appendix B stock as points, for reading the whole district at once
  if (surveyed.length) {
    const maxS = Math.max(...surveyed.map((b) => b.rooms || 0));
    surveyed.forEach((b, i) => {
      if (b.lon == null) return;
      if (z < 0.34 && b.poly) return;          // close in, the parcel says it better
      const r = (3.5 + 11 * Math.sqrt((b.rooms || 1) / maxS)) * z, on = sel === i;
      parts.push('<circle data-s="' + i + '" cx="' + proj.x(b.lon).toFixed(1) + '" cy="' + proj.y(b.lat).toFixed(1) + '" r="' + r.toFixed(1)
        + '" fill="' + colourOf(b, i) + '" fill-opacity="' + (on ? "0.95" : "0.6") + '" stroke="' + (on ? "var(--ink)" : "none") + '" stroke-width="2" style="cursor:pointer"/>');
    });
  }
  parts.push('<text x="' + (view.x + 8 * z).toFixed(1) + '" y="' + (view.y + view.h - 46 * z).toFixed(1) + '" font-size="' + (10 * z).toFixed(2) + '" fill="var(--ink-3)">Streets, parcels and footprints: City of Vancouver open data</text>');
  parts.push("</svg>");
  return parts.join("");
}
