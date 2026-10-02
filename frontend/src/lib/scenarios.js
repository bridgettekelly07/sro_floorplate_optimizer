// Three settings of the thresholds to present the tool with, each a change
// to the City's rules that the map and the district tally make visible.
// The policy fields not named take the City's figure.
import { SOURCE_POLICY } from "./policy.js";

export const SCENARIOS = [
  { key: "city", name: "The City’s rules", policy: {},
    note: "200 SF a unit, no more than half the rooms lost, half returned as units." },
  { key: "small", name: "Smaller units", policy: { minUnit: 150 },
    note: "150 SF a unit. Most rooms convert in place, so far fewer people leave." },
  { key: "big", name: "Bigger units, tighter cap", policy: { minUnit: 250, maxReduction: 0.3 },
    note: "250 SF a unit and no more than 30% of rooms lost. Half the stock cannot convert at all." },
];

// the full policy a scenario sets
export function scenarioPolicy(s) { return { ...SOURCE_POLICY, ...s.policy }; }

// the scenario a policy matches, or null when the sliders are somewhere else
export function activeScenario(policy) {
  return SCENARIOS.find((s) => { const p = scenarioPolicy(s); return Object.keys(p).every((k) => Math.abs(p[k] - policy[k]) < 1e-9); }) || null;
}
