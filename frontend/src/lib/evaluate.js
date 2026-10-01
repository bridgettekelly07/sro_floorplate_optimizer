// The operation: a building of floors + the scheme drawn on them -> the three
// tests, rooms lost and tenants displaced. Each test is evaluated on its own
// and carries its own working; the two 50% figures are deliberately not
// collapsed into one ratio.
import { EPS, compensationMonths } from "./policy.js";
import { fmt, pct, letter } from "./format.js";

// Groups: maximal runs of converted rooms linked by joints, within one floor.
// Rooms never merge across a floor slab, so grouping is always per floor.
export function groupsOf(fr, fj) {
  const out = [];
  let run = [];
  for (let i = 0; i < fr.length; i++) {
    if (fr[i].keep) { if (run.length) { out.push(run); run = []; } continue; }
    run.push(i);
    const linked = i < fr.length - 1 && fj[i] && !fr[i + 1].keep;
    if (!linked) { out.push(run); run = []; }
  }
  if (run.length) out.push(run);
  return out;
}

export function isResident(r, residentDays) { return r.tenancy * 365 >= residentDays; }
const add = (a, b) => a + b;

// Evaluate the whole building. The sources count rooms in a BUILDING, not a
// floorplate: s.4.3A says "no more than 3 designated rooms in the building",
// and the Guidelines' average is taken "across all converted rooms".
export function evaluate(floors, policy) {
  const { minUnit, maxReduction, minReplace, smallLoss, residentDays } = policy;
  const multi = floors.length > 1;
  const units = [], untouched = [];
  let original = 0;

  floors.forEach((fl, idx) => {
    const fr = fl.rooms, fj = fl.joints;
    original += fr.length;
    groupsOf(fr, fj).forEach((g, i) => {
      const area = g.reduce((t, k) => t + fr[k].area, 0);
      units.push({
        label: (multi ? (idx + 1) + "–" : "") + letter(i),
        floor: idx, idx: g, ids: g.map((k) => fr[k].id),
        area, ok: area >= minUnit - EPS
      });
    });
    fr.forEach((r) => { if (r.keep) untouched.push(r); });
  });

  // s.1.2: connecting rooms used as one unit count as a single "room".
  const surviving = units.length + untouched.length;
  const lost = original - surviving;

  let size;
  if (!units.length) {
    size = { pass: true, edge: false, viaAverage: false, working: "no rooms converted; the size test does not apply" };
  } else {
    const short = units.filter((u) => u.area < minUnit - EPS);
    const convertedArea = units.reduce((s, u) => s + u.area, 0);
    const avg = convertedArea / units.length;
    if (!short.length) {
      const min = Math.min(...units.map((u) => u.area));
      size = {
        pass: true,
        edge: units.some((u) => Math.abs(u.area - minUnit) < EPS),
        working: "every unit ≥ " + minUnit + " SF (smallest " + fmt(min) + "); average fallback not triggered. Average "
          + fmt(convertedArea) + " ÷ " + units.length + " = " + avg.toFixed(1) + " SF"
      };
    } else {
      size = {
        pass: avg >= minUnit - EPS,
        edge: Math.abs(avg - minUnit) < EPS,
        working: short.length + " unit" + (short.length > 1 ? "s" : "") + " below " + minUnit + " SF ("
          + short.map((u) => u.label + " " + fmt(u.area)).join(", ")
          + "); average fallback applies: " + fmt(convertedArea) + " ÷ " + units.length
          + " = " + avg.toFixed(1) + " SF"
      };
    }
    size.viaAverage = short.length > 0;
  }

  const reduction = original ? lost / original : 0;
  const count = {
    pass: reduction <= maxReduction + EPS,
    edge: Math.abs(reduction - maxReduction) < EPS,
    working: original + " → " + surviving + " rooms; reduction " + lost + " ÷ " + original + " = " + pct(reduction)
  };

  const ratio = original ? units.length / original : 0;
  const replace = {
    pass: ratio >= minReplace - EPS,
    edge: Math.abs(ratio - minReplace) < EPS,
    working: units.length + " self-contained unit" + (units.length === 1 ? "" : "s") + " ÷ "
      + original + " original rooms = " + pct(ratio)
  };

  // Surviving units absorb tenants under the right of first refusal, so
  // permanent displacement is smaller than rooms lost.
  const candidates = [];
  units.forEach((u) => {
    const fr = floors[u.floor].rooms;
    u.idx.forEach((k) => { if (isResident(fr[k], residentDays)) candidates.push(fr[k]); });
  });
  const rehoused = Math.min(candidates.length, units.length);
  const displaced = Math.max(0, candidates.length - rehoused);

  const amounts = candidates.map((r) => compensationMonths(r.tenancy)).sort((a, b) => a - b);
  const low = amounts.slice(0, displaced).reduce(add, 0);
  const high = displaced ? amounts.slice(amounts.length - displaced).reduce(add, 0) : 0;

  return {
    units, untouched, original, surviving, lost, size, count, replace,
    compliant: size.pass && count.pass && replace.pass,
    smallLoss: lost > 0 && lost <= smallLoss,
    residents: floors.reduce((t, fl) => t + fl.rooms.filter((r) => isResident(r, residentDays)).length, 0),
    floorCount: floors.length,
    perFloor: floors.map((fl, fi) => {
      const u = units.filter((x) => x.floor === fi);
      const keep = fl.rooms.filter((r) => r.keep).length;
      return { floor: fi, original: fl.rooms.length, units: u.length, surviving: u.length + keep,
               lost: fl.rooms.length - (u.length + keep), short: u.filter((x) => !x.ok).length };
    }),
    candidates: candidates.length, rehoused, displaced, low, high, allMonths: amounts.reduce(add, 0)
  };
}
