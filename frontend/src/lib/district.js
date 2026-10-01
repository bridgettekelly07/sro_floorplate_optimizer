// The policy, applied to the district: the thresholds are applied to every
// building the policy reaches, and the tool shows who that displaces.
import { compensationMonths } from "./policy.js";
import { SURVEY, typicalRent } from "./survey.js";

export function inScope(b, scope) {
  if (scope === "all") return true;
  if (!b.surveyed) return false;
  return scope === "market" ? b.tenure === "market" : b.tenure !== "market";
}

// Every building the policy reaches, at the scheme it converts on: the
// least-loss scheme that passes the thresholds in force, or nothing.
// planOf(i) and optimumOf(i) are the (cached) model for building i.
export function candidatesFor({ surveyed, scope, recordOf, planOf, optimumOf }) {
  const list = [], stuck = [], noPlan = [], already = [];
  let rooms = 0;
  surveyed.forEach((b, i) => {
    if (!inScope(b, scope) || !b.rooms) return;
    const rd = recordOf(b);
    if (rd && rd.selfContained) { already.push(i); return; }
    rooms += b.rooms;
    const p = planOf(i);
    if (!p || !p.placed) { noPlan.push(i); return; }
    const o = optimumOf(i);
    if (!o || !o.feasible) { stuck.push(i); return; }
    list.push({ i, n: o.original, units: o.units, kept: o.kept, lost: o.lost });
  });
  return { list, stuck, noPlan, already, rooms };
}

// the figures one set of thresholds gives
export function policyOutcome(cands, surveyed, policy) {
  const out = { convert: 0, of: cands.list.length + cands.stuck.length, units: 0, kept: 0, lost: 0,
                tenants: 0, gm: 0, council: 0, comp: 0, cannot: cands.stuck.length };
  const months = compensationMonths(SURVEY.tenancyYears);
  cands.list.forEach((c) => {
    out.convert++; out.units += c.units; out.kept += c.kept; out.lost += c.lost; out.tenants += c.n;
    if (c.lost > 0 && c.lost <= policy.smallLoss) out.gm++; else if (c.lost > policy.smallLoss) out.council++;
    out.comp += c.lost * months * typicalRent(surveyed[c.i]);
  });
  cands.stuck.forEach((i) => { out.tenants += surveyed[i].rooms; });
  out.stuckTenants = cands.stuck.reduce((t, i) => t + surveyed[i].rooms, 0);
  out.noPlanTenants = cands.noPlan.reduce((t, i) => t + surveyed[i].rooms, 0);
  return out;
}

// what the policy does with each building, by Appendix B index
export function scenarioOf(cands, surveyed) {
  const byIndex = {};
  cands.list.forEach((c) => { byIndex[c.i] = { state: "converted", units: c.units, kept: c.kept, lost: c.lost, n: c.n }; });
  cands.stuck.forEach((i) => { byIndex[i] = { state: "infeasible", n: surveyed[i].rooms }; });
  cands.already.forEach((i) => { byIndex[i] = { state: "self-contained", n: surveyed[i].rooms }; });
  return byIndex;
}
