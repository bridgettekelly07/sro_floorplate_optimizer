// The landmarks: found by a point in a footprint, and a sphere's edges drawn once each.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { landmarkOf, within, triangleEdges, roundCentre, LANDMARKS } from "../src/lib/landmarks.js";

describe("the landmarks", () => {
  test("finds Science World by a point in its footprint", () => {
    const l = LANDMARKS[0], d = 0.0005;
    const ring = [[l.lon - d, l.lat - d], [l.lon + d, l.lat - d], [l.lon + d, l.lat + d], [l.lon - d, l.lat + d]];
    assert.equal(landmarkOf(ring), l);
    assert.equal(landmarkOf(ring.map(([x, y]) => [x + 1, y])), null);
    assert.ok(within([l.lon, l.lat], ring));
  });
  test("finds the centre of the round part, ignoring a wing", () => {
    // three quarters of a circle of radius 30 about (100, 50), then a rectangular wing off to the east
    const ring = [];
    for (let i = 0; i <= 36; i++) { const a = Math.PI / 2 + i / 36 * 1.5 * Math.PI; ring.push([100 + 30 * Math.cos(a), 50 + 30 * Math.sin(a)]); }
    ring.push([160, 60], [200, 60], [200, 40], [160, 40]);
    const c = roundCentre(ring);
    assert.ok(Math.abs(c.x - 100) < 0.5 && Math.abs(c.y - 50) < 0.5, "centre " + c.x + "," + c.y);
    assert.ok(Math.abs(c.r - 30) < 0.5);
  });
  test("lists each edge of a triangle fan once", () => {
    // two triangles sharing an edge, indexed: 5 edges, not 6
    const pos = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], idx = [0, 1, 2, 1, 3, 2];
    assert.equal(triangleEdges(pos, idx).length, 5 * 6);
    // the same, non-indexed: vertices repeat, and the shared edge is still drawn once
    const flat = idx.flatMap((i) => pos.slice(3 * i, 3 * i + 3));
    assert.equal(triangleEdges(flat, null).length, 5 * 6);
  });
});
