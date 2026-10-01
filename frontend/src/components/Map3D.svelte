<script>
  // The three.js district. This component owns the element and the lifecycle;
  // the drawing lives in lib/district3d.js.
  import { onMount } from "svelte";
  import { District3D } from "../lib/district3d.js";

  let { data, proj, scen, colourOf, gradientOf, sel, plan, onSelect, onHover, onFail, onPlanChange } = $props();
  let wrap = $state(), labels = $state();
  let d3 = null, started = $state(false);

  onMount(() => {
    d3 = new District3D(wrap, labels, { onSelect, onHover });
    d3.onPlanChange = onPlanChange;
    d3.setData(data, proj);
    if (!d3.init()) { onFail("this browser could not start a WebGL context."); return; }
    d3.resize();
    d3.fit();
    started = true;
    d3.start(onFail);
    const ro = new ResizeObserver(() => d3.resize());
    ro.observe(wrap);
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const onTheme = () => { d3.colours(); d3.build(); };
    if (mq) mq.addEventListener("change", onTheme);
    return () => { ro.disconnect(); if (mq) mq.removeEventListener("change", onTheme); d3.dispose(); };
  });

  // the policy's colours and gradients, rebuilt whenever the scenario changes
  $effect(() => {
    void scen;
    if (!started) return;
    d3.setStyle(colourOf, gradientOf);
    d3.build();
  });
  $effect(() => { if (started) d3.setSelected(sel); });
  $effect(() => { if (started) d3.setPlan(plan); });

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
