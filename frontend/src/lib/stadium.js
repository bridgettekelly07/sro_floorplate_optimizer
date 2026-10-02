// A stadium like BC Place: a round drum, a shallow domed roof with an open
// ring at the centre, and masts around the rim leaning outward with a cable
// each to the roof. Pure geometry in scene units; the scene wraps it in meshes.
//
// cfg: { domeH: rise of the roof above the rim, oculus: the centre ring's
// radius as a share of the drum's, masts, mastH: height above the rim,
// lean: how far out the mast tops stand, as a share of the radius }
export const STADIUM = { domeH: 14, oculus: 0.18, masts: 36, mastH: 30, lean: 0.22, segments: 72, rings: 6 };

export function stadiumGeometry(cx, cz, r, y0, u, cfg = STADIUM) {
  const pos = [], edge = [], line = [];
  const N = cfg.segments, K = cfg.rings, r1 = r * cfg.oculus, H = cfg.domeH * u;
  // the roof profile: a spherical cap from the rim at y0 to the oculus at y0 + H
  const prof = [];
  for (let k = 0; k <= K; k++) {
    const t = k / K, rr = r + (r1 - r) * t;
    prof.push([rr, y0 + H * Math.sin(t * Math.PI / 2)]);
  }
  const ring = (k, i) => { const a = i / N * Math.PI * 2; return [cx + Math.cos(a) * prof[k][0], prof[k][1], cz + Math.sin(a) * prof[k][0]]; };
  for (let k = 0; k < K; k++) for (let i = 0; i < N; i++) {
    const a = ring(k, i), b = ring(k, i + 1), c = ring(k + 1, i + 1), d = ring(k + 1, i);
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  // the rim and the oculus in ink
  for (let i = 0; i < N; i++) { edge.push(...ring(0, i), ...ring(0, i + 1)); edge.push(...ring(K, i), ...ring(K, i + 1)); }
  // the masts: from just inside the rim, leaning out, with a cable back to the roof's shoulder
  for (let m = 0; m < cfg.masts; m++) {
    const a = m / cfg.masts * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const foot = [cx + ca * r * 0.98, y0, cz + sa * r * 0.98];
    const top = [cx + ca * r * (1 + cfg.lean), y0 + cfg.mastH * u, cz + sa * r * (1 + cfg.lean)];
    edge.push(...foot, ...top);
    const sh = prof[Math.round(K * 0.45)];
    line.push(...top, cx + ca * sh[0], sh[1], cz + sa * sh[0]);
    // a rib down the roof under each mast
    for (let k = 0; k < K; k++) line.push(cx + ca * prof[k][0], prof[k][1], cz + sa * prof[k][0], cx + ca * prof[k + 1][0], prof[k + 1][1], cz + sa * prof[k + 1][0]);
  }
  return { pos, edge, line };
}
