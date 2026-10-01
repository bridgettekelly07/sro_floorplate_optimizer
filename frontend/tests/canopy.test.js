// The lobed canopies: the chosen seeds, drawn the same every time.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canopyShape, CANOPY_SEEDS, FASTIGIATE, drawnHeight } from "../src/lib/canopy.js";

describe("the canopies", () => {
  test("uses the eight chosen seeds", () => {
    assert.deepEqual(CANOPY_SEEDS, [1, 8, 9, 15, 16, 17, 19, 20]);
  });
  test("draws the same shape for the same seed", () => {
    assert.deepEqual(canopyShape(15), canopyShape(15));
    assert.notDeepEqual(canopyShape(15), canopyShape(16));
  });
  test("has four to seven lobes, some in shade, and a light core on top", () => {
    CANOPY_SEEDS.forEach((s) => {
      const c = canopyShape(s);
      assert.ok(c.lobes >= 4 && c.lobes <= 7, "lobe count");
      assert.equal(c.blobs.length, c.lobes + 1);
      assert.ok(c.blobs.some((b) => b.dark), "has shade");
      assert.equal(c.blobs[c.blobs.length - 1].dark, false, "core is light");
      // dark lobes are drawn first, so the light ones sit over them
      const firstLight = c.blobs.findIndex((b) => !b.dark);
      assert.ok(c.blobs.slice(firstLight).every((b) => !b.dark));
    });
  });
  test("is mildly fastigiate: taller than it is wide", () => {
    assert.equal(FASTIGIATE, 1.35);
    CANOPY_SEEDS.forEach((s) => {
      const round = canopyShape(s, 1), tall = canopyShape(s);
      const ext = (c) => { let w = 0, h = 0; c.blobs.forEach((b) => [b.start, ...b.segs.flat()].forEach(([x, y]) => { w = Math.max(w, Math.abs(x)); h = Math.max(h, Math.abs(y)); })); return { w, h }; };
      const a = ext(round), b = ext(tall);
      assert.ok(b.h > a.h && b.w < a.w, "taller and narrower than the round form");
    });
  });
  test("stays within the cell", () => {
    CANOPY_SEEDS.forEach((s) => {
      canopyShape(s).blobs.forEach((b) => {
        [b.start, ...b.segs.flat()].forEach(([x, y]) => assert.ok(Math.abs(x) < 1.35 && Math.abs(y) < 1.35 * FASTIGIATE));
      });
    });
  });

});

describe("the drawn tree height", () => {
  const ft = (m) => m / 0.3048;
  test("squeezes the recorded classes into 15 to 60 ft", () => {
    assert.ok(Math.abs(ft(drawnHeight(1.5)) - 15) < 1e-9);
    assert.ok(Math.abs(ft(drawnHeight(32)) - 60) < 1e-9);
    assert.ok(Math.abs(ft(drawnHeight(40)) - 60) < 1e-9, "the open-ended class stays at 60");
    assert.ok(Math.abs(ft(drawnHeight(0)) - 15) < 1e-9, "a missing height draws at the minimum");
  });
  test("keeps the order of the classes", () => {
    const classes = [1.5, 4.5, 7.5, 10.5, 13.5, 17, 20, 23, 26, 29, 32];
    for (let i = 1; i < classes.length; i++) assert.ok(drawnHeight(classes[i]) > drawnHeight(classes[i - 1]));
  });
  test("puts the common small classes in the 15 to 30 ft band", () => {
    [1.5, 4.5, 7.5, 10.5].forEach((h) => assert.ok(ft(drawnHeight(h)) <= 30));
    assert.ok(ft(drawnHeight(13.5)) > 30);
  });
});
