<script>
  // Section 01: the selected building's record, its typical floor drawn at
  // the scheme that passes the live thresholds while losing the fewest rooms,
  // the sliders, and the tests run on that plan.
  import { tick } from "svelte";
  import { ui, selectBuilding } from "../lib/state.svelte.js";
  import { planOf, optimumOf } from "../lib/model.js";
  import { buildFloors, planFromState } from "../lib/typicalFloor.js";
  import { evaluate } from "../lib/evaluate.js";
  import { planSvg } from "../lib/planSvg.js";
  import { cardColour } from "../lib/colours.js";
  import { pct } from "../lib/format.js";
  import BuildingCard from "./BuildingCard.svelte";
  import ThresholdSliders from "./ThresholdSliders.svelte";
  import BuildingTests from "./BuildingTests.svelte";

  let { data, district } = $props();

  const i = $derived(ui.sel);
  const b = $derived(data && i !== null ? data.surveyed[i] : null);
  const proposed = $derived(ui.planView === "proposed");
  const scen = $derived(ui.mapMode !== "tenure" && district ? district.scen : null);

  // the model of this building under the live thresholds
  const plan = $derived(b ? planOf(data, i, ui.liveAssume) : null);
  const opt = $derived(plan && plan.placed ? optimumOf(data, i, ui.liveAssume, ui.strict, ui.live) : null);
  const floors = $derived(plan && plan.placed ? buildFloors(plan, opt, ui.tenancy[i]) : []);
  const ev = $derived(floors.length ? evaluate(floors, ui.live) : null);
  const drawn = $derived(floors.length ? planSvg(planFromState(plan, floors, !proposed), { minUnit: ui.live.minUnit, proposed }) : null);
  const meanSf = $derived(floors.length ? floors[0].rooms.reduce((t, r) => t + r.area, 0) / floors[0].rooms.length : 0);
  const f0 = $derived(floors.length ? evaluate([floors[0]], ui.live) : null);   // the floor that is drawn, on its own
  const topShort = $derived(floors.length > 1 && floors[floors.length - 1].rooms.length < floors[0].rooms.length ? floors[floors.length - 1].rooms.length : 0);
  // the lesson in one short sentence: why this many people leave at this minimum
  const whyLine = $derived.by(() => {
    if (!ev) return "";
    const sf = Math.round(meanSf), min = ui.live.minUnit, pol = ui.live;
    if (!(opt && opt.feasible)) return `No way to merge ${sf} SF rooms into ${min} SF units passes all three tests. The building cannot convert, and nobody is displaced.`;
    const sizes = ev.units.map((u) => u.idx.length), pairs = sizes.filter((n) => n === 2).length, triples = sizes.filter((n) => n >= 3).length;
    if (!ev.units.length) return pol.maxMerge < 2 && sf < min - 1e-9 ? `Rooms of ${sf} SF fall short of ${min} SF and may not merge, so no unit is made. Nobody leaves.` : `Keeping every room already passes. Nobody leaves.`;
    if (sf >= min - 1e-9) return `Rooms of ${sf} SF already reach ${min} SF, so they convert in place${ev.lost ? ` and ${ev.lost} ${ev.lost === 1 ? "tenant leaves" : "tenants leave"} to balance the tests` : " and nobody leaves"}.`;
    if (!ev.lost) return `Rooms of ${sf} SF fall short of ${min} SF, but the average across converted rooms passes, so nobody leaves.`;
    const merges = triples > pairs ? "three rooms become one unit, and two tenants leave each time" : "two rooms become one unit, and one tenant leaves each time";
    return `Rooms of ${sf} SF fall short of ${min} SF, so ${merges}. That is the ${ev.displaced} displaced.`;
  });

  // selecting a building brings its plan into view
  $effect(() => {
    if (ui.sel === null) return;
    tick().then(() => { const el = document.getElementById("bp-plan"); if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  });

</script>

{#if b}
  <BuildingCard {b} {i} {data} colour={cardColour(b, i, scen)} onclose={() => selectBuilding(i)} />
{/if}

<div class="stage-bar">
  <span class="label">{b ? b.name + " · " + b.addr : "No building selected"}</span>
</div>
{#if ev}
  <div class="facts">
    <span><b>{ev.original}</b><em>rooms</em></span>
    <span><b>{floors[0].rooms.length}</b><em>per floor{topShort ? ", " + topShort + " on the top" : ""}</em></span>
    <span><b>{floors.length}</b><em>{floors.length === 1 ? "floor" : "floors"} of rooms</em></span>
    <span><b>{Math.round(meanSf)} SF</b><em>each</em></span>
  </div>
{/if}

<div id="bp-plan" class="plan-stage">
  {#if !b}
    <div class="empty">Click a building on the map</div>
  {:else if !drawn}
    <div class="empty">{b.name} has no footprint or parcel outline in the City data, so no typical floor can be drawn.</div>
  {:else}
    {@html drawn.svg}
  {/if}
</div>
{#if drawn && proposed}
  <div class="legend plan-legend">
    <span><i class="swatch unit"></i>Converted: a self-contained unit of {ui.live.minUnit} SF or more</span>
    <span><i class="swatch short"></i>Converted, but under {ui.live.minUnit} SF</span>
    <span><i class="swatch keep"></i>Kept as an SRO room</span>
    <span><i class="swatch pod"></i>Bathroom and kitchen, Guidelines p.5–6</span>
    <span><i class="swatch circ"></i>Corridor and stair</span>
    {#if plan.roomsEnd < plan.L - 0.3}<span><i class="swatch hatch"></i>Floor Appendix B does not count as rooms</span>{/if}
  </div>
{/if}

{#if ev && f0}
  <div class="label out-head">The whole building, under the thresholds below</div>
  <div class="outcome">
    <div class="o unit"><i></i><b>{ev.units.length}</b><span class="label">Units</span><small>{f0.units.length} on the floor drawn</small></div>
    <div class="o keep"><i></i><b>{ev.untouched.length}</b><span class="label">Kept as SRO</span><small>{f0.untouched.length} on the floor drawn</small></div>
    <div class="o lost"><i></i><b>{ev.displaced}</b><span class="label">Tenants displaced</span></div>
    <div class="o share"><i></i><b>{pct(ev.original ? ev.lost / ev.original : 0)}</b><span class="label">Of the building</span></div>
  </div>
{/if}

<ThresholdSliders />

{#if ev}
  <p class="why">{whyLine}</p>
  <BuildingTests {ev} policy={ui.live} />
{/if}

<style>
  .stage-bar { display: flex; justify-content: space-between; gap: 10px; padding: 0 0 10px; }
  .plan-stage { background: var(--sunk); border: 1px solid var(--rule); min-height: 200px;
    display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .plan-stage :global(svg) { display: block; width: 100%; height: auto; max-height: 460px; }
  .plan-stage .empty { color: var(--ink-3); font-size: 13px; padding: 40px 20px; text-align: center; }
  .plan-legend { margin: 8px 0 2px; }
  .plan-legend .swatch.unit { background: var(--plan-unit); border: 2px solid var(--plan-unit-line); }
  .plan-legend .swatch.short { background: var(--plan-short); border: 2px solid var(--plan-short-line); }
  .plan-legend .swatch.keep { background: var(--plan-keep); border: 1px solid var(--ink-2); }
  .plan-legend .swatch.pod { border: 1px dashed var(--ink-3); }
  .plan-legend .swatch.circ { background: var(--plan-circ); border: 1px solid var(--rule); }
  .plan-legend .swatch.hatch { background: repeating-linear-gradient(45deg, var(--rule) 0 1px, transparent 1px 3px); }
  .why { font-size: 13.5px; line-height: 1.5; color: var(--ink); margin: 12px 0 6px; padding-left: 10px; border-left: 2px solid var(--accent); }
  /* the building's facts, in the card's own stats style, over the plan they describe */
  .facts { display: flex; flex-wrap: wrap; gap: 4px 18px; font-variant-numeric: tabular-nums; font-size: 12px;
    border: 1px solid var(--rule); border-bottom: none; padding: 7px 10px; background: var(--surface); }
  .facts span { display: flex; gap: 6px; align-items: baseline; }
  .facts b { font-family: "IBM Plex Sans Condensed", sans-serif; font-weight: 600; font-size: 15px; }
  .facts em { font-style: normal; color: var(--ink-3); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; }
  /* what the plan adds up to: one cell per figure, each carrying the plan colour it refers to */
  .out-head { margin-top: 12px; }
  .outcome { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 6px; }
  .o { position: relative; border: 1px solid var(--rule); border-top: 3px solid var(--ink-3); background: var(--surface); padding: 8px 10px 8px; }
  .o b { display: block; font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .o .label { display: block; margin-top: 3px; font-size: 9.5px; }
  .o small { display: block; margin-top: 5px; font-size: 11px; line-height: 1.3; color: var(--ink-3); }
  .o i { position: absolute; top: 8px; right: 8px; width: 11px; height: 11px; border: 1.5px solid transparent; }
  .o.unit { border-top-color: var(--plan-unit-line); } .o.unit i { background: var(--plan-unit); border-color: var(--plan-unit-line); }
  .o.keep { border-top-color: var(--plan-keep-line); } .o.keep i { background: var(--plan-keep); border-color: var(--plan-keep-line); }
  .o.lost { border-top-color: var(--accent); } .o.lost i { display: none; }
  .o.share { border-top-color: var(--ink-3); } .o.share i { display: none; }
  @media (max-width: 520px) { .outcome { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
