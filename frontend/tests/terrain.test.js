// The heightfield and the delta-encoded lines and points, decoded.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { decodeTerrain, decodeLines, decodeTrees } from "../src/lib/terrain.js";

// a 3 x 2 grid rising 1 m per cell eastward: heights 0,1,2 / 0,1,2 in decimetres + 100
function packed(vals) {
  const bytes = []; vals.forEach((v) => { const u = Math.round((v + 10) * 10); bytes.push(u & 255, u >> 8); });
  return Buffer.from(bytes).toString("base64");
}
const bbox = [-123.1, 49.28, -123.1 + 2 * 12 / (111320 * Math.cos(49.28 * Math.PI / 180)), 49.28 + 12 / 110540];

describe("the heightfield", () => {
  const t = decodeTerrain({ bbox, cell: 12, nx: 3, ny: 2, heights: packed([0, 1, 2, 0, 1, 2]), contours: { origin: bbox, scale: 1e-5, levels: [1], lines: [[0, 0, 5, 5]] } });
  test("decodes the packed decimetres", () => {
    assert.deepEqual([...t.heights], [0, 1, 2, 0, 1, 2]);
    assert.equal(t.min, 0); assert.equal(t.max, 2);
  });
  test("samples bilinearly, half a cell east is half a metre up", () => {
    const kx = 111320 * Math.cos(49.28 * Math.PI / 180);
    assert.ok(Math.abs(t.at(bbox[0] + 6 / kx, bbox[1]) - 0.5) < 1e-4);
    assert.ok(Math.abs(t.at(bbox[0] + 18 / kx, bbox[1] + 3 / 110540) - 1.5) < 1e-4);
  });
  test("holds the edge value beyond the grid", () => {
    assert.equal(t.at(bbox[0] - 1, bbox[1] - 1), 0);
    assert.equal(t.at(bbox[2] + 1, bbox[3] + 1), 2);
  });
  test("decodes the contours with their level", () => {
    assert.equal(t.contours.length, 1);
    assert.equal(t.contours[0].z, 1);
    assert.deepEqual(t.contours[0].pts[1].map((v, i) => +(v - bbox[i]).toFixed(5)), [0.00005, 0.00005]);
  });
});

describe("delta-encoded lines and points", () => {
  test("lines accumulate from the first vertex", () => {
    const L = decodeLines({ origin: [0, 0], scale: 1, lines: [[1, 1, 2, 0, 0, 3]] });
    assert.deepEqual(L, [[[1, 1], [3, 1], [3, 4]]]);
  });
  test("trees accumulate across the list and carry height and diameter", () => {
    const T = decodeTrees({ origin: [0, 0], scale: 1, x: [10, 5], y: [20, -5], h: [14, 7], d: [40, 20] });
    assert.deepEqual(T, [{ lon: 10, lat: 20, h: 7, d: 40 }, { lon: 15, lat: 15, h: 3.5, d: 20 }]);
  });
});
