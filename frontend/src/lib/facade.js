// Procedural façades for the DTES buildings: punched windows in a bay rhythm
// along each wall, one row per storey, and a storefront on the ground floor
// of a wall long enough to hold one. The footprints carry no façade data, so
// this is a drawing convention, not a survey.
//
// The storeys are the same ones the floor lines use: a height is split into
// round(h / FLOOR_M) equal levels, so a window always sits between two lines.
// Bays are inset from both ends of a wall, so no window runs onto a corner,
// and a wall too short for one bay stays blank.

import { FLOOR_M } from "./typicalFloor.js";

export const FACADE = {
  inset: 1.0,       // metres kept clear at each end of a wall
  bay: 3.6,         // metres per window bay on a context building
  bayNarrow: 2.7,   // on an SRO: about one room per window
  ww: 1.3,          // window width, metres
  wh: 1.5,          // window height, at most
  sill: 0.9,        // sill above the floor line
  head: 0.45,       // kept clear under the line above
  shopMin: 6,       // a ground-floor wall at least this long gets a storefront
  shopW: 0.72,      // storefront opening as a share of its bay
  shopSill: 0.25,   // storefront opening above the ground
  shopHead: 0.55,   // and below the first floor line
  lift: 0.04,       // metres the lines sit off the wall
};

// the storey pitch the floor lines use for a height in metres
export function storeys(h) {
  const levels = Math.max(1, Math.round(h / FLOOR_M));
  return { levels, pitch: h / levels };
}

// items: { xz: [[x, z], ...] a ring in scene units (not closed), base: scene y,
//          h: metres, narrow: SRO bays, shop: allow a storefront }
// mPerUnit: metres per scene unit. Returns segment endpoints, 6 floats each.
export function facadeLines(items, mPerUnit, opt = FACADE) {
  const out = [], u = 1 / mPerUnit;
  const rect = (ax, az, bx, bz, nx, nz, u0, u1, y0, y1) => {
    const lx = nx * opt.lift * u, lz = nz * opt.lift * u;
    const p = (t) => [ax + (bx - ax) * t + lx, az + (bz - az) * t + lz];
    const [x0, z0] = p(u0), [x1, z1] = p(u1);
    out.push(x0, y0, z0, x1, y0, z1,  x1, y0, z1, x1, y1, z1,  x1, y1, z1, x0, y1, z0,  x0, y1, z0, x0, y0, z0);
  };
  items.forEach((it) => {
    const ring = it.xz;
    if (!ring || ring.length < 3 || !(it.h > 0)) return;
    let area = 0;
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area > 0 ? 1 : -1;
    const { levels, pitch } = storeys(it.h);
    const bay = it.narrow ? opt.bayNarrow : opt.bay;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len === 0) continue;
      const L = len * mPerUnit, nx = sgn * dz / len, nz = -sgn * dx / len;
      const usable = L - 2 * opt.inset;
      if (usable < bay * 0.6) continue;
      const n = Math.max(1, Math.floor(usable / bay)), span = usable / n;
      for (let lv = 0; lv < levels; lv++) {
        const f0 = lv * pitch, f1 = (lv + 1) * pitch;
        const shop = lv === 0 && it.shop && levels >= 2 && L >= opt.shopMin;
        const z0 = f0 + (shop ? opt.shopSill : opt.sill);
        const z1 = shop ? f1 - opt.shopHead : Math.min(z0 + opt.wh, f1 - opt.head);
        if (z1 - z0 < 0.5) continue;
        const w = shop ? span * opt.shopW : Math.min(opt.ww, span * 0.6);
        for (let j = 0; j < n; j++) {
          const c = opt.inset + span * (j + 0.5);
          rect(a[0], a[1], b[0], b[1], nx, nz, (c - w / 2) / L, (c + w / 2) / L, it.base + z0 * u, it.base + z1 * u);
        }
      }
    }
  });
  return new Float32Array(out);
}

// the floor lines themselves, for the same items: one ring at each level above the ground
export function storeyLines(items, mPerUnit) {
  const out = [], u = 1 / mPerUnit;
  items.forEach((it) => {
    const ring = it.xz;
    if (!ring || ring.length < 3 || !(it.h > 0)) return;
    const { levels, pitch } = storeys(it.h);
    for (let lv = 1; lv < levels; lv++) {
      const y = it.base + lv * pitch * u;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        out.push(a[0], y, a[1], b[0], y, b[1]);
      }
    }
  });
  return new Float32Array(out);
}
