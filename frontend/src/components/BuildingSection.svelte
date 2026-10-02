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
  import { pct, num } from "../lib/format.js";
  import { SURVEY } from "../lib/survey.js";
  import BuildingCard from "./BuildingCard.svelte";
  import ThresholdSliders from "./ThresholdSliders.svelte";
  import BuildingTests from "./BuildingTests.svelte";
  import Tile from "./Tile.svelte";

  let { data, district } = $props();

  const i = $derived(ui.sel);
  const b = $derived(data && i !== null ? data.surveyed[i] : null);
  const proposed = $derived(ui.planView === "proposed");
  const scen = $derived(ui.scenColour && district ? district.scen : null);

  // the model of this building under the live thresholds
  const plan = $derived(b ? planOf(data, i, ui.liveAssume) : null);
  const opt = $derived(plan && plan.placed ? optimumOf(data, i, ui.liveAssume, ui.strict, ui.live) : null);
  const floors = $derived(plan && plan.placed ? buildFloors(plan, opt, ui.tenancy[i]) : []);
  const ev = $derived(floors.length ? evaluate(floors, ui.live) : null);
  const drawn = $derived(floors.length ? planSvg(planFromState(plan, floors, !proposed), { minUnit: ui.live.minUnit, proposed }) : null);
  const sc = $derived(district && district.scen[i]);
  const meanSf = $derived(floors.length ? floors[0].rooms.reduce((t, r) => t + r.area, 0) / floors[0].rooms.length : 0);
  // the lesson in one plain sentence: why this many people leave at this minimum
  const whyLine = $derived.by(() => {
    if (!ev) return "";
    const sf = Math.round(meanSf), min = ui.live.minUnit, pol = ui.live;
    const at = `At about ${sf} SF a room`;
    if (!(opt && opt.feasible)) {
      if (sf * 2 < min - 1e-9) return `${at} is too small for two of them to reach ${min} SF, so every unit would need three rooms, and three-room units cannot leave enough rooms standing to pass the other tests. Under these thresholds this building cannot convert; only a smaller minimum changes that.`;
      return `${at} cannot be merged into units that reach ${min} SF without losing more rooms than the ${Math.round(pol.maxReduction * 100)}% cut allows, or returning fewer than the ${Math.round(pol.minReplace * 100)}% the plan requires. Under these thresholds this building cannot convert.`;
    }
    const sizes = ev.units.map((u) => u.idx.length), pairs = sizes.filter((n) => n === 2).length, triples = sizes.filter((n) => n >= 3).length, singles = sizes.filter((n) => n === 1).length;
    if (!ev.units.length) {
      if (pol.maxMerge < 2 && sf < min - 1e-9) return `${at} does not reach ${min} SF, and a unit may take only one room, so no unit can be made. Every room is kept and nobody leaves.`;
      return `Nothing has to convert under these thresholds: keeping every room already passes, so every room is kept and nobody leaves.`;
    }
    if (sf >= min - 1e-9) return `${at} already reaches ${min} SF, so rooms convert in place${ev.lost ? ` and only ${ev.lost} ${ev.lost === 1 ? "tenant leaves" : "tenants leave"} to balance the tests` : " and nobody has to leave"}.`;
    if (!ev.lost) return `${at} falls short of ${min} SF, but the Guidelines accept an average across all converted rooms, so every room converts in place and nobody has to leave.`;
    const merges = triples > pairs ? "three rooms" : "two rooms";
    const cost = triples > pairs ? "each three-room unit sends two tenants away" : "each pair sends one tenant away";
    if (singles > pairs + triples) return `${at} falls short of ${min} SF, but the Guidelines accept an average across all converted rooms, so most rooms convert in place and the ${pairs + triples} merged ${pairs + triples === 1 ? "unit carries" : "units carry"} the average: ${cost}.`;
    return `${at} does not reach ${min} SF on its own, so a unit is ${merges} knocked together, and ${cost}. That is where the ${ev.displaced} come from.`;
  });

  // selecting a building brings its plan into view
  $effect(() => {
    if (ui.sel === null) return;
    tick().then(() => { const el = document.getElementById("bp-plan"); if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  });

  function setTenancy(e) {
    ui.tenancy[i] = Math.max(0, num(e.currentTarget.value) || 0);
  }
  function showOnMap() {
    ui.scenColour = true;
    const el = document.getElementById("map-stage");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
</script>

{#if b}
  <BuildingCard {b} {i} {data} colour={cardColour(b, i, scen)} onclose={() => selectBuilding(i)} />
{:else}
  <p class="src">Click a building to read its record and draw its typical floor below.
    Drag to pan, shift-drag or right-drag to orbit, scroll to zoom.</p>
{/if}

<div class="stage-bar">
  <span class="label">{b ? b.name + " · " + b.addr : "No building selected"}</span>
  <span class="label">{b ? (proposed ? "Under these thresholds" : "As it stands") : ""}</span>
</div>

<div id="bp-plan" class="plan-stage">
  {#if !b}
    <div class="empty">Click a building on the map. Its typical floor is drawn here from the City’s footprint, with the square footage of every room,
      at the scheme that passes the thresholds beside it while displacing the fewest tenants. Move a threshold and the plan redraws.</div>
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
    <span><i class="swatch keep"></i>Kept as an SRA room</span>
    <span><i class="swatch pod"></i>Bathroom and kitchen, Guidelines p.5–6</span>
    <span><i class="swatch circ"></i>Corridor and stair</span>
    {#if plan.roomsEnd < plan.L - 0.3}<span><i class="swatch hatch"></i>Floor Appendix B does not count as rooms</span>{/if}
  </div>
{/if}

<ThresholdSliders />

{#if ev}
  <div class="tally"><Tile n={ev.original} label="Rooms" /><Tile n={floors[0].rooms.length} label="Per floor" /><Tile n={Math.round(meanSf) + " SF"} label="Each" /></div>
  <div class="tally gap"><Tile n={ev.units.length} label="Units" /><Tile n={ev.untouched.length} label="Kept as SRA" />
    <Tile n={ev.displaced} label="Tenants displaced" /><Tile n={pct(ev.original ? ev.lost / ev.original : 0)} label="Of the building" /></div>
  <p class="why gap">{whyLine}</p>
  <p class="note">
    {#if opt && opt.feasible}
      <strong>The scheme that loses the fewest rooms under these thresholds</strong>{ev.size.viaAverage ? ", the size test on the average fallback" : ""}:
      {opt.units} units, {opt.kept} rooms kept as SRA, <strong>{opt.lost} tenants displaced</strong> of {opt.original}. Every scheme of adjacent merges was searched; none loses fewer.
    {:else}
      <strong>No scheme of adjacent merges passes these thresholds</strong> under the {ui.strict ? "strict" : "average"} reading{opt && opt.reason ? ": " + opt.reason : ""}.
      The building does not convert, and nobody is displaced.
    {/if}
    The working is below the plan.</p>
  <div class="field gap" style="max-width:200px"><label for="bp-ten">Tenancy of every room, years</label>
    <input type="number" id="bp-ten" min="0" step="0.5" value={ui.tenancy[i] ?? SURVEY.tenancyYears} onchange={setTenancy}>
    <span class="hint-s">Survey average 4.6; drives the compensation bracket of s.4.8(i)</span></div>
  <p class="note gap"><strong>Under the policy:</strong>
    {#if !district}not yet run{:else if !sc}outside the stock the policy reaches
    {:else if sc.state === "converted"}{sc.units} units · {sc.lost} tenants displaced · {sc.lost === 0 ? "no rooms lost" : sc.lost <= district.policy.smallLoss ? "within the " + district.policy.smallLoss + "-room route of s.4.3A" : "over the " + district.policy.smallLoss + "-room route, so Council"}
    {:else if sc.state === "infeasible"}no compliant conversion under these thresholds
    {:else if sc.state === "self-contained"}already self-contained apartments by its record, so it stands outside the stock the policy reaches; the tests above describe a conversion this building does not need
    {:else}left as it is{/if}.
    {#if sc && sc.state === "converted"}<button type="button" class="inline" title="Colour the map by the policy and show this building’s displaced tenants" onclick={showOnMap}>Show on the map</button>{/if}
  </p>
  <p class="src gap">Every floor is this floor: the scheme is repeated on each residential storey, and the tests are ratios, so the building passes exactly when its floor does.</p>
  <BuildingTests {ev} policy={ui.live} />
{/if}

<style>
  .stage-bar { display: flex; justify-content: space-between; gap: 10px; padding: 0 0 10px; }
  .plan-stage { background: var(--sunk); border: 1px solid var(--rule); min-height: 200px;
    display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .plan-stage :global(svg) { display: block; width: 100%; height: auto; max-height: 460px; }
  .plan-stage .empty { color: var(--ink-3); font-size: 13px; padding: 40px 20px; text-align: center; }
  .plan-legend { margin: 8px 0 2px; }
  .plan-legend .swatch.unit { background: var(--pass-soft); border: 2px solid var(--pass); }
  .plan-legend .swatch.short { background: var(--pass-soft); border: 2px solid var(--edge); }
  .plan-legend .swatch.keep { background: var(--edge-soft); border: 1px solid var(--ink-2); }
  .plan-legend .swatch.pod { border: 1px dashed var(--ink-3); }
  .plan-legend .swatch.circ { background: var(--sunk); border: 1px solid var(--rule); }
  .plan-legend .swatch.hatch { background: repeating-linear-gradient(45deg, var(--rule) 0 1px, transparent 1px 3px); }
  .gap { margin-top: 12px; }
  .why { font-size: 13.5px; line-height: 1.5; color: var(--ink); margin: 12px 0 6px; padding-left: 10px; border-left: 2px solid var(--accent); }
  .tally.gap { margin-top: 10px; }
  button.inline { margin-left: 6px; }
</style>
