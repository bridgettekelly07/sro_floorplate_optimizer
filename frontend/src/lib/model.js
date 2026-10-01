// The model of each building, memoised: its typical floor under the current
// assumptions and its least-loss scheme under the current policy. Both are
// pure functions of their inputs, so the caches are keyed on them.
import { typicalPlan, optimumFor, outlineOf } from "./typicalFloor.js";
import { policyKey } from "./policy.js";

const plans = new Map(), opts = new Map();

export function planOf(data, i, assume) {
  const key = assume.cap + "," + assume.circ + ":" + i;
  if (plans.has(key)) return plans.get(key);
  const b = data.surveyed[i];
  const p = b ? typicalPlan(b, outlineOf(b, data.foot), { cap: assume.cap, circ: assume.circ / 100 }) : null;
  plans.set(key, p);
  return p;
}

export function optimumOf(data, i, assume, strict, policy) {
  const key = assume.cap + "," + assume.circ + ":" + policyKey(policy, strict) + ":" + i;
  if (opts.has(key)) return opts.get(key);
  const o = optimumFor(planOf(data, i, assume), strict, policy);
  opts.set(key, o);
  return o;
}
