<script>
  // The three tests run on the plan above, each with its clause and working.
  import Tile from "./Tile.svelte";
  import { CITE } from "../lib/policy.js";
  import { pctInt } from "../lib/format.js";
  let { ev, policy } = $props();

  const tests = $derived([
    { name: "Size — " + policy.minUnit + " SF per unit, or " + policy.minUnit + " SF average", t: ev.size, cite: CITE.size },
    { name: "Room count — reduction of at most " + pctInt(policy.maxReduction), t: ev.count, cite: CITE.count },
    { name: "Replacement — at least " + pctInt(policy.minReplace) + " of rooms replaced", t: ev.replace, cite: CITE.replace }
  ]);
  const verdict = (t) => !t.pass ? "Fail" : (t.edge ? "Pass, at the limit" : "Pass");
  const cls = (t) => !t.pass ? "fail" : (t.edge ? "edge" : "pass");
</script>

<div class="tests">
  <div class="label head">Tests · run on the plan above
    <span class="overall" style:color={ev.compliant ? "var(--pass)" : "var(--fail)"}>{ev.compliant ? "All three tests pass" : "Not compliant"}</span>
  </div>
  <div class="tally">
    <Tile n={ev.original} label="Rooms before" /><Tile n={ev.surviving} label="Rooms after" />
    <Tile n={ev.units.length} label="Self-contained units" /><Tile n={ev.lost} label="Rooms lost" />
    <Tile n={ev.displaced} label="Permanently displaced" />
  </div>
  <div class="list">
    {#each tests as x}
      <div class="test">
        <div class="verdict {cls(x.t)}">{verdict(x.t)}</div>
        <div><h3>{x.name}</h3><div class="working">{x.t.working}</div>
          <div class="cite">{x.cite[0]} — <em>“{x.cite[1]}”</em></div></div>
      </div>
    {/each}
  </div>
  {#if ev.smallLoss}
    <div class="flag"><div><strong>{ev.lost} designated room{ev.lost === 1 ? "" : "s"} lost — at or under the {policy.smallLoss}-room threshold in
      {CITE.small[0]}.</strong> A permit may be sought from the General Manager rather than Council. Not automatic: it also requires findings
      of improved livability or operations and secured affordability, both discretionary and outside what this tool computes.</div></div>
  {/if}
  {#if ev.units.length && ev.units.length > ev.candidates}
    <div class="flag"><div>The scheme produces more units than there are tenants in the rooms being converted; surplus capacity is not modelled.</div></div>
  {/if}
  <p class="note">Passing is a precondition, not an approval. The Guidelines say qualifying rooms
    <strong>will be considered</strong> for release from the by-law, and a conversion permit is
    still required under SRA By-law s.4.1.</p>
</div>

<style>
  .tests { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--rule-soft); }
  .head { margin-bottom: 10px; }
  .overall { margin-left: 8px; }
  .list { margin-top: 14px; }
  .test { border-top: 1px solid var(--rule-soft); padding: 12px 0; display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 13px; }
  .test:first-child { border-top: none; }
  .verdict { font-family: "IBM Plex Sans Condensed", sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
    font-size: 11px; text-align: center; padding: 4px 0; height: fit-content; }
  .verdict.pass { background: var(--pass-soft); color: var(--pass); }
  .verdict.fail { background: var(--fail-soft); color: var(--fail); }
  .verdict.edge { background: var(--edge-soft); color: var(--edge); }
  .test h3 { margin: 0 0 3px; font-size: 14.5px; font-weight: 600; }
  .working { color: var(--ink-2); font-size: 13.5px; font-variant-numeric: tabular-nums; }
  .cite { font-family: "IBM Plex Serif", Georgia, serif; font-size: 12.5px; color: var(--ink-3); margin-top: 4px; }
  .cite em { color: var(--ink-2); }
  .flag { display: flex; gap: 10px; background: var(--edge-soft); border-left: 3px solid var(--edge); padding: 10px 12px; font-size: 13.5px; margin-top: 12px; }
</style>
