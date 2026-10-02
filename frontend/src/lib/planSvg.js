// The typical floor as an SVG string: the outline, corridor and stair, every
// room with its area, and in the proposed view the units the scheme makes
// with the bathroom and kitchen of Guidelines p.5-6 drawn at the corridor wall.
import { EPS } from "./policy.js";
import { groupsOf } from "./evaluate.js";
import { POD } from "./typicalFloor.js";
import { letter } from "./format.js";

export function planSvg(g, { minUnit, proposed }) {
  const p = g.p, pad = 1.2, W = p.L + pad * 2, H = p.W + pad * 2;
  let h = '<svg viewBox="0 0 ' + W.toFixed(2) + ' ' + H.toFixed(2) + '" xmlns="http://www.w3.org/2000/svg" font-family="IBM Plex Sans, sans-serif">'
    + '<defs><pattern id="hatch" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="0.6" stroke="var(--rule)" stroke-width="0.12"/></pattern></defs>';
  const X = (u) => (u + pad).toFixed(2), Y = (v) => (v + pad).toFixed(2);
  h += '<path d="' + p.ring.map((q, k) => (k ? "L" : "M") + X(q[0]) + " " + Y(q[1])).join("") + 'Z" fill="var(--surface)" stroke="var(--ink)" stroke-width="0.14"/>';
  const cv = p.dbl ? p.depth : p.W - p.corridor;
  h += '<rect x="' + X(0) + '" y="' + Y(cv) + '" width="' + p.L.toFixed(2) + '" height="' + p.corridor.toFixed(2) + '" fill="var(--plan-circ)" stroke="none"/>';
  // the cores: a dog-leg stair, two flights side by side with a landing at the outer wall; a washroom with its stalls
  (p.cores || []).forEach((c) => {
    h += '<rect x="' + X(c.u) + '" y="' + Y(c.v) + '" width="' + c.w.toFixed(2) + '" height="' + c.d.toFixed(2) + '" fill="var(--plan-circ)" stroke="var(--ink-2)" stroke-width="0.08"/>';
    if (c.kind === "stair") {
      // the flights take the stair's own width; anything more is the entrance lobby beside them
      const landing = 1.0, sw = Math.min(c.w, 2.6), flight = sw / 2, out = c.side === 0 ? c.v : c.v + c.d, inn = c.side === 0 ? c.v + c.d : c.v, dir = c.side === 0 ? 1 : -1;
      if (c.w > sw + 0.3) h += '<line x1="' + X(c.u + sw) + '" y1="' + Y(c.v) + '" x2="' + X(c.u + sw) + '" y2="' + Y(c.v + c.d) + '" stroke="var(--ink-2)" stroke-width="0.06"/>';
      const l0 = out + dir * landing;   // the landing's inner edge
      h += '<line x1="' + X(c.u + flight) + '" y1="' + Y(l0) + '" x2="' + X(c.u + flight) + '" y2="' + Y(inn) + '" stroke="var(--ink-2)" stroke-width="0.06"/>';
      h += '<line x1="' + X(c.u + 0.15) + '" y1="' + Y(l0) + '" x2="' + X(c.u + sw - 0.15) + '" y2="' + Y(l0) + '" stroke="var(--ink-2)" stroke-width="0.05"/>';
      for (let t = 0.28; l0 + dir * t < (c.side === 0 ? inn : l0 + (inn - l0)) - 0.05 && t < Math.abs(inn - l0); t += 0.28) {
        const yy = l0 + dir * t;
        h += '<line x1="' + X(c.u + 0.15) + '" y1="' + Y(yy) + '" x2="' + X(c.u + flight - 0.08) + '" y2="' + Y(yy) + '" stroke="var(--ink-2)" stroke-width="0.05"/>';
        h += '<line x1="' + X(c.u + flight + 0.08) + '" y1="' + Y(yy) + '" x2="' + X(c.u + sw - 0.15) + '" y2="' + Y(yy) + '" stroke="var(--ink-2)" stroke-width="0.05"/>';
      }
      // the up arrow along the first flight, from the corridor to the landing
      const ax = c.u + flight / 2, a0 = inn - dir * 0.2, a1 = l0 + dir * 0.2;
      h += '<line x1="' + X(ax) + '" y1="' + Y(a0) + '" x2="' + X(ax) + '" y2="' + Y(a1) + '" stroke="var(--ink)" stroke-width="0.06"/>';
      h += '<path d="M' + X(ax - 0.18) + ' ' + Y(a1 + dir * 0.3) + ' L' + X(ax) + ' ' + Y(a1) + ' L' + X(ax + 0.18) + ' ' + Y(a1 + dir * 0.3) + '" fill="none" stroke="var(--ink)" stroke-width="0.06"/>';
    } else {
      // stalls along the outer wall and a basin run at the corridor wall
      const out = c.side === 0 ? c.v : c.v + c.d, dir = c.side === 0 ? 1 : -1, stalls = Math.max(1, Math.floor((c.w - 0.2) / 0.95));
      for (let k = 0; k < stalls; k++) {
        const x0 = c.u + 0.1 + k * ((c.w - 0.2) / stalls), sw = (c.w - 0.2) / stalls - 0.08;
        h += '<rect x="' + X(x0) + '" y="' + Y(Math.min(out, out + dir * 1.4)) + '" width="' + sw.toFixed(2) + '" height="1.4" fill="none" stroke="var(--ink-3)" stroke-width="0.04"/>';
        h += '<ellipse cx="' + X(x0 + sw / 2) + '" cy="' + Y(out + dir * 0.55) + '" rx="0.2" ry="0.26" fill="none" stroke="var(--ink-3)" stroke-width="0.04"/>';
      }
      h += '<text x="' + X(c.u + c.w / 2) + '" y="' + Y(c.v + c.d / 2 + (c.side === 0 ? 0.6 : -0.3)) + '" font-size="0.45" text-anchor="middle" fill="var(--ink-3)">WC</text>';
    }
  });
  if (p.roomsEnd < p.L - 0.3) {
    if (p.L - p.roomsEnd > 3) h += '<text x="' + X((p.roomsEnd + p.L) / 2) + '" y="' + Y(p.W / 2) + '" font-size="0.5" text-anchor="middle" fill="var(--ink-3)">not designated</text>';
    h += '<rect x="' + X(p.roomsEnd) + '" y="' + Y(0) + '" width="' + (p.L - p.roomsEnd).toFixed(2) + '" height="' + p.W.toFixed(2) + '" fill="url(#hatch)" stroke="none"/>';
  }

  const groups = proposed ? groupsOf(g.fr, g.fj) : [], unitOf = {}, unitArea = {};
  groups.forEach((grp, ui) => {
    const a = grp.reduce((t, k) => t + g.fr[k].area, 0);
    grp.forEach((k) => { unitOf[k] = ui; unitArea[k] = a; });
  });
  // a unit under the minimum is drawn in the salmon of displacement; one that passes in the park green
  const isShort = (k) => unitOf[k] !== undefined && unitArea[k] < minUnit - EPS;
  const unitFill = (k) => isShort(k) ? "var(--plan-short)" : "var(--plan-unit)";
  const unitLine = (k) => isShort(k) ? "var(--plan-short-line)" : "var(--plan-unit-line)";
  const fs = Math.max(0.42, Math.min(0.8, p.width * 0.22));
  // a door in the corridor wall: a gap and a quarter swing into the room
  function door(x, r) {
    const cw = r.side === 0 ? r.v + r.d : r.v, dir = r.side === 0 ? -1 : 1;
    let s = '<line x1="' + X(x) + '" y1="' + Y(cw) + '" x2="' + X(x + POD.door) + '" y2="' + Y(cw) + '" stroke="var(--surface)" stroke-width="0.12" pointer-events="none"/>';
    s += '<path d="M' + X(x) + ' ' + Y(cw) + ' L' + X(x) + ' ' + Y(cw + dir * POD.door) + ' A' + POD.door.toFixed(2) + ' ' + POD.door.toFixed(2) + ' 0 0 ' + (r.side === 0 ? 1 : 0) + ' ' + X(x + POD.door) + ' ' + Y(cw) + '" fill="none" stroke="var(--ink-2)" stroke-width="0.05" pointer-events="none"/>';
    return s;
  }
  // a window on the outer wall, centred on the room
  function window_(r) {
    const ow = r.side === 0 ? r.v : r.v + r.d, off = r.side === 0 ? 0.1 : -0.1;
    const a = r.u + r.w * 0.25, b = r.u + r.w * 0.75;
    return '<line x1="' + X(a) + '" y1="' + Y(ow) + '" x2="' + X(b) + '" y2="' + Y(ow) + '" stroke="var(--surface)" stroke-width="0.1" pointer-events="none"/>'
      + '<line x1="' + X(a) + '" y1="' + Y(ow + off * 0.3) + '" x2="' + X(b) + '" y2="' + Y(ow + off * 0.3) + '" stroke="var(--ink)" stroke-width="0.04" pointer-events="none"/>'
      + '<line x1="' + X(a) + '" y1="' + Y(ow - off * 0.3) + '" x2="' + X(b) + '" y2="' + Y(ow - off * 0.3) + '" stroke="var(--ink)" stroke-width="0.04" pointer-events="none"/>';
  }
  g.rooms.forEach((r) => {
    const fill = !proposed || r.keep ? "var(--plan-keep)" : unitFill(r.idx);
    h += '<rect class="room" data-room="' + r.idx + '" x="' + X(r.u) + '" y="' + Y(r.v) + '" width="' + r.w.toFixed(2) + '" height="' + r.d.toFixed(2) + '" fill="' + fill + '" stroke="var(--ink-2)" stroke-width="0.08"/>';
    const band = r.d - POD.bath[1];
    let cy = r.v + r.d / 2;
    if (unitOf[r.idx] !== undefined && band >= 1.1) cy = r.side === 0 ? r.v + band / 2 : r.v + POD.bath[1] + band / 2;
    if (unitOf[r.idx] === undefined) h += '<text x="' + X(r.u + r.w / 2) + '" y="' + Y(cy + fs * 0.35) + '" font-size="' + fs.toFixed(2) + '" text-anchor="middle" fill="var(--ink)" pointer-events="none">' + Math.round(r.sf) + ' SF</text>';
    const ny = r.side === 0 ? r.v + fs * 0.9 : r.v + r.d - fs * 0.35;
    h += '<text x="' + X(r.u + 0.25) + '" y="' + Y(ny) + '" font-size="' + (fs * 0.6).toFixed(2) + '" fill="var(--ink-3)" pointer-events="none">' + r.n + (proposed && r.keep ? " SRO" : "") + '</text>';
  });
  g.rooms.forEach((r) => { h += window_(r); });
  g.rooms.forEach((r) => { if (unitOf[r.idx] === undefined) h += door(r.u + 0.15, r); });
  const done = {}, podFlags = [];
  g.rooms.forEach((r) => {
    const u = unitOf[r.idx];
    if (u === undefined) return;
    const mates = g.rooms.filter((q) => unitOf[q.idx] === u);
    mates.forEach((q) => {
      if (q.idx === r.idx + 1 && q.side === r.side) {
        h += '<line x1="' + X(q.u) + '" y1="' + Y(q.v + 0.1) + '" x2="' + X(q.u) + '" y2="' + Y(q.v + q.d - 0.1) + '" stroke="' + unitFill(r.idx) + '" stroke-width="0.16" pointer-events="none"/>';
      }
    });
    if (done[u]) return;
    done[u] = true;
    const u0 = Math.min(...mates.map((q) => q.u)), u1 = Math.max(...mates.map((q) => q.u + q.w));
    const short = unitArea[r.idx] < minUnit - EPS;
    const cwY = r.side === 0 ? r.v + r.d - POD.bath[1] : r.v, kY = r.side === 0 ? r.v + r.d - POD.kitchen[1] : r.v;
    const kx0 = u0 + POD.bath[0] + 0.1 + POD.door + 0.1, kLen = Math.min(POD.kitchen[0], u1 - 0.1 - kx0);
    const pod = ' fill="none" stroke-width="0.03" stroke-dasharray="0.18 0.1" pointer-events="none"';
    h += '<rect x="' + X(u0 + 0.08) + '" y="' + Y(cwY) + '" width="' + (POD.bath[0] - 0.08).toFixed(2) + '" height="' + POD.bath[1].toFixed(2) + '" stroke="var(--ink-3)"' + pod + '/>';
    h += door(u0 + POD.bath[0] + 0.1, r);
    let fits = true;
    if (kLen >= POD.kitchenMin) {
      h += '<rect x="' + X(kx0) + '" y="' + Y(kY) + '" width="' + kLen.toFixed(2) + '" height="' + POD.kitchen[1].toFixed(2) + '" stroke="var(--ink-3)"' + pod + '/>';
    } else {
      const vLen = Math.min(POD.kitchen[0], r.d - 0.2), vx = u1 - 0.08 - POD.kitchen[1];
      fits = vx >= kx0 && vLen >= POD.kitchenMin;
      const vy = r.side === 0 ? r.v + r.d - 0.08 - vLen : r.v + 0.08;
      h += '<rect x="' + X(vx) + '" y="' + Y(vy) + '" width="' + POD.kitchen[1].toFixed(2) + '" height="' + vLen.toFixed(2) + '" stroke="var(--' + (fits ? "ink-3" : "fail") + ')"' + pod + '/>';
    }
    if (!fits) podFlags.push(letter(u));
    h += '<rect x="' + X(u0) + '" y="' + Y(r.v) + '" width="' + (u1 - u0).toFixed(2) + '" height="' + r.d.toFixed(2) + '" fill="none" stroke="' + unitLine(r.idx) + '" stroke-width="0.14" pointer-events="none"/>';
    const ucy = r.d - POD.bath[1] >= 1.1 ? (r.side === 0 ? r.v + (r.d - POD.bath[1]) / 2 : r.v + POD.bath[1] + (r.d - POD.bath[1]) / 2) : r.v + r.d / 2;
    const uw = u1 - u0, ucol = unitLine(r.idx), area = Math.round(unitArea[r.idx]) + ' SF';
    const one = letter(u) + ' · ' + area, ufs = Math.min(fs, (uw - 0.3) / (one.length * 0.52));
    if (ufs >= fs * 0.7) {
      h += '<text x="' + X((u0 + u1) / 2) + '" y="' + Y(ucy + ufs * 0.35) + '" font-size="' + ufs.toFixed(2) + '" font-weight="600" text-anchor="middle" fill="' + ucol + '" pointer-events="none">' + one + '</text>';
    } else {
      const afs = Math.max(0.3, Math.min(fs * 0.85, (uw - 0.2) / (area.length * 0.52)));
      h += '<text x="' + X((u0 + u1) / 2) + '" y="' + Y(ucy - afs * 0.25) + '" font-size="' + (afs * 1.1).toFixed(2) + '" font-weight="600" text-anchor="middle" fill="' + ucol + '" pointer-events="none">' + letter(u) + '</text>';
      h += '<text x="' + X((u0 + u1) / 2) + '" y="' + Y(ucy + afs * 0.95) + '" font-size="' + afs.toFixed(2) + '" text-anchor="middle" fill="' + ucol + '" pointer-events="none">' + area + '</text>';
    }
  });
  const sb = Math.min(10, Math.floor(p.L / 2));
  h += '<line x1="' + X(p.L - sb) + '" y1="' + Y(p.W + 0.7) + '" x2="' + X(p.L) + '" y2="' + Y(p.W + 0.7) + '" stroke="var(--ink-3)" stroke-width="0.08"/>';
  h += '<text x="' + X(p.L - sb / 2) + '" y="' + Y(p.W + 0.55) + '" font-size="0.5" text-anchor="middle" fill="var(--ink-3)">' + sb + ' m</text>';
  h += '</svg>';
  return { svg: h, podFlags };
}
