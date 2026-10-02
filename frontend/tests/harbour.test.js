// The harbour detail: rails in pairs, boats in rows, sails along an axis.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { boatBoxes, longAxis, sailRow } from "../src/lib/harbour.js";

describe("the harbour detail", () => {
  test("moors boats in rows, leaving some berths empty, as closed boxes", () => {
    const counts = [1, 2, 3, 4, 5].map((seed) => boatBoxes(0, 0, 0, 2, 10, [4, 14], 1, 0, seed).edge.length / (2 * 48));   // hull and cabin, 8 edges each
    counts.forEach((n) => assert.ok(n <= 20 && n >= 10 && Number.isInteger(n), "whole boats, no more than the berths: " + n));
    assert.ok(counts.some((n) => n < 20), "some berths empty across seeds: " + counts.join(","));
    const b = boatBoxes(0, 0, 0, 2, 10, [4, 14], 1);
    assert.ok(b.pos.length > 0 && b.pos.length % 9 === 0, "whole triangles");
  });
  test("finds the long axis of a pier", () => {
    const a = longAxis([[0, 0], [100, 10], [102, 30], [2, 20]]);
    assert.ok(Math.abs(Math.abs(a.d[0]) - Math.cos(Math.atan2(10, 100))) < 0.05);
    assert.ok(a.hi - a.lo > 95);
  });
  test("stands the sails along the axis between the given fractions", () => {
    const axis = longAxis([[0, 0], [200, 0], [200, 40], [0, 40]]);
    const s = sailRow(axis, 5, 24, 22, 0.3, 0.8, 10);
    assert.equal(s.pos.length, 5 * 3 * 9);
    const ys = []; for (let i = 1; i < s.pos.length; i += 3) ys.push(s.pos[i]);
    assert.equal(Math.max(...ys), 34); assert.equal(Math.min(...ys), 10);
  });
});
