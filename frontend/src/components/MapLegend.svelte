<script>
  import { ui } from "../lib/state.svelte.js";
  import { CLASSES, classVar, WHO } from "../lib/colours.js";
</script>

<div class="map-legend">
  {#if ui.mapMode === "policy"}
    <div class="legend">
      <span class="classes"><b>Tenants displaced by the conversion</b>
        {#each CLASSES as c, k}<span><i class="swatch" style={"background:var(" + classVar(k) + ")"}></i>{c.label}</span>{/each}
      </span>
      <span><i class="swatch" style="background:var(--scen-x)"></i>Cannot convert under these thresholds</span>
    </div>
  {:else if ui.mapMode === "people"}
    <div class="legend">
      <span class="classes"><b>Where every tenant goes, as bands of the building</b>
        {#each WHO.slice(0, 4) as w (w.key)}<span><i class="swatch" style={"background:var(" + w.v + ")"}></i>{w.label}</span>{/each}
      </span>
    </div>
  {:else}
    <div class="legend">
      <span><i class="swatch" style="background:var(--map-market);border-radius:50%"></i>Private: privately owned</span>
      <span><i class="swatch" style="background:var(--map-nonmarket);border-radius:50%"></i>Public: owned by government, a non-profit or a society</span>
    </div>
  {/if}
</div>

<style>
  .map-legend { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
    background: color-mix(in srgb, var(--surface) 88%, transparent); padding: 8px 14px; border-top: 1px solid var(--rule); }
  .map-legend .legend { gap: 4px 18px; justify-content: space-between; }
</style>
