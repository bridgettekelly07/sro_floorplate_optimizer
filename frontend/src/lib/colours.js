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
// scen: the scenario by index, or null when the map is coloured by tenure
export function mapColourHex(b, i, scen) {
  if (scen) {
    const s = scen[i];
    if (s && s.state === "infeasible") return hexOf(css("--scen-x"));
    // a building already self-contained, or one the policy leaves alone, displaces nobody: the foot of the scale
    return hexOf(css(classVar(displacedClass(s))));
  }
  return hexOf(css(tenureVar(b)));
}
export function mapColour(b, i, scen) {
  if (scen) return mapColourHex(b, i, scen);
  return "var(" + tenureVar(b) + ")";
}
// the building card's bar: the tenure colour as the lit massing shows it
export function cardColour(b, i, scen) {
  if (scen) return mapColourHex(b, i, scen);
  return "var(" + tenureVar(b) + "-lit)";
}
