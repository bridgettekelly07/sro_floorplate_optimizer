<script>
  // The flat map: pan by dragging, zoom with the wheel or the buttons. The
  // SVG is rebuilt on a short timer after a zoom and only its viewBox moves
  // while panning.
  import { drawFlatMap, resetView, refitView, clampView, zoomView, viewBox } from "../lib/flatMap.js";

  let { data, proj, scen, colourOf, sel, onSelect, onHover } = $props();
  let el = $state();
  let view = $state(null);
  let drawnView = $state(null);     // the view the current SVG was drawn for
  let panning = null, moved = false, timer = null;

  function aspect() {
    const w = el ? el.clientWidth : 0, h = el ? el.clientHeight : 0;
    return (w > 0 && h > 0) ? h / w : proj.H / proj.W;
  }
  const svg = $derived(drawnView ? drawFlatMap({ proj, view: drawnView, streets: data.streets, ground: data.ground, foot: data.foot, surveyed: data.surveyed, sel, colourOf, scen }) : "");

  $effect(() => { if (el && proj && !view) { view = resetView(proj, aspect()); drawnView = view; } });
  $effect(() => {   // keep the view fitted to the stage as it resizes
    if (!el) return;
    const ro = new ResizeObserver(() => { if (view) { view = clampView(refitView(view, aspect()), proj, aspect()); drawnView = view; } });
    ro.observe(el);
    return () => ro.disconnect();
  });

  function schedule() {
    const s = el.querySelector("svg");
    if (s) s.setAttribute("viewBox", viewBox(view));
    onHover(null);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; drawnView = view; }, 70);
  }
  export function zoom(f, ax, ay) { view = zoomView(view, proj, aspect(), f, ax, ay); schedule(); }
  export function fit() { view = resetView(proj, aspect()); drawnView = view; }

  function toUser(e) {
    const r = el.getBoundingClientRect();
    return [view.x + (e.clientX - r.left) / r.width * view.w, view.y + (e.clientY - r.top) / r.height * view.h];
  }
  function wheel(e) { e.preventDefault(); const u = toUser(e); zoom(e.deltaY > 0 ? 1.18 : 1 / 1.18, u[0], u[1]); }
  function down(e) {
    if (e.target.closest("button")) return;
    panning = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; moved = false;
    el.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!panning) return;
    const r = el.getBoundingClientRect();
    if (Math.abs(e.clientX - panning.x) + Math.abs(e.clientY - panning.y) > 4) moved = true;
    const nv = clampView({ x: panning.vx - (e.clientX - panning.x) / r.width * view.w, y: panning.vy - (e.clientY - panning.y) / r.height * view.h, w: view.w, h: view.h }, proj, aspect());
    view = nv;
    const s = el.querySelector("svg");
    if (s) s.setAttribute("viewBox", viewBox(view));
    onHover(null);
  }
  function up() { if (!panning) return; panning = null; drawnView = view; setTimeout(() => { moved = false; }, 0); }
  function click(e) {
    if (moved) return;
    const t = e.target.closest("[data-s]");
    if (t) { e.stopPropagation(); onSelect(parseInt(t.getAttribute("data-s"), 10)); }
  }
  function over(e) {
    if (panning) return;
    const t = e.target.closest && e.target.closest("[data-s]");
    if (!t) { onHover(null); return; }
    const i = parseInt(t.getAttribute("data-s"), 10), b = data.surveyed[i];
    if (b.lon == null) return;
    const r = el.getBoundingClientRect();
    onHover({ i, x: (proj.x(b.lon) - view.x) / view.w * r.width, y: (proj.y(b.lat) - view.y) / view.h * r.height });
  }
</script>

<div class="map-canvas" bind:this={el} onwheel={wheel} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}
  onclick={click} onmouseover={over} onfocus={over} onmouseleave={() => onHover(null)} role="presentation">
  {@html svg}
</div>

<style>
  .map-canvas { position: absolute; inset: 0; }
  .map-canvas :global(svg) { display: block; width: 100%; height: 100%; }
</style>
