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
    { title: "The City’s rules", lead: "What a conversion must satisfy. Move one to ask what a different rule would cost.", tick: "City", rows: [
      { store: "live", key: "minUnit", label: "Minimum unit size", min: 60, max: 400, step: 5, scale: 1, fmt: "sf",
        plain: "How big a converted unit must be. Bigger units swallow more rooms, so more tenants leave.",
        cite: "SRA Guidelines p.4; DTES Plan 9.2.11" },
      { store: "live", key: "maxReduction", label: "Largest cut in rooms", min: 0, max: 100, step: 5, scale: 100, fmt: "pct",
        plain: "The most rooms a building may lose. The ceiling on displacement.",
        cite: "SRA Guidelines p.4" },
      { store: "live", key: "minReplace", label: "Least replaced as units", min: 0, max: 100, step: 5, scale: 100, fmt: "pct",
        plain: "How many of the old rooms must come back as self-contained homes.",
        cite: "DTES Plan 9.2.7" },
      { store: "live", key: "maxMerge", label: "Rooms one unit may take", min: 1, max: 4, step: 1, scale: 1, fmt: "rooms",
        plain: "How many rooms may be knocked together into one unit.",
        cite: "No source sets a ceiling; the tool assumes 3" }
    ] },
    { title: "The tool’s guesses about the building", lead: "Not rules. The footprint gives the outline; these fix how the rooms are read from it.", tick: "Assumed", rows: [
      { store: "liveAssume", key: "cap", label: "Largest existing room", min: 100, max: 420, step: 5, scale: 1, fmt: "sf",
        plain: "No room is read as bigger than this, however large the floor.",
        cite: "Not in any source" },
      { store: "liveAssume", key: "circ", label: "Circulation share of the floor", min: 0, max: 60, step: 1, scale: 1, fmt: "pct",
        plain: "The share of each floor given to corridor, stair and services, so not to rooms.",
        cite: "Not in any source" }
    ] }
  ];
  const DEFAULTS = { live: SOURCE_POLICY, liveAssume: SOURCE_ASSUME };

  function shown(r) { return Math.round(ui[r.store][r.key] * r.scale); }
  function fmt(r, v) { return r.fmt === "pct" ? v + "%" : r.fmt === "rooms" ? v + (v === 1 ? " room" : " rooms") : v + " SF"; }
  function fmtVal(r) { return fmt(r, shown(r)); }
  function def(r) { return Math.round(DEFAULTS[r.store][r.key] * r.scale); }
  function mine(r) { return Math.abs(ui[r.store][r.key] - DEFAULTS[r.store][r.key]) > 1e-9; }
  // where the default sits along the rail, allowing for the thumb's width at either end
  function tickLeft(r) { const p = (def(r) - r.min) / (r.max - r.min); return `calc(${(p * 100).toFixed(2)}% + ${((0.5 - p) * 14).toFixed(1)}px)`; }
  function input(r, e) {
    ui[r.store][r.key] = parseFloat(e.currentTarget.value) / r.scale;
    ui.planView = "proposed";
  }
  function reset(r) { ui[r.store][r.key] = DEFAULTS[r.store][r.key]; ui.planView = "proposed"; commitPolicy(); }
</script>

<div class="thr-block">
  <div class="thr-title">Three scenarios</div>
  <p class="thr-lead">Each sets every slider below at once. The map, the plan and the tally follow.</p>
  <div class="scen">
    {#each SCENARIOS as s (s.key)}
      <button type="button" class="scen-btn" class:on={active === s} onclick={() => pick(s)}>
        <b>{s.name}</b><span>{s.note}</span>
      </button>
    {/each}
  </div>
  {#each GROUPS as g (g.title)}
    <div class="thr-group" class:first={g === GROUPS[0]}>
      <div class="thr-title">{g.title}</div>
      <p class="thr-lead">{g.lead}</p>
      {#each g.rows as r (r.key)}
        <div class="thr">
          <div class="thr-head">
            <label for={"t-" + r.key}>{r.label}</label>
            <span class="thr-val" class:mine={mine(r)}>{fmtVal(r)}
              {#if mine(r)}<button type="button" class="back" onclick={() => reset(r)} title={"Back to the " + (g.tick === "City" ? "City’s" : "assumed") + " figure"}>{g.tick} {fmt(r, def(r))} ↺</button>{/if}
            </span>
          </div>
          <div class="rail">
            <span class="tick" style:left={tickLeft(r)} title={g.tick + ": " + fmt(r, def(r))}></span>
            <input type="range" id={"t-" + r.key} min={r.min} max={r.max} step={r.step} value={shown(r)}
              oninput={(e) => input(r, e)} onchange={commitPolicy}>
          </div>
          <span class="plain">{r.plain}</span>
          <span class="cite">{r.cite} · {g.tick === "City" ? "the City’s figure" : "assumed"} {fmt(r, def(r))}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .thr-block { margin: 14px 0; padding-bottom: 12px; border-bottom: 1px solid var(--rule-soft); }
  .scen { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0 0 16px; }
  .scen-btn { font: inherit; text-align: left; display: grid; gap: 4px; padding: 8px 10px; background: var(--surface); color: var(--ink);
    border: 1px solid var(--rule); border-radius: 4px; cursor: pointer; line-height: 1.35; }
  .scen-btn b { font-weight: 500; font-size: 12.5px; }
  .scen-btn span { font-size: 11px; color: var(--ink-3); }
  .scen-btn:hover { border-color: var(--ink-3); }
  .scen-btn.on { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
  .scen-btn.on b { color: var(--accent); }
  @media (max-width: 1100px) { .scen { grid-template-columns: 1fr; } }
  .thr-group { margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--rule-soft); }
  .thr-title { font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink); }
  .thr-lead { font-size: 12px; color: var(--ink-3); margin: 2px 0 10px; line-height: 1.4; }
  .thr { display: grid; gap: 2px; margin-bottom: 12px; }
  .thr-head { display: flex; justify-content: space-between; align-items: baseline; }
  .thr-head label { font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); }
  .thr-val { font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; display: flex; gap: 8px; align-items: baseline; }
  .thr-val.mine { color: var(--accent); }
  .back { font: inherit; font-size: 10.5px; font-weight: 400; color: var(--ink-3); background: none; border: 1px solid var(--rule-soft); border-radius: 3px; padding: 0 5px; cursor: pointer; }
  .back:hover { color: var(--ink); border-color: var(--ink-3); }
  .rail { position: relative; }
  .rail input[type=range] { width: 100%; margin: 4px 0 2px; accent-color: var(--accent); cursor: pointer; position: relative; z-index: 1; }
  .tick { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--ink-2); opacity: 0.55; pointer-events: none; }
  .plain { font-size: 12px; color: var(--ink-2); line-height: 1.4; }
  .cite { font-size: 10.5px; color: var(--ink-3); }
</style>
