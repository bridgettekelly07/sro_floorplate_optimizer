<script>
  // The thresholds as sliders. While a thumb moves only the building is
  // redrawn, which is quick; the district follows when it is let go.
  import { ui, commitPolicy } from "../lib/state.svelte.js";
  import { SOURCE_POLICY, SOURCE_ASSUME } from "../lib/policy.js";

  const ROWS = [
    { store: "live", key: "minUnit", label: "Minimum unit size", min: 60, max: 400, step: 5, scale: 1, fmt: "sf",
      hint: "SRA Guidelines p.4; DTES Plan 9.2.11 · source 200 SF" },
    { store: "live", key: "maxReduction", label: "Largest cut in rooms", min: 0, max: 100, step: 5, scale: 100, fmt: "pct",
      hint: "SRA Guidelines p.4 · source 50%" },
    { store: "live", key: "minReplace", label: "Least replaced as units", min: 0, max: 100, step: 5, scale: 100, fmt: "pct",
      hint: "DTES Plan 9.2.7 · source 50%" },
    { store: "live", key: "maxMerge", label: "Rooms one unit may take", min: 1, max: 4, step: 1, scale: 1, fmt: "rooms",
      hint: "No source sets a ceiling; the tool assumes 3" },
    { store: "liveAssume", key: "cap", label: "Largest existing room", min: 100, max: 420, step: 5, scale: 1, fmt: "sf",
      hint: "The tool’s cap on a room read from the footprint; not in any source" },
    { store: "liveAssume", key: "circ", label: "Circulation share of the floor", min: 0, max: 60, step: 1, scale: 1, fmt: "pct",
      hint: "Corridor, stair and services; the tool assumes 25%" }
  ];
  const DEFAULTS = { live: SOURCE_POLICY, liveAssume: SOURCE_ASSUME };

  function shown(r) { return Math.round(ui[r.store][r.key] * r.scale); }
  function fmtVal(r) {
    const v = shown(r);
    return r.fmt === "pct" ? v + "%" : r.fmt === "rooms" ? v + (v === 1 ? " room" : " rooms") : v + " SF";
  }
  function mine(r) { return Math.abs(ui[r.store][r.key] - DEFAULTS[r.store][r.key]) > 1e-9; }
  function input(r, e) {
    ui[r.store][r.key] = parseFloat(e.currentTarget.value) / r.scale;
    ui.planView = "proposed";
  }
</script>

<div class="thr-block">
  {#each ROWS as r (r.key)}
    <div class="thr">
      <div class="thr-head">
        <label for={"t-" + r.key}>{r.label}</label>
        <span class="thr-val" class:mine={mine(r)}>{fmtVal(r)}</span>
      </div>
      <input type="range" id={"t-" + r.key} min={r.min} max={r.max} step={r.step} value={shown(r)}
        oninput={(e) => input(r, e)} onchange={commitPolicy}>
      <span class="hint-s">{r.hint}</span>
    </div>
  {/each}
</div>

<style>
  .thr-block { margin: 14px 0; padding-bottom: 12px; border-bottom: 1px solid var(--rule-soft); }
  .thr { display: grid; gap: 2px; margin-bottom: 10px; }
  .thr-head { display: flex; justify-content: space-between; align-items: baseline; }
  .thr-head label { font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); }
  .thr-val { font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; }
  .thr-val.mine { color: var(--accent); }
  .thr input[type=range] { width: 100%; margin: 4px 0 2px; accent-color: var(--accent); cursor: pointer; }
  .hint-s { font-size: 11px; color: var(--ink-3); }
</style>
