<script>
  // Section 02: the committed thresholds applied to every building the policy
  // reaches, and who that displaces.
  import { ui, selectBuilding } from "../lib/state.svelte.js";
  import { planOf } from "../lib/model.js";
  import { cardColour } from "../lib/colours.js";
  import { pct, count, money } from "../lib/format.js";
  import Tile from "./Tile.svelte";
  import ScenarioStrip from "./ScenarioStrip.svelte";
  import StockBar from "./StockBar.svelte";

  let { data, district } = $props();
  let whichOpen = $state(false);

  const sel = $derived(data && ui.sel !== null ? data.surveyed[ui.sel] : null);
  const out = $derived(district ? district.outcome : null);
  const cands = $derived(district ? district.cands : null);
  const small = $derived(district ? district.policy.smallLoss : 3);
  const names = (list) => list.map((i) => data.surveyed[i].name).join(", ");
  const rows = $derived(cands ? cands.list
    .map((c) => ({ i: c.i, b: data.surveyed[c.i], sf: planOf(data, c.i, ui.assume).sf, n: c.n, units: c.units, lost: c.lost }))
    .sort((a, b) => b.lost - a.lost || (b.lost / b.n) - (a.lost / a.n)) : []);
  const alreadyRooms = $derived(cands ? cands.already.reduce((t, i) => t + data.surveyed[i].rooms, 0) : 0);

  function pickRow(i) {
    if (ui.sel !== i) selectBuilding(i);
    const el = document.getElementById("scen-strip"); if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
</script>

<div id="scen-strip">
  {#if sel}
    <ScenarioStrip b={sel} i={ui.sel} sc={district && district.scen[ui.sel]} ran={!!district}
      colour={cardColour(sel, ui.sel, ui.scenColour && district ? district.scen : null)} />
  {/if}
</div>
<div class="label">The policy</div>
<div class="field">
  <label for="d-scope">Which buildings it reaches</label>
  <select id="d-scope" bind:value={ui.scope}>
    <option value="market">Private SROs</option>
    <option value="all">All of Appendix B</option>
    <option value="nonmarket">Public SROs</option>
  </select>
</div>

<div class="label out-head">Who is displaced</div>
{#if out}
  <p class="note head">
    {#if out.convert}
      <strong>{out.convert} of {out.of} buildings convert</strong> under these thresholds, delivering {count(out.units)} units and keeping {count(out.kept)} rooms as SRA.
      <strong>{count(out.lost)} tenants lose their room</strong>{out.tenants ? ", " + pct(out.lost / out.tenants) + " of everyone in the stock the policy reaches" : ""}.
      {#if out.cannot}{out.cannot} building{out.cannot > 1 ? "s" : ""} with {count(out.stuckTenants)} rooms cannot pass these thresholds and stay as they are.{:else}Every building in scope can pass.{/if}
    {:else}<strong>Nothing converts</strong> under these thresholds.{/if}
  </p>
  <div class="tally three">
    <Tile n={count(out.lost)} label={"Tenants displaced" + (out.tenants ? " · " + pct(out.lost / out.tenants) : "")} />
    <Tile n={out.convert + "/" + out.of} label="Buildings convert" />
    <Tile n={count(out.units)} label="Units delivered" />
    <Tile n={count(out.kept)} label="Rooms kept as SRA" />
    <Tile n={count(out.council)} label={"Need Council · over " + small + " rooms lost"} />
    <Tile n={money(out.comp)} label="Compensation, s.4.8(i)" />
  </div>
  <div class="label out-head">Every tenant the policy reaches</div>
  <StockBar parts={[
    { n: out.lost, label: "Displaced: their room is lost", colour: "var(--fail)", dark: true },
    { n: out.units, label: "Re-housed in a new unit", colour: "var(--pass)", dark: true },
    { n: out.kept, label: "Stay in a room kept as SRA", colour: "var(--edge)", dark: true },
    { n: out.stuckTenants, label: "Building cannot pass, left as it is", colour: "var(--scen-x)", dark: false },
    { n: out.noPlanTenants, label: "No footprint to draw", colour: "var(--map-unsurveyed)", dark: true }
  ]} />

  <details class="assume out-head" bind:open={whichOpen}>
    <summary>Which buildings · {rows.length} convert{out.cannot ? " · " + out.cannot + " cannot" : ""}</summary>
    {#if cands.stuck.length}
      <p class="note gap"><strong>{cands.stuck.length} building{cands.stuck.length > 1 ? "s" : ""} cannot pass these thresholds</strong>: no scheme of adjacent merges reaches the unit size while leaving enough rooms standing. Shown white on the map: {names(cands.stuck)}.</p>
    {/if}
    {#if cands.already.length}
      <p class="src"><strong>{cands.already.length} building{cands.already.length > 1 ? "s" : ""} with {count(alreadyRooms)} rooms in Appendix B {cands.already.length > 1 ? "are" : "is"} already self-contained</strong> by {cands.already.length > 1 ? "their records" : "its record"}, so the policy has nothing to convert there: {names(cands.already)}. See the record on the building card.</p>
    {/if}
    {#if cands.noPlan.length}
      <p class="src">{cands.noPlan.length} in-scope building{cands.noPlan.length > 1 ? "s have" : " has"} no footprint to draw a floor from and {cands.noPlan.length > 1 ? "are" : "is"} left out.</p>
    {/if}
    {#if rows.length}
      <table class="dist"><thead><tr><th>Converted building</th><th class="n">Rooms</th><th class="n">SF each</th><th class="n">Units</th><th class="n">Displaced</th><th class="n">Share</th><th class="n">Route</th></tr></thead><tbody>
        {#each rows as r (r.i)}
          <tr class="pick" onclick={() => pickRow(r.i)}><td>{r.b.name}</td><td class="n">{r.n}</td><td class="n">{Math.round(r.sf)}</td><td class="n">{r.units}</td><td class="n">{r.lost}</td><td class="n">{pct(r.n ? r.lost / r.n : 0)}</td><td class="n">{r.lost === 0 ? "—" : r.lost <= small ? "GM" : "Council"}</td></tr>
        {/each}
      </tbody></table>
      <p class="src">Most displaced first. GM: at or under the small-loss route of s.4.3A, a permit from the General Manager; Council: over it. Click a row to load that building in section 01.</p>
    {/if}
  </details>
{/if}

<details class="assume">
  <summary>Assumptions</summary>
  <p class="src">The policy is applied everywhere it can be, all at once: every building in
    scope converts at the scheme that passes the thresholds above while losing the fewest rooms,
    or nothing. A building whose rooms cannot pass
    under these thresholds does not convert and is counted. Every room is taken as occupied, so
    rooms lost are tenants displaced; the survey&rsquo;s average tenancy of 4.6 years places each
    in the 4-month bracket of s.4.8(i), at the survey&rsquo;s average rent for the building&rsquo;s tenure.</p>
  <p class="src">Room size is read from each footprint: its area less the circulation share,
    divided by the rooms Appendix B counts on a floor, and capped where a footprint holds far
    more than its count suggests. A unit takes at most the rooms set above. None of this is in the sources.</p>
</details>

<style>
  .head { margin: 0 0 10px; }
  .gap { margin-top: 12px; }
  .tally.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  table.dist { font-size: 11px; }
  table.dist td, table.dist th { padding: 3px 4px; }
  table.dist td.n { white-space: nowrap; }
</style>
