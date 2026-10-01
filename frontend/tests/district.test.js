// The building model and the policy applied to a small synthetic stock.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { typicalPlan, optimumFor, buildFloors, planFromState, floorsOf } from "../src/lib/typicalFloor.js";
import { evaluate } from "../src/lib/evaluate.js";
import { candidatesFor, policyOutcome, scenarioOf, inScope } from "../src/lib/district.js";
import { SOURCE_POLICY } from "../src/lib/policy.js";

// a rectangular footprint about 30 m by 12 m at Vancouver's latitude
const dLon = 30 / (111320 * Math.cos(49.28 * Math.PI / 180)), dLat = 12 / 110540;
const ring = [[-123.1, 49.28], [-123.1 + dLon, 49.28], [-123.1 + dLon, 49.28 + dLat], [-123.1, 49.28 + dLat], [-123.1, 49.28]];
const b = (over) => ({ name: "TEST", rooms: 24, hgtM: 10.2, surveyed: true, tenure: "market", lon: -123.1, lat: 49.28, poly: ring, ...over });
const assume = { cap: 180, circ: 0.25 };

describe("the typical floor", () => {
  test("storeys from the LiDAR height, rooms spread over the floors above retail", () => {
    const bb = b();
    assert.equal(floorsOf(bb), 3);
    const p = typicalPlan(bb, { ring, source: "parcel" }, assume);
    assert.ok(p && p.placed);
    assert.equal(p.res, 2);
    assert.equal(p.perFloor, 12);
    assert.ok(p.dbl, "wide enough for a double-loaded corridor");
    assert.equal(p.runs.length, 2);
  });
  test("the scheme repeats on every floor and the floors state draws it back", () => {
    const bb = b(), p = typicalPlan(bb, { ring, source: "parcel" }, assume);
    const o = optimumFor(p, false, SOURCE_POLICY);
    assert.ok(o.feasible);
    assert.equal(o.original, p.placed * p.res);
    const floors = buildFloors(p, o, 4.6);
    assert.equal(floors.length, p.res);
    const ev = evaluate(floors, SOURCE_POLICY);
    assert.ok(ev.compliant);
    assert.equal(ev.lost, o.lost);
    const g = planFromState(p, floors, false);
    assert.equal(g.rooms.length, p.placed);
    assert.ok(planFromState(p, floors, true).rooms.every((r) => !r.keep));
  });
  test("when nothing passes, every room is kept", () => {
    const bb = b(), p = typicalPlan(bb, { ring, source: "parcel" }, assume);
    const o = optimumFor(p, true, { ...SOURCE_POLICY, maxReduction: 0 });
    assert.equal(o.feasible, false);
    const floors = buildFloors(p, o, 4.6);
    assert.ok(floors.every((fl) => fl.rooms.every((r) => r.keep)));
    assert.equal(evaluate(floors, SOURCE_POLICY).lost, 0);
  });
});

describe("the policy applied to the district", () => {
  const stock = [b(), b({ name: "PUBLIC", tenure: "nonmarket" }), b({ name: "DONE" }), b({ name: "NOWHERE", poly: null, lon: null }), b({ name: "STUCK", rooms: 9, hgtM: 3 })];
  const records = { DONE: { selfContained: true } };
  const plans = stock.map((x) => (x.poly ? typicalPlan(x, { ring, source: "parcel" }, assume) : null));
  const args = (scope, policy = SOURCE_POLICY) => ({
    surveyed: stock, scope, recordOf: (x) => records[x.name] || null,
    planOf: (i) => plans[i], optimumOf: (i) => optimumFor(plans[i], false, policy)
  });
  test("scope", () => {
    assert.ok(inScope(stock[0], "market") && !inScope(stock[1], "market"));
    assert.ok(inScope(stock[1], "nonmarket") && inScope(stock[1], "all"));
    assert.equal(inScope(b({ surveyed: false }), "market"), false);
  });
  test("each building lands in one bucket", () => {
    const c = candidatesFor(args("market"));
    assert.deepEqual(c.already, [2]);
    assert.deepEqual(c.noPlan, [3]);
    assert.ok(c.list.some((x) => x.i === 0));
    assert.ok(!c.list.some((x) => x.i === 1), "public SROs are out of scope");
    const scen = scenarioOf(c, stock);
    assert.equal(scen[2].state, "self-contained");
    assert.equal(scen[0].state, "converted");
    assert.equal(scen[1], undefined);
  });
  test("the outcome sums the candidates", () => {
    const c = candidatesFor(args("all")), out = policyOutcome(c, stock, SOURCE_POLICY);
    assert.equal(out.of, c.list.length + c.stuck.length);
    assert.equal(out.lost, c.list.reduce((t, x) => t + x.lost, 0));
    assert.equal(out.units, c.list.reduce((t, x) => t + x.units, 0));
    assert.equal(out.gm + out.council, c.list.filter((x) => x.lost > 0).length);
    assert.equal(out.noPlanTenants, 24);
    assert.ok(out.comp > 0);
  });
  test("a policy nothing can pass leaves everyone where they are", () => {
    const c = candidatesFor(args("all", { ...SOURCE_POLICY, maxReduction: 0, minReplace: 0.5 }));
    assert.equal(c.list.length, 0);
    const out = policyOutcome(c, stock, SOURCE_POLICY);
    assert.equal(out.lost, 0);
    assert.equal(out.stuckTenants, out.tenants);
  });
});
