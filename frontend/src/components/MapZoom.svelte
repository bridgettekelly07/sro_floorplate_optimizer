<script>
  let { on3d, onPlan, onPolicy, zoomIn, zoomOut, fit, toggle3d, togglePlan, togglePolicy } = $props();
</script>

<div class="map-zoom">
  <button type="button" title="Zoom in" aria-label="Zoom in" onclick={zoomIn}>+</button>
  <button type="button" title="Zoom out" aria-label="Zoom out" onclick={zoomOut}>&minus;</button>
  <button type="button" title="Fit the whole district" onclick={fit}>Fit</button>
  <button type="button" class:on={on3d} title="The district in 3D, at LiDAR height" onclick={toggle3d}>3D</button>
  <button type="button" class:on={on3d && onPlan} title="Look straight down: the district in plan, without perspective" onclick={togglePlan}>Plan</button>
  <button type="button" class:on={onPolicy} title="Colour the stock by the policy: who it displaces" onclick={togglePolicy}>Policy</button>
</div>

<style>
  .map-zoom { position: absolute; right: 10px; top: 10px; z-index: 2; display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
  .map-zoom button { font-size: 12px; padding: 3px 8px; min-width: 30px; background: color-mix(in srgb, var(--surface) 92%, transparent); }
  .map-zoom button.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
</style>
