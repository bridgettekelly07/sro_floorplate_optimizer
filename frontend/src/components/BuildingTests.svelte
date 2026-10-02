<script>
  // The three tests run on the plan above, each with its clause and working.
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
  <div class="label head">Tests
    <span class="overall" style:color={ev.compliant ? "var(--pass)" : "var(--fail)"}>{ev.compliant ? "All three pass" : "Not compliant"}</span>
  </div>
  <div class="list">
    {#each tests as x}
      <div class="test">
        <div class="verdict {cls(x.t)}">{verdict(x.t)}</div>
        <div><h3>{x.name}</h3><div class="working">{x.t.working}</div>
          <div class="cite">{x.cite[0]}</div></div>
      </div>
    {/each}
  </div>
  {#if ev.smallLoss}
    <div class="flag"><div><strong>{ev.lost} room{ev.lost === 1 ? "" : "s"} lost, within the {policy.smallLoss}-room route of {CITE.small[0]}:</strong> the General Manager may permit it, subject to findings this tool does not compute.</div></div>
  {/if}
  {#if ev.units.length && ev.units.length > ev.candidates}
    <div class="flag"><div>More units than tenants in the converted rooms; the surplus is not modelled.</div></div>
  {/if}
  <p class="src">Passing is a precondition, not an approval: a conversion permit is still required under SRO By-law s.4.1.</p>
</div>

<style>
  .tests { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--rule-soft); }
  .head { margin-bottom: 10px; }
  .overall { margin-left: 8px; }
  .list { margin-top: 6px; }
  .test { border-top: 1px solid var(--rule-soft); padding: 9px 0; display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 13px; }
  .test:first-child { border-top: none; }
  .verdict { font-family: "IBM Plex Sans Condensed", sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
    font-size: 11px; text-align: center; padding: 4px 0; height: fit-content; }
  .verdict.pass { background: var(--pass-soft); color: var(--pass); }
  .verdict.fail { background: var(--fail-soft); color: var(--fail); }
  .verdict.edge { background: var(--edge-soft); color: var(--edge); }
  .test h3 { margin: 0 0 3px; font-size: 14.5px; font-weight: 600; }
  .working { color: var(--ink-2); font-size: 13.5px; font-variant-numeric: tabular-nums; }
  .cite { font-family: "IBM Plex Serif", Georgia, serif; font-size: 12.5px; color: var(--ink-3); margin-top: 4px; }

  .flag { display: flex; gap: 10px; background: var(--edge-soft); border-left: 3px solid var(--edge); padding: 10px 12px; font-size: 13.5px; margin-top: 12px; }
</style>
