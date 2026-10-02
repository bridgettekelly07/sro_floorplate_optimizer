<script>
  // The thresholds as sliders. While a thumb moves only the building is
  // redrawn, which is quick; the district follows when it is let go.
  // Each slider says in plain words what its number does to people, with
  // the source beneath, and a tick on the rail marks the City's figure so
  // a moved thumb always shows how far it has gone from the policy.
  import { ui, commitPolicy } from "../lib/state.svelte.js";
  import { SOURCE_POLICY, SOURCE_ASSUME } from "../lib/policy.js";
  import { SCENARIOS, scenarioPolicy, activeScenario } from "../lib/scenarios.js";

  const active = $derived(activeScenario(ui.live));
  function pick(s) { ui.live = scenarioPolicy(s); ui.planView = "proposed"; commitPolicy(); }

  const GROUPS = [
    { title: "", tick: "City", rows: [
      { store: "live", key: "minUnit", label: "Minimum unit size", min: 60, max: 400, step: 5, scale: 1, fmt: "sf",
        plain: "How big a converted unit must be.",
        cite: "SRA Guidelines p.4; DTES Plan 9.2.11" },
      { store: "live", key: "maxReduction", label: "Largest cut in rooms", min: 0, max: 100, step: 5, scale: 100, fmt: "pct",
        plain: "The most rooms a building may lose.",
        cite: "SRA Guidelines p.4" },
      { store: "live", key: "minReplace", label: "Least replaced as units", min: 0, max: 100, step: 5, scale: 100, fmt: "pct",
        plain: "How many of the old rooms must come back as homes.",
        cite: "DTES Plan 9.2.7" },
      { store: "live", key: "maxMerge", label: "Rooms one unit may take", min: 1, max: 4, step: 1, scale: 1, fmt: "rooms",
        plain: "How many rooms may be knocked together into one unit.",
        cite: "No source sets a ceiling; the tool assumes 3" }
    ] },
    { title: "The tool’s assumptions", tick: "Assumed", rows: [
      { store: "liveAssume", key: "cap", label: "Largest existing room", min: 100, max: 420, step: 5, scale: 1, fmt: "sf",
        plain: "No room is read as bigger than this.",
        cite: "Not in any source" },
      { store: "liveAssume", key: "circ", label: "Circulation share of the floor", min: 0, max: 60, step: 1, scale: 1, fmt: "pct",
        plain: "The share of each floor that is corridor, stair and services.",
        cite: "Not in any source" }
    ] }
  ];
  const DEFAULTS = { live: SOURCE_POLICY, liveAssume: SOURCE_ASSUME };

  function shown(r) { return Math.round(ui[r.store][r.key] * r.scale); }
  function fmt(r, v) { return r.fmt === "pct" ? v + "%" : r.fmt === "rooms" ? v + (v === 1 ? " room" : " rooms") : v + " SF"; }
  function fmtVal(r) { return fmt(r, shown(r)); }
  function def(r) { return Math.round(DEFAULTS[r.store][r.key] * r.scale); }
  function mine(r) { return Math.abs(ui[r.store][r.key] - DEFAULTS[r.store][r.key]) > 1e-9; }
  // where the City's figure sits along the thumb's travel, allowing for the thumb's width at either end
  function defLeft(r) { const p = (def(r) - r.min) / (r.max - r.min); return `calc(${(p * 100).toFixed(2)}% + ${((0.5 - p) * 16).toFixed(1)}px)`; }
  // how far along the track the thumb sits, for the filled part of the track
  function fill(r) { return ((shown(r) - r.min) / (r.max - r.min) * 100).toFixed(2) + "%"; }
  // one faint tick inside the track per value the slider can snap to
  function tickCount(r) { return Math.round((r.max - r.min) / r.step); }
  function input(r, e) {
    ui[r.store][r.key] = parseFloat(e.currentTarget.value) / r.scale;
    ui.planView = "proposed";
  }
  function reset(r) { ui[r.store][r.key] = DEFAULTS[r.store][r.key]; ui.planView = "proposed"; commitPolicy(); }
</script>

<div class="thr-block">
  <div class="thr-title">Three scenarios</div>
  <div class="scen">
    {#each SCENARIOS as s (s.key)}
      <button type="button" class="scen-btn" class:on={active === s} onclick={() => pick(s)} title={s.note}>
        <b>{s.name}</b>
      </button>
    {/each}
  </div>
  {#each GROUPS as g (g.title)}
    <div class="thr-group" class:first={g === GROUPS[0]}>
      {#if g.title}<div class="thr-title">{g.title}</div>{/if}
      {#each g.rows as r (r.key)}
        <div class="thr">
          <div class="thr-head">
            <label for={"t-" + r.key}>{r.label}</label>
            <span class="thr-val" class:mine={mine(r)}>{fmtVal(r)}
              {#if mine(r)}<button type="button" class="back" onclick={() => reset(r)} title={"Back to the " + (g.tick === "City" ? "City’s" : "assumed") + " figure"}>{g.tick} {fmt(r, def(r))} ↺</button>{/if}
            </span>
          </div>
          <div class="rail">
            <span class="track" style:--p={fill(r)} style:--n={tickCount(r)}></span>
            <span class="tick" style:left={defLeft(r)} title={g.tick + "’s figure: " + fmt(r, def(r))}></span>
            <input type="range" id={"t-" + r.key} min={r.min} max={r.max} step={r.step} value={shown(r)}
              oninput={(e) => input(r, e)} onchange={commitPolicy}>
          </div>
          <span class="plain">{r.plain}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .thr-block { margin: 14px 0; padding-bottom: 12px; border-bottom: 1px solid var(--rule-soft); }
  .scen { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0 16px; }
  .scen-btn { font: inherit; text-align: center; display: grid; place-items: center; min-height: 40px; padding: 6px 8px; background: var(--surface); color: var(--ink);
    border: 1px solid var(--rule); border-radius: 4px; cursor: pointer; line-height: 1.25; }
  .scen-btn b { font-weight: 500; font-size: 12px; }
  .scen-btn:hover { border-color: var(--ink-3); }
  .scen-btn.on { background: var(--accent); border-color: var(--accent); color: #fff; }
  .scen-btn.on b { color: #fff; }
  .thr-group { margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--rule-soft); }
  .thr-title { font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink); margin-bottom: 8px; }
  .thr { display: grid; gap: 2px; margin-bottom: 12px; }
  .thr-head { display: flex; justify-content: space-between; align-items: baseline; }
  .thr-head label { font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); }
  .thr-val { font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; display: flex; gap: 8px; align-items: baseline; }
  .thr-val.mine { color: var(--accent); }
  .back { font: inherit; font-size: 10.5px; font-weight: 400; color: var(--ink-3); background: none; border: 1px solid var(--rule-soft); border-radius: 3px; padding: 0 5px; cursor: pointer; }
  .back:hover { color: var(--ink); border-color: var(--ink-3); }
  /* the track is drawn as a strip under a transparent slider, so the City's mark can stand taller than the
     track and still slip behind the thumb: strip, then mark, then the slider with only its thumb visible */
  .rail { position: relative; height: 22px; margin: 2px 0; }
  .track { position: absolute; left: 0; right: 0; top: 6px; height: 10px; border-radius: 3px; border: 1px solid var(--rule); box-sizing: border-box;
    background-image: linear-gradient(to right, rgba(0, 0, 0, 0.12) 1px, transparent 1px), linear-gradient(to right, var(--accent) 0 var(--p), #fff var(--p) 100%);
    background-size: calc((100% - 16px) / var(--n)) 100%, 100% 100%; background-position: 8px 0, 0 0; background-repeat: repeat-x, no-repeat; }
  .tick { position: absolute; top: 2px; height: 18px; width: 2px; margin-left: -1px; background: var(--ink-2); opacity: 0.7; pointer-events: none; z-index: 1; }
  .rail input[type=range] { -webkit-appearance: none; appearance: none; position: absolute; left: 0; right: 0; top: 0; width: 100%; height: 22px; margin: 0; background: transparent; cursor: pointer; z-index: 2; }
  .rail input[type=range]::-webkit-slider-runnable-track { height: 22px; background: transparent; border: none; }
  .rail input[type=range]::-moz-range-track { height: 22px; background: transparent; border: none; }
  .rail input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; margin-top: 3px; border-radius: 50%; background: var(--accent); border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--rule); }
  .rail input[type=range]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--accent); border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--rule); }
  .plain { font-size: 12px; color: var(--ink-2); line-height: 1.4; }
</style>
