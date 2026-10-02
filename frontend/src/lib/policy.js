// Thresholds and citations from the source documents.
// Every number here traces to a passage in documentation/source_extract.md.

export const EPS = 1e-9;   // all thresholds are read inclusively

export const SOURCE_POLICY = Object.freeze({
  minUnit: 200,        // SF net per converted unit: SRO Guidelines p.4; DTES Plan 9.2.11
  maxReduction: 0.50,  // largest cut in rooms: SRO Guidelines p.4
  minReplace: 0.50,    // least share replaced as units: DTES Plan 9.2.7
  smallLoss: 3,        // small-loss route, rooms: SRO By-law s.4.3A
  residentDays: 30,    // permanent resident: SRO By-law s.1.2
  maxMerge: 3          // rooms one unit may take: no source sets a ceiling; the tool's assumption
});

// The tool's own assumptions about the floor, not in any source.
export const SOURCE_ASSUME = Object.freeze({
  cap: 180,   // largest existing room read from a footprint, SF
  circ: 25    // circulation share of a floorplate, %
});

// Bounds for each threshold, so a typed or dragged value stays sensible.
export const POLICY_FIELDS = [
  { key: "minUnit", min: 60, max: 600 },
  { key: "maxReduction", min: 0, max: 1 },
  { key: "minReplace", min: 0, max: 1 },
  { key: "smallLoss", min: 0, max: 50 },
  { key: "residentDays", min: 0, max: 365 },
  { key: "maxMerge", min: 1, max: 4 }
];

export function clampPolicy(pol) {
  const out = {};
  for (const f of POLICY_FIELDS) {
    let v = pol[f.key];
    if (v == null || !Number.isFinite(v)) v = SOURCE_POLICY[f.key];
    out[f.key] = Math.max(f.min, Math.min(f.max, v));
  }
  return out;
}

export function isSourcePolicy(pol) {
  return POLICY_FIELDS.every((f) => Math.abs(pol[f.key] - SOURCE_POLICY[f.key]) < EPS);
}

export function policyKey(pol, strict) {
  return (strict ? "s" : "a") + POLICY_FIELDS.map((f) => pol[f.key]).join(",");
}

// Compensation by length of tenancy, SRO By-law s.4.8(i): months of rent.
export const SCHEDULE = [[5, 4], [10, 5], [20, 6], [30, 12], [40, 18], [Infinity, 24]];
export function compensationMonths(years) {
  for (const [upTo, months] of SCHEDULE) if (years <= upTo) return months;
  return 24;
}

export const CITE = {
  size: ["SRO Guidelines, p.4",
    "Converted SRO rooms that are at least 200 SF will be removed from the SRO By-law… If a minimum of 200 SF for a converted room cannot be achieved, an average of 200 SF across all converted rooms will be considered."],
  count: ["SRO Guidelines, p.4",
    "To enable the conversion of rooms to self-contained units, a reduction to the total number of rooms, up to a maximum of 50%, will be considered."],
  replace: ["DTES Plan, Policy 9.2.7",
    "For conversion of SRO rooms to self-contained units, ensure a minimum of 50% of rooms are replaced."],
  small: ["SRO By-law No. 8733, s.4.3A",
    "…the loss of no more than 3 designated rooms in the building and the work will, in the opinion of the General Manager, result in improved livability or operations…"],
  refusal: ["SRO By-law No. 8733, s.4.8(f)–(g)",
    "…gives the permanent resident re-located… the first right of refusal to rent the replacement rooms."],
  comp: ["SRO By-law No. 8733, s.4.8(i)",
    "4 months’ rent for tenancies up to 5 years, 5 months’ over 5 and up to 10, 6 months’ over 10 and up to 20, 12 months’ over 20 and up to 30, 18 months’ over 30 and up to 40, and 24 months’ over 40."]
};
