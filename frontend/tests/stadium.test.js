// The stadium: a closed roof between rim and oculus, masts to the recorded height, cables and ribs.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { stadiumGeometry, STADIUM } from "../src/lib/stadium.js";

describe("the stadium", () => {
  const g = stadiumGeometry(0, 0, 100, 30, 1);
  test("roofs the drum from the rim up to the oculus", () => {
    assert.equal(g.pos.length, STADIUM.rings * STADIUM.segments * 2 * 9);
    const ys = []; for (let i = 1; i < g.pos.length; i += 3) ys.push(g.pos[i]);
    assert.equal(Math.min(...ys), 30); assert.ok(Math.abs(Math.max(...ys) - 44) < 1e-9);
    const rs = []; for (let i = 0; i < g.pos.length; i += 3) rs.push(Math.hypot(g.pos[i], g.pos[i + 2]));
    assert.ok(Math.abs(Math.min(...rs) - 18) < 1e-6 && Math.abs(Math.max(...rs) - 100) < 1e-6);
  });
  test("raises the masts above the rim, leaning out, one cable and one rib each", () => {
    const mastTops = []; for (let i = 0; i < g.edge.length; i += 6) if (g.edge[i + 4] === 60) mastTops.push([g.edge[i + 3], g.edge[i + 5]]);
    assert.equal(mastTops.length, STADIUM.masts);
    mastTops.forEach(([x, z]) => assert.ok(Math.abs(Math.hypot(x, z) - 122) < 1e-6));
    assert.equal(g.line.length, STADIUM.masts * (1 + STADIUM.rings) * 6);
  });
});
