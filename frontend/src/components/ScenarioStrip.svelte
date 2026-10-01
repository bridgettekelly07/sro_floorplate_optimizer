<script>
  // the selected building at the top of the policy section: what the policy does with it
  import { selectBuilding } from "../lib/state.svelte.js";
  let { b, i, sc, ran, colour } = $props();
  const what = $derived(!ran ? "not yet run" : !sc ? "Outside the stock the policy reaches"
    : sc.state === "converted" ? "Converts · " + sc.units + " units · " + sc.lost + " tenants displaced"
    : sc.state === "infeasible" ? "No compliant conversion under these thresholds"
    : sc.state === "self-contained" ? "Already self-contained by its record: outside the conversion stock"
    : "Left as it is");
  function open() { const p = document.getElementById("bp-plan"); if (p) p.scrollIntoView({ behavior: "smooth", block: "center" }); }
</script>

<div class="scen-strip" style:--pick={colour}>
  <h4>{b.name}<button type="button" class="close" aria-label="Close" onclick={() => selectBuilding(i)}>&times;</button></h4>
  <div class="meta">{b.addr || ""} · {b.tenure === "market" ? "market" : b.tenure ? "non-market" : "not surveyed"} · {b.rooms || "–"} rooms</div>
  <div>{what}</div>
  <div class="btnrow"><button type="button" onclick={open}>Open in section 01</button></div>
</div>

<style>
  .scen-strip { border: 1px solid var(--rule); border-left: 4px solid var(--pick, var(--rule)); padding: 10px 12px; margin-bottom: 12px; font-size: 12.5px; }
  h4 { margin: 0 0 4px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
  h4 .close { margin-left: auto; font: inherit; border: none; background: none; color: var(--ink-3); cursor: pointer; padding: 0 4px; }
  .meta { color: var(--ink-3); font-size: 11.5px; margin-bottom: 6px; }
  .btnrow { margin-top: 8px; }
</style>
