// The park shading: regions between the drawn contour lines, graded by distance between them.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { shadePark, toneOf, distanceTransform, fbm, hex, PARK } from "../src/lib/parkShade.js";

const hi = "#d6d8b4", lo = "#7d8f66", sum = (c) => c[0] + c[1] + c[2];
// a 100 by 100 park with two straight contours: level 10 along z = 30, level 12 along z = 70;
// the heightfield is deliberately a little wrong
const box = { x0: 0, z0: 0, w: 100, h: 100 };
const segs = [{ ax: -20, az: 30, bx: 120, bz: 30, z: 10 }, { ax: -20, az: 70, bx: 120, bz: 70, z: 12 }];
const ring = [[0, 0], [100, 0], [100, 100], [0, 100]];
const height = (x, z) => 9 + z * 0.05 + 0.6;   // 9.6 at the bottom, 14.6 at the top, 0.6 too high
const sh = shadePark(box, 1, segs, 2, ring, height);

describe("the park shading", () => {
  // bands are indices into the park's own levels [10, 12]: -1 below the 10 line, 0 between, 1 above the 12 line
  test("finds three regions and their bands from the lines, despite the heightfield's bias", () => {
    assert.equal(sh.sample(50, 10).band, -1);
    assert.equal(sh.sample(50, 50).band, 0);
    assert.equal(sh.sample(50, 90).band, 1);
    assert.equal(sh.bmin, -1); assert.equal(sh.bmax, 1); assert.equal(sh.flat, false);
  });
  test("the band changes exactly at the line", () => {
    assert.equal(sh.sample(50, 29).band, -1);
    assert.equal(sh.sample(50, 31).band, 0);
  });
  test("grades by distance between the two bounding lines", () => {
    assert.ok(Math.abs(sh.sample(50, 50).f - 0.5) < 0.05);
    assert.ok(sh.sample(50, 35).f < 0.2);
    assert.ok(sh.sample(50, 65).f > 0.8);
  });
  test("lowness runs from the highest band to the lowest", () => {
    assert.equal(sh.sample(50, 90).lowness, 0);
    assert.equal(sh.sample(50, 10).lowness, 1);
  });
  test("tone: lowest band darkest, and within a band darker toward the line below", () => {
    const t = (x, z) => toneOf(sh.sample(x, z), sh, hi, lo);
    assert.ok(sum(t(50, 10)) < sum(t(50, 50)) && sum(t(50, 50)) < sum(t(50, 90)));
    assert.ok(sum(t(50, 35)) < sum(t(50, 65)));
  });
  test("a park spanning only two bands keeps its tones closer than the full ramp", () => {
    // the test park spans three bands (-1..1), so it uses the 0.6 reach; its lowest tone is lighter than lo
    const low = toneOf(sh.sample(50, 10), sh, hi, lo), full = hex(lo);
    assert.ok(sum(low) > sum(full), "does not reach the full low tone");
    assert.ok(sum(low) < sum(hex(hi)), "but is darker than the high tone");
    // a one-band-span park is closer still
    const one = { ...sh, bmin: 0, bmax: 1 };
    assert.ok(sum(toneOf({ band: 0, f: 1, lowness: 1 }, one, hi, lo)) > sum(low));
  });
  test("outside the park there is no sample", () => {
    assert.equal(sh.sample(-5, 50), null);
  });
  test("a park with no lines is flat and one tone", () => {
    const f = shadePark(box, 2, [], 2, ring, height);
    assert.equal(f.flat, true);
    assert.deepEqual(toneOf(f.sample(50, 50), f, hi, lo), hex(hi));
  });
  test("a closed loop encloses its own region", () => {
    // a square loop of level 12 inside a park that is otherwise band 10..12
    const loop = [[30, 30, 70, 30], [70, 30, 70, 70], [70, 70, 30, 70], [30, 70, 30, 30]].map(([ax, az, bx, bz]) => ({ ax, az, bx, bz, z: 12 }));
    const g = shadePark(box, 1, loop, 2, ring, (x, z) => (x > 30 && x < 70 && z > 30 && z < 70 ? 12.8 : 11.2));
    assert.equal(g.sample(50, 50).band, 0);    // inside the loop: above the 12 line
    assert.equal(g.sample(10, 10).band, -1);   // outside: below it
  });
  test("the distance transform measures to the nearest marked cell", () => {
    const on = new Uint8Array(25); on[12] = 1;   // the centre of a 5 by 5
    const d = distanceTransform(on, 5, 5);
    assert.equal(d[12], 0); assert.equal(d[13], 1); assert.ok(Math.abs(d[0] - Math.hypot(2, 2)) < 1e-6);
  });
  test("the wash noise is bounded and deterministic", () => {
    assert.equal(fbm(12.3, 4.5), fbm(12.3, 4.5));
    assert.ok(fbm(12.3, 4.5) >= 0 && fbm(12.3, 4.5) <= 1 && PARK.mottle < 0.5);
  });
});
