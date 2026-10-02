// Colours read from the stylesheet's tokens, so light and dark mode both work.
export function css(name) {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
export function hexOf(v) { return /^#[0-9a-f]{6}$/i.test(v || "") ? v : "#888888"; }
export function mix(a, b, t) {
  a = hexOf(a); b = hexOf(b);
  let out = "#";
  for (let k = 0; k < 3; k++) {
    const x = parseInt(a.substr(1 + k * 2, 2), 16), y = parseInt(b.substr(1 + k * 2, 2), 16);
    out += ("0" + Math.round(x + (y - x) * t).toString(16)).slice(-2);
  }
  return out;
}
// Tenure follows ownership, as it does throughout the surveyed stock: a
// privately owned building is private, anything owned by government, a
// non-profit or a society is public. A building the survey could not enter
// is sorted the same way rather than left grey.
export function isPrivate(b) {
  return b.surveyed ? b.tenure === "market" : b.ownerType === "Private";
}
export function tenureVar(b) {
  return isPrivate(b) ? "--map-market" : "--map-nonmarket";
}
// The policy colour runs on people, not shares, in four classes of tenants
// displaced by the conversion, so a 12-room house and a 90-room hotel at the
// same share no longer match, and a colour means the same thing whatever
// thresholds are set. CLASSES holds the lower bound of each class.
export const CLASSES = [
  { from: 0, label: "Nobody displaced" },
  { from: 1, label: "1 to 10 tenants" },
  { from: 11, label: "11 to 25 tenants" },
  { from: 26, label: "26 or more" },
];
export function displacedClass(s) {
  const lost = s && s.state === "converted" ? s.lost : 0;
  let k = 0;
  CLASSES.forEach((c, i) => { if (lost >= c.from) k = i; });
  return k;
}
export function classVar(k) { return "--scen-c" + k; }

// Where every tenant the policy reaches goes, and the colour each fate takes on the map and in the readout.
export const WHO = [
  { key: "lost", label: "Displaced: their room is lost", v: "--who-lost" },
  { key: "units", label: "Re-housed in a new unit", v: "--who-unit" },
  { key: "kept", label: "Stay in a room kept as SRO", v: "--who-keep" },
  { key: "stuck", label: "Building cannot convert, left as it is", v: "--who-stuck" },
  { key: "none", label: "No footprint to draw", v: "--map-unsurveyed" }
];
// The "people" map: a building's massing split into bands by the share of its rooms that meet
// each fate, bottom up: the rooms kept, the rooms re-housed as units, and on top the rooms lost.
// A building that cannot convert is slate through its height; one the policy does not reach is grey.
export function bandsOf(s) {
  if (s && s.state === "infeasible") return [{ share: 1, hex: hexOf(css("--who-stuck")) }];
  if (!s || s.state !== "converted" || !s.n) return [{ share: 1, hex: hexOf(css("--map-unsurveyed")) }];
  const out = [];
  if (s.kept) out.push({ share: s.kept / s.n, hex: hexOf(css("--who-keep")) });
  if (s.units) out.push({ share: s.units / s.n, hex: hexOf(css("--who-unit")) });
  if (s.lost) out.push({ share: s.lost / s.n, hex: hexOf(css("--who-lost")) });
  return out;
}
// scen: the scenario by index, or null when the map is coloured by tenure; mode: "policy" or "people"
export function mapColourHex(b, i, scen, mode = "policy") {
  if (scen) {
    const s = scen[i];
    if (s && s.state === "infeasible") return hexOf(css("--scen-x"));
    // a building already self-contained, or one the policy leaves alone, displaces nobody: the foot of the scale
    return hexOf(css(classVar(displacedClass(s))));
  }
  return hexOf(css(tenureVar(b)));
}
export function mapColour(b, i, scen, mode) {
  if (scen) return mapColourHex(b, i, scen, mode);
  return "var(" + tenureVar(b) + ")";
}
// the building card's bar: the tenure colour as the lit massing shows it
export function cardColour(b, i, scen) {
  if (scen) return mapColourHex(b, i, scen);
  return "var(" + tenureVar(b) + "-lit)";
}
