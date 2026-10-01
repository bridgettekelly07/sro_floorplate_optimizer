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
export function tenureVar(b) {
  return !b.surveyed ? "--map-unsurveyed" : (b.tenure === "market" ? "--map-market" : "--map-nonmarket");
}
// scen: the scenario by index, or null when the map is coloured by tenure
export function mapColourHex(b, i, scen) {
  if (scen) {
    const s = scen[i];
    if (!s) return hexOf(css("--map-unsurveyed"));
    if (s.state === "infeasible") return hexOf(css("--scen-x"));
    if (s.state === "untouched" || s.state === "self-contained") return hexOf(css("--map-unsurveyed"));
    return mix(css("--scen-0"), css("--scen-1"), Math.min(1, s.n ? (s.lost / s.n) / 0.5 : 0));
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
  return "var(" + (b.surveyed ? tenureVar(b) + "-lit" : tenureVar(b)) + ")";
}
