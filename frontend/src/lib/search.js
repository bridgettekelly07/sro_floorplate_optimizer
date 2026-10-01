// The search: which compliant scheme displaces the fewest tenants?
// A run is a row of rooms along one side of one corridor; units are runs of
// consecutive rooms; rooms never merge across a corridor or a floor slab.
// The objective is rooms lost, which with every room occupied is tenants
// displaced. The thresholds it passes are the policy given to it.
import { EPS } from "./policy.js";

export function runFrontier(areas, strict, policy) {
  const { minUnit, maxMerge } = policy;
  const n = areas.length, layers = [];
  for (let i = 0; i <= n; i++) layers.push({});
  layers[0]["0,0"] = { u: 0, k: 0, area: 0, prev: null, move: null };
  function push(layer, u, k, area, prev, move) {
    const key = u + "," + k, cur = layer[key];
    if (!cur || area > cur.area + EPS) layer[key] = { u, k, area, prev, move };
  }
  for (let i = 0; i < n; i++) {
    const L = layers[i];
    for (const key in L) {
      const st = L[key];
      push(layers[i + 1], st.u, st.k + 1, st.area, st, [0, i]);
      let s = 0;
      for (let j = i; j < n && j - i < maxMerge; j++) {
        s += areas[j];
        if (strict && s < minUnit - EPS) continue;
        push(layers[j + 1], st.u + 1, st.k, st.area + s, st, [1, i, j]);
      }
    }
  }
  return layers[n];
}

function walkRun(state) {
  const groups = [], kept = [];
  while (state.prev) {
    if (state.move[0] === 0) kept.push(state.move[1]);
    else { const g = []; for (let r = state.move[1]; r <= state.move[2]; r++) g.push(r); groups.push(g); }
    state = state.prev;
  }
  return { groups: groups.reverse(), kept: kept.reverse() };
}

export function buildingFrontier(runs, strict, policy) {
  const per = runs.map((r) => runFrontier(r, strict, policy));
  let states = { "0,0": { U: 0, K: 0, area: 0, path: [] } };
  per.forEach((fr) => {
    const nxt = {};
    for (const a in states) {
      const S = states[a];
      for (const b in fr) {
        const st = fr[b], U = S.U + st.u, K = S.K + st.k, key = U + "," + K, area = S.area + st.area;
        const cur = nxt[key];
        if (!cur || area > cur.area + EPS) nxt[key] = { U, K, area, path: S.path.concat([st]) };
      }
    }
    states = nxt;
  });
  return { states, per };
}

export function minUnits(n, policy) { return Math.ceil(n * policy.minReplace - EPS); }
export function passes(n, U, K, area, policy) {
  const lost = n - U - K;
  if (n && lost / n > policy.maxReduction + EPS) return false;
  if (U < minUnits(n, policy)) return false;
  if (U && area / U < policy.minUnit - EPS) return false;
  return true;
}

// The least-loss compliant scheme for a building of runs. Ties on rooms
// lost go to more units, then to more converted area.
export function optimise(runs, strict, policy, minU) {
  const n = runs.reduce((t, r) => t + r.length, 0);
  const bf = buildingFrontier(runs, strict, policy), need = Math.max(minUnits(n, policy), minU || 0);
  let best = null;
  for (const key in bf.states) {
    const S = bf.states[key];
    if (S.U < need || !passes(n, S.U, S.K, S.area, policy)) continue;
    if (!best || S.U + S.K > best.U + best.K
        || (S.U + S.K === best.U + best.K && (S.U > best.U || (S.U === best.U && S.area > best.area)))) best = S;
  }
  if (!best) {
    let small = 0, odd = 0;
    runs.forEach((r) => { r.forEach((a) => { if (a < policy.minUnit - EPS) small++; }); if (r.length % 2) odd++; });
    return { feasible: false, strict, original: n, units: 0, kept: n, lost: 0, area: 0, runs: [],
      reason: strict
        ? "every unit needs " + policy.minUnit + " SF on its own; " + small + " of " + n + " rooms fall short, and merging them cannot leave " + need + " units standing"
          + (odd && small === n ? " (" + odd + " of the " + runs.length + " rows of rooms hold an odd count, and a room with no partner to pair with is stranded)" : "")
        : "even averaging, the rooms merged cannot reach " + policy.minUnit + " SF × " + need + " units without consuming more rooms than the building has" };
  }
  return { feasible: true, strict, original: n, units: best.U, kept: best.K, lost: n - best.U - best.K,
    area: best.area, runs: best.path.map(walkRun), reason: "" };
}

// The result on one floor, repeated on every residential storey: the tests
// are ratios, so a building of identical floors passes exactly when its floor does.
export function repeatFloors(o, res) {
  if (!o) return o;
  const runs = [];
  for (let f = 0; f < res; f++) o.runs.forEach((r) => runs.push(r));
  return { feasible: o.feasible, strict: o.strict, original: o.original * res, units: o.units * res,
           kept: o.kept * res, lost: o.lost * res, area: o.area * res, runs, reason: o.reason };
}
