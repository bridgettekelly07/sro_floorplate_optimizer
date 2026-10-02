// The procedural windows: on the floor grid, clear of the corners, blank on short walls.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { facadeLines, storeyLines, storeys, FACADE } from "../src/lib/facade.js";
import { FLOOR_M } from "../src/lib/typicalFloor.js";

// a 20 m by 10 m box, three storeys, in a scene where one unit is one metre
const box = { xz: [[0, 0], [20, 0], [20, 10], [0, 10]], base: 0, h: 3 * FLOOR_M, narrow: false, shop: false };
const rects = (arr) => { const r = []; for (let i = 0; i < arr.length; i += 24) r.push([...arr.slice(i, i + 24)]); return r; };
const xs = (r) => [r[0], r[3], r[6], r[9], r[12], r[15], r[18], r[21]];
const ys = (r) => [r[1], r[4], r[7], r[10], r[13], r[16], r[19], r[22]];

describe("the façade", () => {
  test("splits a height into the same storeys the floor lines use", () => {
    assert.deepEqual(storeys(3 * FLOOR_M), { levels: 3, pitch: FLOOR_M });
    assert.equal(storeys(1).levels, 1);
  });
  test("draws one window per bay per storey, four segments each", () => {
    const r = rects(facadeLines([box], 1));
    // 20 m walls: 18 m usable -> 5 bays; 10 m walls: 8 m usable -> 2 bays; three storeys
    assert.equal(r.length, (5 + 2 + 5 + 2) * 3);
  });
  test("keeps every window clear of the corners", () => {
    const r = rects(facadeLines([box], 1));
    // the wall along z = 0 runs x from 0 to 20: nothing within the inset of either end
    r.filter((q) => Math.abs(q[2]) < 0.1 && Math.abs(q[8]) < 0.1).forEach((q) => {
      const x = xs(q);
      assert.ok(Math.min(...x) >= FACADE.inset, "left corner clear");
      assert.ok(Math.max(...x) <= 20 - FACADE.inset, "right corner clear");
    });
  });
  test("sits each window between two floor lines", () => {
    const r = rects(facadeLines([box], 1));
    r.forEach((q) => {
      const y = ys(q), lo = Math.min(...y), hi = Math.max(...y);
      const lv = Math.floor(lo / FLOOR_M);
      assert.ok(lo >= lv * FLOOR_M + FACADE.sill - 1e-5, "above the sill");
      assert.ok(hi <= (lv + 1) * FLOOR_M - FACADE.head + 1e-5, "below the next line");
    });
  });
  test("leaves a wall too short for a bay blank", () => {
    const small = { ...box, xz: [[0, 0], [3, 0], [3, 3], [0, 3]] };
    assert.equal(facadeLines([small], 1).length, 0);
  });
  test("opens a storefront on the ground floor of a long wall", () => {
    const shop = { ...box, shop: true };
    const ground = rects(facadeLines([shop], 1)).filter((q) => Math.min(...ys(q)) < FLOOR_M);
    assert.ok(ground.length > 0);
    ground.forEach((q) => {
      const y = ys(q);
      assert.ok(Math.abs(Math.min(...y) - FACADE.shopSill) < 1e-5);
      assert.ok(Math.abs(Math.max(...y) - (FLOOR_M - FACADE.shopHead)) < 1e-5);
    });
  });
  test("uses the narrow bay on an SRO", () => {
    const wide = rects(facadeLines([box], 1)).length, narrow = rects(facadeLines([{ ...box, narrow: true }], 1)).length;
    assert.ok(narrow > wide);
  });
  test("scales metres by the scene unit", () => {
    const half = { ...box, xz: box.xz.map(([x, z]) => [x / 2, z / 2]) };   // the same box where a unit is 2 m
    const a = facadeLines([box], 1), b = facadeLines([half], 2);
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i] / 2 - b[i]) < 1e-6);
  });
  test("draws a floor line at every level above the ground", () => {
    const s = storeyLines([box], 1);
    assert.equal(s.length, 2 * 4 * 6);   // two lines, four walls
  });
});

import { guessedHeight, GUESS_STOREYS } from "../src/lib/typicalFloor.js";
describe("the guessed height of an unmeasured footprint", () => {
  test("is a whole number of storeys within the range, the same for the same footprint", () => {
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const h = guessedHeight(i), n = Math.round(h / FLOOR_M);
      assert.ok(Math.abs(h - n * FLOOR_M) < 1e-9);
      assert.ok(n >= GUESS_STOREYS[0] && n <= GUESS_STOREYS[1]);
      assert.equal(guessedHeight(i), h);
      seen.add(n);
    }
    assert.equal(seen.size, GUESS_STOREYS[1] - GUESS_STOREYS[0] + 1, "every storey count turns up");
  });
});
