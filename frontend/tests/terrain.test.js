// The heightfield and the delta-encoded lines and points, decoded.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { decodeTerrain, decodeLines, decodeTrees, shoreDistance, shoreOutline, fieldBytes } from "../src/lib/terrain.js";

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

describe("the shore distance", () => {
  // a 10 by 4 mask, land in the left 4 columns of every row, in a scene where a unit is 1 m and the mask cell is 10 m
  const land = { nx: 10, ny: 4, rows: [[0, 4, 6], [0, 4, 6], [0, 4, 6], [0, 4, 6]] };
  const proj = { x: (lon) => lon, y: (lat) => -lat, mPerUnit: 1 };
  const terrain = { bbox: [0, -40, 100, 0], land };   // x 0..100, z 0..40 (lat runs the other way)
  const sd = shoreDistance(terrain, proj);
  test("is zero on land and grows by the cell size per column of water", () => {
    assert.equal(sd.cellM, 10);
    assert.equal(sd.at(15, 20), 0);
    assert.ok(Math.abs(sd.at(45, 20) - 10) < 1e-6);     // column 4: one cell from the land in column 3
    assert.ok(Math.abs(sd.at(55, 20) - 20) < 1e-6);
    assert.ok(Math.abs(sd.at(95, 20) - 60) < 1e-6);
  });
  test("measures inland distance the other way", () => {
    assert.equal(sd.inland(55, 20), 0);                      // at sea
    assert.ok(Math.abs(sd.inland(35, 20) - 10) < 1e-6);      // column 3, one cell in from the water in column 4
  });
  test("keeps growing past the mask's edge", () => {
    assert.ok(sd.at(150, 20) > sd.at(95, 20));
  });
});

describe("the traced shoreline", () => {
  const area = (q) => { let s = 0; for (let i = 0; i < q.length; i++) { const p = q[i], n = q[(i + 1) % q.length]; s += p[0] * n[1] - n[0] * p[1]; } return s / 2; };
  test("closes a block of land into one ring through the cell edges", () => {
    // a 2 x 2 island in a 4 x 4 mask (rows from the south, water first)
    const r = shoreOutline({ land: { nx: 4, ny: 4, rows: [[4], [1, 2, 1], [1, 2, 1], [4]] } }, 0);
    assert.equal(r.length, 1);
    assert.equal(r[0].length, 8);                                   // four sides and four cut corners
    assert.ok(Math.abs(Math.abs(area(r[0])) - 3.5) < 1e-9);          // the 4 cells less the four corner cuts
    r[0].forEach(([x, y]) => { assert.ok(x >= 1 && x <= 3 && y >= 1 && y <= 3, "on the cell boundary band"); });
  });
  test("draws a lake as a second ring wound the other way", () => {
    const r = shoreOutline({ land: { nx: 5, ny: 5, rows: [[5], [1, 3, 1], [1, 1, 1, 1, 1], [1, 3, 1], [5]] } }, 0);
    assert.equal(r.length, 2);
    const a = r.map(area).sort((p, q) => Math.abs(p) - Math.abs(q));
    assert.ok(a[0] * a[1] < 0, "opposite winding");
  });
  test("rounding keeps the ring closed and roughly the same size", () => {
    const sharp = shoreOutline({ land: { nx: 4, ny: 4, rows: [[4], [1, 2, 1], [1, 2, 1], [4]] } }, 0)[0];
    const soft = shoreOutline({ land: { nx: 4, ny: 4, rows: [[4], [1, 2, 1], [1, 2, 1], [4]] } }, 2)[0];
    assert.equal(soft.length, sharp.length * 4);
    assert.ok(Math.abs(area(soft)) > Math.abs(area(sharp)) * 0.9);
  });
  test("returns null without a mask", () => { assert.equal(shoreOutline({}), null); });
});

describe("the shoreline field", () => {
  // a 10 x 4 raster, land where x < 4.3, and the line drawn as a ring around the land through x = 4.3
  const w = 10, h = 4, land = new Uint8Array(w * h), toWater = new Float32Array(w * h), toLand = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const q = j * w + i; land[q] = i < 4 ? 1 : 0;
    toWater[q] = i < 4 ? 4 - i : 0; toLand[q] = i < 4 ? 0 : i - 3;      // centre-to-centre distances, as a transform gives them
  }
  const ring = [[-5, -5], [4.3, -5], [4.3, 9], [-5, 9]];
  const bytes = fieldBytes([ring], w, h, land, toWater, toLand, 2, 10);   // 2 m per pixel, 10 m range
  test("measures the exact distance to the line, not to the pixel centres", () => {
    const d = (i) => (bytes[i] - 128) / 127 * 10;
    assert.ok(Math.abs(d(3) - (4.3 - 3.5) * 2) < 0.1);     // 0.8 px inland of the line
    assert.ok(Math.abs(d(4) - -(4.5 - 4.3) * 2) < 0.1);    // 0.2 px to sea
    assert.ok(Math.abs(d(6) - -(6.5 - 4.3) * 2) < 0.1);
  });
  test("saturates beyond the range", () => {
    assert.equal(bytes[9], 1);                              // 10.4 m to sea, past the 10 m range
    assert.equal(bytes[0], 128 + Math.round(0.76 * 127));   // 7.6 m inland, within it
  });
});
