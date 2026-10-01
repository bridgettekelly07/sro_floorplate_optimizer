// The hand-worked example in the README is the answer key. These tests
// assert the tool reproduces results derived from the source documents by
// hand, before any code existed. A port of tests/test_hand_worked.py.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { evaluate, isResident } from "../src/lib/evaluate.js";
import { SOURCE_POLICY, compensationMonths } from "../src/lib/policy.js";
import { EXAMPLE, PAIRS, PARTIAL, floor, scheme } from "./fixtures.js";

const run = (fl, groups, policy = SOURCE_POLICY) => evaluate([scheme(fl, groups)], policy);
const areas = (ev) => ev.units.map((u) => u.area);

describe("the floorplate", () => {
  test("totals", () => {
    assert.equal(EXAMPLE.rooms.length, 10);
    assert.equal(EXAMPLE.rooms.reduce((t, r) => t + r.area, 0), 1192);
  });
  test("no room reaches 200 alone", () => {
    assert.ok(Math.max(...EXAMPLE.rooms.map((r) => r.area)) < 200);
  });
  test("every occupant is a permanent resident", () => {
    // s.1.2: 30 days. The 8- and 10-month tenancies clear it.
    assert.ok(EXAMPLE.rooms.every((r) => isResident(r, SOURCE_POLICY.residentDays)));
  });
});

describe("case 1: full conversion in pairs passes all three, with zero margin", () => {
  const ev = run(EXAMPLE, PAIRS);
  test("unit areas", () => assert.deepEqual(areas(ev), [210, 286, 210, 286, 200]));
  test("size passes without the average fallback", () => {
    assert.ok(ev.size.pass);
    assert.equal(ev.size.viaAverage, false);
    assert.match(ev.size.working, /238\.4/);   // 1192 / 5
  });
  test("room count passes at the cap", () => {
    assert.equal(ev.surviving, 5);
    assert.ok(ev.count.pass);
    assert.ok(ev.count.edge);
  });
  test("replacement passes at the floor", () => {
    assert.ok(ev.replace.pass);
    assert.ok(ev.replace.edge);
  });
  test("compliant overall", () => assert.ok(ev.compliant));
  test("a three-room merge breaks the cap: four units is a 60% reduction", () => {
    const ev3 = run(EXAMPLE, [[1, 2, 3], [4, 5], [6, 7], [8, 9, 10]]);
    assert.equal(ev3.surviving, 4);
    assert.equal(ev3.count.pass, false);
    assert.match(ev3.count.working, /60%/);
  });
});

describe("case 2: one scheme, two documents, opposite outcomes", () => {
  const ev = run(EXAMPLE, PARTIAL);
  test("seven rooms survive", () => {
    assert.equal(ev.units.length, 3);
    assert.equal(ev.untouched.length, 4);
    assert.equal(ev.surviving, 7);
  });
  test("size applies only to converted units", () => {
    assert.deepEqual(areas(ev), [210, 286, 210]);
    assert.ok(ev.size.pass);
    assert.match(ev.size.working, /235\.3/);   // 706 / 3
  });
  test("room count passes with margin", () => {
    assert.ok(ev.count.pass);
    assert.equal(ev.count.edge, false);
    assert.match(ev.count.working, /30%/);
  });
  test("replacement fails", () => {
    assert.equal(ev.replace.pass, false);
    assert.match(ev.replace.working, /30%/);
  });
  test("not compliant overall", () => assert.equal(ev.compliant, false));
  test("lands on the three-room exemption threshold", () => {
    assert.equal(ev.lost, 3);
    assert.ok(ev.smallLoss);
  });
});

describe("case 3: compensation is a range, not a number", () => {
  const ev = run(EXAMPLE, PAIRS);
  test("per-room schedule", () => {
    const months = EXAMPLE.rooms.map((r) => compensationMonths(r.tenancy));
    assert.deepEqual(months, [4, 5, 4, 4, 5, 5, 4, 4, 6, 4]);
  });
  test("boundary tenancies read inclusively", () => {
    // rooms 1, 10 at 5 years and room 5 at 10 years sit on bracket edges
    assert.equal(compensationMonths(5), 4);
    assert.equal(compensationMonths(10), 5);
    assert.equal(compensationMonths(10.0001), 6);
  });
  test("total if everyone were displaced", () => assert.equal(ev.allMonths, 45));
  test("five rehoused, five leave", () => {
    assert.equal(ev.rehoused, 5);
    assert.equal(ev.displaced, 5);
  });
  test("range is 20 to 25 months", () => {
    assert.equal(ev.low, 20);
    assert.equal(ev.high, 25);
    assert.notEqual(ev.low, ev.high);
  });
});

describe("case 2 compensation: untouched rooms terminate no tenancy", () => {
  const ev = run(EXAMPLE, PARTIAL);
  test("only converted rooms are at risk", () => {
    // rooms 1-6 hold 6 tenants; 3 units re-house 3; 3 must leave
    assert.equal(ev.displaced, 3);
  });
  test("range drawn from rooms 1 to 6 only", () => {
    // amounts for rooms 1-6: 4, 5, 4, 4, 5, 5 -> low 4+4+4, high 5+5+5
    assert.equal(ev.low, 12);
    assert.equal(ev.high, 15);
  });
});

describe("edges", () => {
  test("the average fallback can rescue a short unit", () => {
    const ev = run(floor([150, 150, 130, 130]), [[1, 2], [3, 4]]);
    assert.deepEqual(areas(ev), [300, 260]);
    assert.ok(ev.size.pass);
    assert.equal(ev.size.viaAverage, false);

    const ev2 = run(floor([120, 60, 150, 150]), [[1, 2], [3, 4]]);
    assert.deepEqual(areas(ev2), [180, 300]);
    assert.ok(ev2.size.viaAverage);
    assert.ok(ev2.size.pass);   // average 240
  });
  test("exactly 200 passes inclusively", () => {
    const ev = run(floor([100, 100]), [[1, 2]]);
    assert.ok(ev.size.pass);
    assert.ok(ev.size.edge);
  });
  test("a six-room building losing three: the cap met exactly and s.4.3A available at once", () => {
    const ev = run(floor([110, 110, 110, 110, 110, 110], [2, 2, 2, 2, 2, 2]), [[1, 2], [3, 4], [5, 6]]);
    assert.equal(ev.lost, 3);
    assert.ok(ev.count.edge);
    assert.ok(ev.smallLoss);
  });
  test("a vacant room owes nothing", () => {
    // a room with no tenancy is nobody's: not a permanent resident, not displaced
    const ev = run(floor([100, 100], [20, 0]), [[1, 2]]);
    assert.equal(ev.residents, 1);
    assert.equal(ev.displaced, 0);
    assert.equal(ev.low, 0);
  });
  test("a group that skips a room is not a scheme of adjacent merges", () => {
    assert.throws(() => scheme(EXAMPLE, [[1, 3]]));
  });
});
