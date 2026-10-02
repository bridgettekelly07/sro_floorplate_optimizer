<script>
  // The policy's figures on the map itself: the district tally and where
  // every tenant goes, pinned under the title so the picture and its numbers
  // sit in one frame and move together when a threshold changes.
  import { ui } from "../lib/state.svelte.js";
  import { pct, count, money } from "../lib/format.js";
  import StockBar from "./StockBar.svelte";
  import { WHO } from "../lib/colours.js";
  const who = (k) => "var(" + WHO.find((w) => w.key === k).v + ")";

  let { district } = $props();
  const out = $derived(district ? district.outcome : null);
  const small = $derived(district ? district.policy.smallLoss : 3);
</script>

{#if ui.mapMode !== "tenure" && out}
  <div class="readout">
    <div class="label">Who is displaced · all {out.of} buildings</div>
    <div class="tiles">
      <div class="t big"><b>{count(out.lost)}</b><span>tenants displaced{out.tenants ? " · " + pct(out.lost / out.tenants) : ""}</span></div>
      <div class="t"><b>{out.convert}/{out.of}</b><span>buildings convert</span></div>
      <div class="t"><b>{count(out.units)}</b><span>units delivered</span></div>
      <div class="t"><b>{count(out.kept)}</b><span>rooms kept as SRO</span></div>
      <div class="t"><b>{count(out.council)}</b><span>need Council · over {small} rooms lost</span></div>
      <div class="t"><b>{money(out.comp)}</b><span>compensation, s.4.8(i)</span></div>
    </div>
    <div class="label bar-head">Every tenant the policy reaches</div>
    <StockBar parts={[
      { n: out.lost, label: WHO[0].label, colour: who("lost"), dark: true },
      { n: out.units, label: WHO[1].label, colour: who("units"), dark: true },
      { n: out.kept, label: WHO[2].label, colour: who("kept"), dark: true },
      { n: out.stuckTenants, label: WHO[3].label, colour: who("stuck"), dark: true },
      { n: out.noPlanTenants, label: WHO[4].label, colour: who("none"), dark: true }
    ]} />
  </div>
{/if}

<style>
  .readout { position: absolute; left: 14px; top: 12px; z-index: 2; width: min(372px, calc(100% - 90px));
    background: color-mix(in srgb, var(--surface) 90%, transparent); border: 1px solid var(--rule); border-left: 3px solid var(--accent);
    padding: 10px 12px 12px; }
  .readout .label { margin-bottom: 6px; }
  .tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 10px; }
  .t { display: grid; gap: 1px; }
  .t b { font-size: 17px; font-weight: 500; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .t.big b { color: var(--accent); }
  .t span { font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); line-height: 1.25; }
  .bar-head { margin-top: 10px; }
  .readout :global(.legend) { font-size: 10.5px; gap: 2px 10px; }
  @media (max-width: 899px) { .readout { display: none; } }
</style>
