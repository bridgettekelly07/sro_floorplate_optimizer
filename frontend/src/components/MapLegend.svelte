<script>
  import { ui } from "../lib/state.svelte.js";
</script>

<div class="map-legend">
  {#if ui.scenColour}
    <div class="legend">
      <span><i class="swatch" style="background:var(--scen-0)"></i>Converts, nobody displaced</span>
      <span><i class="swatch" style="background:var(--scen-1)"></i>Converts, half the tenants displaced</span>
      <span><i class="swatch" style="background:var(--scen-x)"></i>No compliant scheme under these thresholds</span>
      <span><i class="swatch" style="background:var(--map-unsurveyed)"></i>Outside the policy</span>
      <span><i class="swatch grad"></i>In 3D, a converting building shades from the “nobody displaced” colour at the ground toward the “displaced” colour at the roof: the stronger the roof, the larger the share displaced</span>
    </div>
  {:else}
    <div class="legend">
      <span><i class="swatch" style="background:var(--map-market);border-radius:50%"></i>Private</span>
      <span><i class="swatch" style="background:var(--map-nonmarket);border-radius:50%"></i>Public</span>
      <span><i class="swatch" style="background:var(--map-unsurveyed);border-radius:50%"></i>Not surveyed</span>
    </div>
  {/if}
</div>

<style>
  .map-legend { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
    background: color-mix(in srgb, var(--surface) 88%, transparent); padding: 8px 14px; border-top: 1px solid var(--rule); }
  .map-legend .legend { gap: 4px 18px; justify-content: space-between; }
  .swatch.grad { width: 8px; height: 14px; border-radius: 0; background: linear-gradient(to bottom, var(--scen-1), var(--scen-0)); }
</style>
