// The one store of what the user has set. Thresholds come in two copies:
// `live` follows the sliders as they move and drives the building panel,
// which is quick to redraw; `policy` is set when a slider is let go and
// drives the district and the map. The same for the two assumptions.
import { SOURCE_POLICY, SOURCE_ASSUME } from "./policy.js";

export const ui = $state({
  live: { ...SOURCE_POLICY },
  policy: { ...SOURCE_POLICY },
  liveAssume: { ...SOURCE_ASSUME },
  assume: { ...SOURCE_ASSUME },
  strict: false,          // the size test read strictly, every unit on its own
  scope: "all",           // the policy reaches every SRO in Appendix B
  sel: null,              // the selected building, by Appendix B index
  planView: "existing",   // the rooms as they stand, until a threshold moves
  scenColour: true,       // the map coloured by the policy rather than by tenure
  mode3d: false,
  plan3d: false,          // the 3D view looked at straight down
  tenancy: {},            // years typed for every room, by building index
  theme: (typeof document !== "undefined" && document.documentElement.dataset.theme) || "dark"
});

// light or dark, remembered in this browser; the 3D district recolours itself from the tokens
export function setTheme(theme) {
  ui.theme = theme;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch { /* private window */ }
}

export function selectBuilding(i) {
  ui.sel = ui.sel === i ? null : i;
  ui.planView = "existing";
}
export function commitPolicy() {
  ui.policy = { ...ui.live };
  ui.assume = { ...ui.liveAssume };
}
