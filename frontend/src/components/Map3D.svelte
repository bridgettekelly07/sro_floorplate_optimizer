<script>
  // The three.js district. This component owns the element and the lifecycle;
  // the drawing lives in lib/district3d.js. Building the district blocks the
  // main thread for a moment, so every heavy step is queued behind a paint:
  // the page shows its new state and the loading overlay first, then builds.
  import { onMount, tick } from "svelte";
  import { District3D } from "../lib/district3d.js";

  let { data, proj, scen, theme, colourOf, sel, plan, onSelect, onHover, onFail, onPlanChange, onBusy } = $props();
  let wrap = $state(), labels = $state();
  let d3 = null, started = $state(false), alive = true;

  // heavy work runs one job at a time, each after the browser has painted
  let chain = Promise.resolve(), queued = new Set();
  function heavy(key, fn) {
    if (queued.has(key)) return;           // a build of this kind is already waiting; it will see the latest props
    queued.add(key);
    chain = chain.then(async () => {
      queued.delete(key);
      if (!alive) return;
      onBusy && onBusy(true);
      await tick();
      // one paint before the heavy work; a hidden tab never paints, so fall back to a short timer
      await new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; setTimeout(r, 0); } }; requestAnimationFrame(go); setTimeout(go, 300); });
      if (!alive) return;
      try { fn(); } finally { onBusy && onBusy(false); }
    });
  }

  onMount(() => {
    d3 = new District3D(wrap, labels, { onSelect, onHover });
    if (import.meta.env.DEV) window.__d3 = d3;   // for poking at the scene from the console
    d3.onPlanChange = onPlanChange;
    d3.setData(data, proj);
    heavy("init", () => {
      if (!d3.init()) { onFail("this browser could not start a WebGL context."); return; }
      d3.resize();
      d3.fit();
      d3.setStyle(colourOf);
      d3.setSelected(sel);
      d3.setPlan(plan);
      d3.build();
      started = true;
      d3.start(onFail);
    });
    const ro = new ResizeObserver(() => { if (started) d3.resize(); });
    ro.observe(wrap);
    return () => { alive = false; ro.disconnect(); d3.dispose(); };
  });

  // the policy's colours and gradients, rebuilt whenever the scenario changes
  $effect(() => {
    void scen;
    if (!started) return;
    heavy("scene", () => { d3.setStyle(colourOf); d3.build(); });
  });
  $effect(() => { if (started) d3.setSelected(sel); });
  $effect(() => { if (started) d3.setPlan(plan); });
  // the theme's tokens, re-read once the interface has switched
  $effect(() => { void theme; if (started) heavy("theme", () => { d3.colours(); d3.build(); }); });

  export function zoom(f) { d3 && d3.zoom(f); }
  export function fit() { d3 && d3.fit(); }
</script>

<div class="map-3d" bind:this={wrap}>
  <div class="map-3d-labels" bind:this={labels}></div>
</div>

<style>
  .map-3d { position: absolute; inset: 0; overflow: hidden; }
  .map-3d :global(canvas) { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
  .map-3d:global(.orbiting) :global(canvas) { cursor: move; }
  .map-3d:global(.picking) :global(canvas) { cursor: pointer; }
  .map-3d-labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .map-3d-labels :global(.lbl) { position: absolute; transform: translate(-50%, -100%); white-space: nowrap;
    font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 11px; color: var(--ink);
    text-shadow: 0 1px 3px var(--surface), 0 0 6px var(--surface); }
  .map-3d-labels :global(.lbl.sel) { font-weight: 600; font-size: 12.5px; }
</style>
