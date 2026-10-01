// The search, checked against the evaluator and against the README. The
// README proves by hand that Case 1 is the only compliant scheme the example
// floor admits under the strict reading. The search must find it, and every
// scheme it returns must pass the evaluator, so the two halves cannot
// disagree. A port of tests/test_optimize.py.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { optimise } from "../src/lib/search.js";
import { evaluate } from "../src/lib/evaluate.js";
import { SOURCE_POLICY, isSourcePolicy, clampPolicy } from "../src/lib/policy.js";
import { AREAS, EXAMPLE, scheme } from "./fixtures.js";

const S = SOURCE_POLICY;
const pol = (over) => ({ ...S, ...over });
const uniform = (n, a, strict, policy = S) => optimise([Array(n).fill(a)], strict, policy);

// the optimum on one run, as the groups of 1-based ids the evaluator's scheme takes
function asGroups(o) {
  return o.runs[0].groups.map((g) => g.map((k) => k + 1));
}

describe("the hand-worked floor", () => {
  test("the strict reading finds case 1 and only case 1", () => {
    const o = optimise([AREAS], true, S);
    assert.ok(o.feasible);
    assert.deepEqual(o.runs[0].groups, [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]]);
    assert.deepEqual(o.runs[0].kept, []);
    assert.deepEqual([o.units, o.lost], [5, 5]);
  });
  test("the strict optimum passes the evaluator", () => {
    const o = optimise([AREAS], true, S);
    const ev = evaluate([scheme(EXAMPLE, asGroups(o))], S);
    assert.ok(ev.compliant);
    assert.equal(ev.lost, o.lost);
  });
  test("the average reading loses fewer rooms and still passes", () => {
    const o = optimise([AREAS], false, S);
    assert.ok(o.feasible);
    assert.ok(o.lost < 5);
    const ev = evaluate([scheme(EXAMPLE, asGroups(o))], S);
    assert.ok(ev.compliant);
    assert.equal(ev.lost, o.lost);
    assert.equal(ev.units.length, o.units);
  });
  test("asking for more units costs more rooms", () => {
    // under the average reading the frontier exists beyond the 50% floor
    let last = -1;
    for (let u = 5; u <= 8; u++) {
      const o = optimise([AREAS], false, S, u);
      if (!o.feasible) break;
      assert.ok(o.units >= u);
      assert.ok(o.lost >= last);
      last = o.lost;
    }
  });
});

describe("a building of floors", () => {
  test("a generous floor carries a mean one", () => {
    // The tests count rooms in the building. Alone, a floor of three 100 SF
    // rooms has no compliant scheme (one pair is 33%). Under a floor of 200 SF
    // rooms converted in place, the building of six reaches 50% and the small
    // floor is left untouched, losing nobody.
    const mean = [100, 100, 100], generous = [200, 200, 200];
    assert.equal(optimise([mean], true, S).feasible, false);
    const o = optimise([generous, mean], true, S);
    assert.ok(o.feasible);
    assert.deepEqual([o.units, o.lost], [3, 0]);
    assert.deepEqual(o.runs[1].kept, [0, 1, 2]);
  });
  test("rooms never merge across a run", () => {
    // two runs of five 100 SF rooms: each pairs four and strands one, so the
    // building makes four units of ten, not five
    const five = Array(5).fill(100);
    assert.equal(optimise([five, five], true, S).feasible, false);
  });
  test("rooms already 200 convert in place with no loss", () => {
    const o = optimise([[200, 210, 250]], true, S);
    assert.deepEqual([o.units, o.lost, o.kept], [3, 0, 0]);
  });
});

describe("uniform floors: the thresholds the stock turns on", () => {
  test("pairs at exactly 100 SF: the 50% case, no margin", () => assert.equal(uniform(10, 100, true).lost, 5));
  test("under 100 SF no adjacent-merge scheme is compliant under either reading", () => {
    assert.equal(uniform(10, 99, true).feasible, false);
    assert.equal(uniform(10, 99, false).feasible, false);
  });
  test("an odd count of sub-200 rooms cannot pair its way to 50% strictly, but the average carries a single", () => {
    assert.equal(uniform(11, 150, true).feasible, false);
    assert.ok(uniform(11, 150, false).feasible);
  });
  test("larger rooms lose fewer: 150 SF rooms lose 2 of 10, not 5", () => assert.equal(uniform(10, 150, false).lost, 2));
  test("every optimum passes the evaluator", () => {
    for (const n of [4, 7, 10, 11, 16]) for (const a of [80, 95, 100, 115, 133, 150, 180, 200, 240]) for (const strict of [true, false]) {
      const o = uniform(n, a, strict);
      if (!o.feasible) continue;
      const fl = { rooms: Array(n).fill(0).map((_, i) => ({ id: String(i + 1), area: a, tenancy: 1, keep: true })), joints: Array(n - 1).fill(false) };
      const ev = evaluate([scheme(fl, asGroups(o))], S);
      assert.ok(ev.compliant, JSON.stringify([n, a, strict]));
      assert.equal(ev.lost, o.lost);
      if (strict) assert.ok(ev.units.every((u) => u.area >= 200));
    }
  });
});

describe("the policy: the sources' by default and the user's when set", () => {
  test("the default policy is the sources", () => {
    assert.ok(isSourcePolicy(S));
    assert.equal(S.minUnit, 200);
    assert.equal(S.maxReduction, 0.5);
    assert.equal(S.minReplace, 0.5);
    assert.equal(S.smallLoss, 3);
    assert.equal(S.residentDays, 30);
    assert.equal(isSourcePolicy(pol({ minUnit: 150 })), false);
  });
  test("a typed value is clamped to sense", () => {
    assert.equal(clampPolicy(pol({ minUnit: 9999 })).minUnit, 600);
    assert.equal(clampPolicy({}).maxMerge, 3);
  });
  test("a lower minimum displaces fewer", () => {
    const source = optimise([AREAS], false, S), lower = optimise([AREAS], false, pol({ minUnit: 150 }));
    assert.ok(source.feasible && lower.feasible);
    assert.ok(lower.lost < source.lost);
    assert.ok(lower.units >= source.units);
  });
  test("a tighter cut makes the example infeasible", () => {
    // pairs lose half the rooms; a policy allowing at most a 30% cut has no scheme
    const tight = optimise([AREAS], true, pol({ maxReduction: 0.3 }));
    assert.equal(tight.feasible, false);
    assert.match(tight.reason, /cannot leave/);
  });
  test("the replacement floor moves with the policy", () => {
    const loose = optimise([AREAS], true, pol({ minReplace: 0.2 }));
    assert.ok(loose.feasible);
    assert.ok(loose.units >= 2);
    assert.ok(loose.lost <= optimise([AREAS], true, S).lost);
  });
  test("the merge ceiling bounds how big a unit can grow", () => {
    // 60 SF rooms need four to reach 200: at most three per unit, nothing passes
    assert.equal(uniform(8, 60, true, pol({ maxMerge: 3 })).feasible, false);
    assert.equal(uniform(8, 60, true, pol({ maxMerge: 4, maxReduction: 0.8, minReplace: 0.2 })).feasible, true);
  });
  test("the evaluator reports the policy it used", () => {
    const p = pol({ minUnit: 150, smallLoss: 6, residentDays: 0 });
    const ev = evaluate([scheme(EXAMPLE, [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]])], p);
    assert.match(ev.size.working, /150/);
    assert.ok(ev.smallLoss);                 // five rooms lost, under a six-room route
    const source = evaluate([scheme(EXAMPLE, [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]])], S);
    assert.equal(source.smallLoss, false);   // and over the three-room route of s.4.3A
    assert.ok(ev.residents >= source.residents);
  });
});
