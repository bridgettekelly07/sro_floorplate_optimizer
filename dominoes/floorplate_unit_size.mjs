// floorplate_unit_size.mjs: runs the floorplate model (frontend/src/lib) across the whole Appendix B
// stock at each setting of the unit_size_sf lever, and writes floorplate_unit_size.json for the page.
// This is a separate model from the claim chains: it counts rooms under the City's thresholds, it
// asserts no claim from a source about consequences. Everything but the unit size stays at the City's
// figure (SOURCE_POLICY) and the tool's own assumptions (SOURCE_ASSUME).
//   node floorplate_unit_size.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { candidatesFor, policyOutcome } from "../frontend/src/lib/district.js";
import { planOf, optimumOf } from "../frontend/src/lib/model.js";
import { SOURCE_POLICY, SOURCE_ASSUME } from "../frontend/src/lib/policy.js";

const dir = "../frontend/public/data/";
const read = (f) => JSON.parse(readFileSync(dir + f, "utf8"));

// same decoding as decodeFootprints in frontend/src/lib/data.js, which cannot be imported outside Vite
function decodeFootprints(d) {
  const o = d.origin, k = d.scale;
  return d.rings.map((e, i2) => {
    const pts = []; let x = e[0], y = e[1];
    pts.push([o[0] + x * k, o[1] + y * k]);
    for (let i = 2; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; pts.push([o[0] + x * k, o[1] + y * k]); }
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    return { p: pts, b: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], h: d.heights ? (d.heights[i2] || 0) : 0 };
  });
}

// same as recordOf in frontend/src/lib/data.js
const recordOf = (records, b) => (b && records[(b.name || "").toUpperCase()]) || null;

const data = { surveyed: read("sro-buildings.json").buildings, foot: decodeFootprints(read("footprints.json")), records: read("sro-records.json").records };
const SETTINGS = [100, 200, 250, 320];
const rows = [];
for (const strict of [false, true]) for (const minUnit of SETTINGS) {
  const policy = { ...SOURCE_POLICY, minUnit };
  const cands = candidatesFor({
    surveyed: data.surveyed, scope: "all",
    recordOf: (b) => recordOf(data.records, b),
    planOf: (i) => planOf(data, i, SOURCE_ASSUME),
    optimumOf: (i) => optimumOf(data, i, SOURCE_ASSUME, strict, policy)
  });
  const o = policyOutcome(cands, data.surveyed, policy);
  rows.push({ unit_size_sf: minUnit, read: strict ? "strict" : "average", buildings: o.of, convert: o.convert, cannot: o.cannot,
    tenants_in_stock: o.tenants, rooms_lost: o.lost, units: o.units, rooms_kept: o.kept, need_council: o.council, no_plan: o.noPlanTenants });
}
writeFileSync("floorplate_unit_size.json", JSON.stringify({
  note: "Separate model from the claim chains. Counts of rooms from the floorplate model in frontend/src/lib under the City's other thresholds (SOURCE_POLICY) and the tool's own assumptions (SOURCE_ASSUME). Every room is read as occupied, so rooms lost = tenants displaced. A count, not a claim from a source.",
  policy: SOURCE_POLICY, assume: SOURCE_ASSUME, rows
}, null, 2));
console.log(rows.map((r) => JSON.stringify(r)).join("\n"));
