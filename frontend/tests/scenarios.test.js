// The presentation scenarios: each a full policy, the first the City's own.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, scenarioPolicy, activeScenario } from "../src/lib/scenarios.js";
import { SOURCE_POLICY, clampPolicy } from "../src/lib/policy.js";

describe("the scenarios", () => {
  test("the first is the City's rules exactly", () => { assert.deepEqual(scenarioPolicy(SCENARIOS[0]), { ...SOURCE_POLICY }); });
  test("each is a valid policy", () => { SCENARIOS.forEach((s) => assert.deepEqual(clampPolicy(scenarioPolicy(s)), scenarioPolicy(s))); });
  test("a policy is matched to its scenario, and only then", () => {
    assert.equal(activeScenario(scenarioPolicy(SCENARIOS[1])), SCENARIOS[1]);
    assert.equal(activeScenario({ ...SOURCE_POLICY, minUnit: 175 }), null);
  });
});
