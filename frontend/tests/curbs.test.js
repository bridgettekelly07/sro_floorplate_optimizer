// Curb lines: offset to both edges, trimmed where they would cross another street.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { curbRuns, segDist } from "../src/lib/curbs.js";

const flat = (runs) => runs.flat();

describe("the curb lines", () => {
  test("offsets a lone street to both edges", () => {
    const runs = curbRuns([{ pts: [[0, 0], [100, 0]], hw: 5 }], 10);
    assert.equal(runs.length, 2);
    const zs = new Set(flat(runs).map((p) => Math.round(p[1])));
    assert.deepEqual([...zs].sort(), [-5, 5]);
    runs.forEach((r) => { assert.equal(r.length, 11); assert.equal(r[0][0], 0); assert.equal(r[10][0], 100); });
  });
  test("stops at a crossing street", () => {
    const ew = { pts: [[0, 0], [100, 0]], hw: 5 }, ns = { pts: [[50, -60], [50, 60]], hw: 6 };
    const runs = curbRuns([ew, ns], 1);
    // the east-west curbs break where x is within 6 of the crossing, so no point sits in that band
    const ewPts = flat(runs).filter((p) => Math.abs(Math.abs(p[1]) - 5) < 1e-9);
    assert.ok(ewPts.length > 0);
    ewPts.forEach((p) => assert.ok(Math.abs(p[0] - 50) >= 6 - 1e-9, "outside the crossing street"));
    // and there are now four east-west runs: two sides, each split at the junction
    const ewRuns = runs.filter((r) => r.every((p) => Math.abs(Math.abs(p[1]) - 5) < 1e-9));
    assert.equal(ewRuns.length, 4);
  });
  test("keeps the run through a street end that only touches", () => {
    // a T: the stem ends at the bar's centreline, so the bar's far curb is untouched
    const bar = { pts: [[0, 0], [100, 0]], hw: 5 }, stem = { pts: [[50, 5], [50, 60]], hw: 4 };
    const runs = curbRuns([bar, stem], 1);
    const far = runs.filter((r) => Math.abs(r[0][1] + 5) < 1e-9);
    assert.equal(far.length, 1);
    assert.equal(far[0].length, 101);
  });
  test("slack lets the line reach the other curb", () => {
    const ew = { pts: [[0, 0], [100, 0]], hw: 5 }, ns = { pts: [[50, -60], [50, 60]], hw: 6 };
    const tight = flat(curbRuns([ew, ns], 0.25)).filter((p) => Math.abs(p[1]) === 5).map((p) => Math.abs(p[0] - 50));
    const loose = flat(curbRuns([ew, ns], 0.25, { slack: 0.5 })).filter((p) => Math.abs(p[1]) === 5).map((p) => Math.abs(p[0] - 50));
    assert.ok(Math.min(...loose) < Math.min(...tight));
  });
  test("measures the distance to a segment", () => {
    assert.equal(segDist(5, 3, 0, 0, 10, 0), 3);
    assert.equal(segDist(-4, 0, 0, 0, 10, 0), 4);
    assert.equal(segDist(13, 4, 0, 0, 10, 0), 5);
  });
});
