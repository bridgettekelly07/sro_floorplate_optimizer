<script>
  // The map, filling the window: the district in 3D, with the legend, the
  // readout, the zoom controls and the hover tip laid over it.
  import { ui, selectBuilding } from "../lib/state.svelte.js";
  import { mapColour, mapColourHex, bandsOf } from "../lib/colours.js";
  import Map3D from "./Map3D.svelte";
  import MapLegend from "./MapLegend.svelte";
  import MapReadout from "./MapReadout.svelte";
  import MapZoom from "./MapZoom.svelte";

  let { data, proj, district } = $props();
  let three = $state();
  let tip = $state(null);          // { text, colour, x, y }
  let fail = $state("");           // why the 3D view could not start
  let busy = $state(0);            // heavy 3D work in flight

  const ready = $derived(!!(data && proj && data.streets && data.surveyed.length && data.foot));
  const mode = $derived(ui.mapMode);
  const scen = $derived(mode !== "tenure" && district ? district.scen : null);
  const colourOf = (b, i) => mapColour(b, i, scen, mode);
  const colourHex = (b, i) => mapColourHex(b, i, scen, mode);
  const bands = (b, i) => (mode === "people" && scen ? bandsOf(scen[i]) : null);

  function hover(h) {
    if (!h) { tip = null; return; }
    const b = data.surveyed[h.i];
    tip = { text: b.name + " · " + b.rooms + " rooms", colour: colourOf(b, h.i), x: h.x, y: h.y };
  }
  function failed(msg) { fail = "3D view: " + msg; console.error(fail); }
  function zoom(f) { if (three) three.zoom(f); }
  // the same button again turns its reading off, back to tenure
  function setMode(m) { ui.mapMode = ui.mapMode === m ? "tenure" : m; }
</script>

<div class="map-stage" id="map-stage">
  <MapLegend />
  <MapReadout {district} />
  {#if ready && !fail}
    <Map3D bind:this={three} {data} {proj} {scen} {mode} theme={ui.theme} colourOf={colourHex} bandsOf={bands} sel={ui.sel}
      onSelect={selectBuilding} onHover={hover} onFail={failed}
      onBusy={(on) => { busy = Math.max(0, busy + (on ? 1 : -1)); }} />
  {:else if data && !data.streets}
    <div class="map-3d-hint">The street grid did not load, so the map is empty; every other section still works.</div>
  {/if}
  {#if fail}<div class="map-3d-hint">{fail}</div>{/if}
  {#if !data || busy > 0}
    <div class="map-loading" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span>{!data ? "Loading the city" : "Drawing the district"}</span>
    </div>
  {/if}
  {#if tip}
    <div class="map-tip" style:left={tip.x.toFixed(0) + "px"} style:top={tip.y.toFixed(0) + "px"} style:color={tip.colour}>{tip.text}</div>
  {/if}
  <MapZoom {mode} zoomIn={() => zoom(1 / 1.5)} zoomOut={() => zoom(1.5)} {setMode} />
</div>

<style>
  .map-stage { position: relative; background: var(--surface); overflow: hidden; min-height: 340px;
    flex: 1 1 auto; min-width: 0; height: 100%; order: 1; }
  @media (max-width: 900px) { .map-stage { order: 1; height: 62vh; } }
  .map-3d-hint { position: absolute; left: 14px; bottom: 48px; max-width: 250px; pointer-events: none; z-index: 2;
    font-size: 11.5px; line-height: 1.45; color: var(--ink-2); background: color-mix(in srgb, var(--surface) 88%, transparent);
    border-left: 2px solid var(--accent); padding: 7px 10px; }
  .map-loading { position: absolute; inset: 0; z-index: 4; display: flex; align-items: center; justify-content: center; gap: 12px;
    background: color-mix(in srgb, var(--surface) 55%, transparent); color: var(--ink-2); pointer-events: none;
    font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; }
  .spinner { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--rule); border-top-color: var(--accent);
    animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
  .map-tip { position: absolute; pointer-events: none; background: var(--surface); color: var(--ink); z-index: 3;
    border: 1px solid var(--rule); font-family: "IBM Plex Sans Condensed", sans-serif; font-weight: 600;
    font-size: 12px; letter-spacing: 0.02em; padding: 5px 8px; white-space: nowrap; transform: translate(-50%, -140%);
    font-variant-numeric: tabular-nums; }
</style>
