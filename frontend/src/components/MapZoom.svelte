<script>
  let { mode, zoomIn, zoomOut, setMode } = $props();
  const MODES = [
    { key: "policy", name: "Policy", title: "Colour each building by how many of its tenants the policy displaces" },
    { key: "people", name: "People", title: "Split each building by where its tenants go: kept, re-housed, displaced" }
  ];
</script>

<div class="map-zoom">
  <button type="button" title="Zoom in" aria-label="Zoom in" onclick={zoomIn}>+</button>
  <button type="button" title="Zoom out" aria-label="Zoom out" onclick={zoomOut}>&minus;</button>
  {#each MODES as m (m.key)}
    <button type="button" class:on={mode === m.key} title={m.title} onclick={() => setMode(m.key)}>{m.name}</button>
  {/each}
</div>

<style>
  .map-zoom { position: absolute; right: 10px; top: 10px; z-index: 2; display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
  .map-zoom button { font-size: 12px; padding: 3px 8px; min-width: 30px; background: color-mix(in srgb, var(--surface) 92%, transparent); }
  .map-zoom button.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
</style>
