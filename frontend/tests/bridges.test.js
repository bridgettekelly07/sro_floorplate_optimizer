// The bridges: segments joined into decks, a deck profile that climbs and levels, a closed ribbon.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { bridgeChains, arcLengths, deckHeights, ribbon, pillar, along, aboveRuns, densify } from "../src/lib/bridges.js";

describe("the bridges", () => {
  test("joins segments that share an endpoint into one chain, and splits at a junction", () => {
    const segs = [{ c: [[0, 0], [1, 0]] }, { c: [[2, 0], [1, 0]] }, { c: [[2, 0], [3, 0]] }, { c: [[2, 0], [2, 1]] }];
    const chains = bridgeChains(segs);
    // 0 and 1 join through (1,0); (2,0) is a junction of three, so 2 and 3 stay separate
    assert.equal(chains.length, 3);
    const main = chains.find((c) => c.length === 3);
    assert.deepEqual(main, [[0, 0], [1, 0], [2, 0]]);
  });
  test("adds points so no stretch is longer than the step, keeping the ends", () => {
    const d = densify([[0, 0], [100, 0], [100, 30]], 12);
    assert.deepEqual(d[0], [0, 0]); assert.deepEqual(d[d.length - 1], [100, 30]);
    for (let i = 1; i < d.length; i++) assert.ok(Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]) <= 12 + 1e-9);
    assert.ok(d.some((p) => p[0] === 100 && p[1] === 0), "keeps the bend");
  });
  test("the deck climbs at the grade from each end and levels at the clearance", () => {
    const xz = [[0, 0], [100, 0], [200, 0], [300, 0], [400, 0]], s = arcLengths(xz);
    const y = deckHeights(s, [2, 0, 0, 0, 3], 2, 3, 20, 0.06);
    assert.equal(y[0], 2); assert.equal(y[4], 3);
    assert.ok(Math.abs(y[1] - 8) < 1e-9);          // 2 + 0.06 * 100
    assert.ok(Math.abs(y[2] - 14) < 1e-9);         // 2 + 0.06 * 200, still below the 20 m clearance
    assert.ok(Math.abs(y[3] - 9) < 1e-9);          // 3 + 0.06 * 100 from the far end
    const flat = deckHeights(arcLengths([[0, 0], [500, 0], [1000, 0]]), [0, 0, 0], 0, 0, 20, 0.06);
    assert.equal(flat[1], 20);                     // a long span tops out
  });
  test("draws only the stretches above the ground, each landing on its touchdown point", () => {
    const y = [2, 2, 8, 14, 20, 14, 8, 3, 3], ground = [2, 2, 0, 0, 0, 0, 0, 3, 3];
    assert.deepEqual(aboveRuns(y, ground), [[1, 7]]);     // from the last at-grade point to the first one on the far side
    assert.deepEqual(aboveRuns([0, 0, 0], [0, 0, 0]), []); // a deck wholly at grade draws nothing
    assert.deepEqual(aboveRuns([5, 5, 0, 5, 5], [0, 0, 0, 0, 0]), [[0, 2], [2, 4]]);   // a dip splits it
  });
  test("a ribbon is a closed box with four long ink edges", () => {
    const r = ribbon([[0, 0], [10, 0]], [5, 5], 4, 1);
    assert.equal(r.pos.length, (4 + 2) * 2 * 3 * 3);   // four faces and two caps, two triangles each
    assert.equal(r.edge.length, 4 * 6 + 2 * 12);        // four long edges, two verticals at each end
    assert.deepEqual(r.L[0], [0, 2]); assert.deepEqual(r.R[0], [0, -2]);
  });
  test("a pillar stands on the ground and reaches the deck", () => {
    const p = pillar(0, 0, [1, 0], 1, 2, 0, 10);
    const ys = []; for (let i = 1; i < p.pos.length; i += 3) ys.push(p.pos[i]);
    assert.equal(Math.min(...ys), 0); assert.equal(Math.max(...ys), 10);
  });
  test("finds the point and heading along the line", () => {
    const xz = [[0, 0], [10, 0], [10, 10]], s = arcLengths(xz);
    const a = along(xz, s, 15);
    assert.deepEqual([a.x, a.z], [10, 5]); assert.deepEqual(a.d, [0, 1]);
  });
});
