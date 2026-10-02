<script>
  import BuildingSection from "./BuildingSection.svelte";
  import PolicySection from "./PolicySection.svelte";
  import { ui, setTheme } from "../lib/state.svelte.js";
  let { data, district } = $props();
  const summary = $derived(data && data.surveyed && data.surveyed.length
    ? data.surveyed.length + " buildings · " + data.surveyed.reduce((t, b) => t + (b.rooms || 0), 0).toLocaleString("en-CA") + " rooms" : "");
  const dark = $derived(ui.theme === "dark");
</script>

<aside class="side" id="side">
  <button type="button" class="theme" title={dark ? "Switch to light mode" : "Switch to dark mode"}
    aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onclick={() => setTheme(dark ? "light" : "dark")}>
    {#if dark}
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
      </svg>
    {/if}
  </button>
  <header class="masthead side-title">
    <h1>SRO Conversions in the DTES</h1>
    <div class="label summary">{summary}</div>
  </header>
  <section class="sb">
    <BuildingSection {data} {district} />
  </section>

  <section class="sb">
    <div class="sec-head">
      <span class="sec-num">02</span><h2>Policy</h2>
      <span class="note">Applied to every building at once</span>
    </div>
    <PolicySection {data} {district} />
  </section>

</aside>

<style>
  .side { position: relative; }
  .side-title { margin: 0 0 14px; padding-right: 44px; }
  .side-title h1 { font-size: 22px; line-height: 1.15; margin: 0 0 4px; }
  .side-title .summary { color: var(--ink-3); }
  .theme { position: absolute; top: 12px; right: 14px; z-index: 3; width: 30px; height: 30px; padding: 0;
    display: grid; place-items: center; border-radius: 50%; color: var(--ink-2); }
  .theme:hover { color: var(--ink); }
  .side { flex: 0 0 460px; width: 460px; min-width: 0; overflow-y: auto; overscroll-behavior: contain; order: 2;
    border-left: 1px solid var(--rule); padding: 18px 18px 40px; background: var(--paper); }
  .sb { margin-top: 4px; }
  .sb + .sb { margin-top: 26px; }
  .sb > .sec-head { margin-bottom: 12px; }
  footer { margin-top: 28px; border-top: 1px solid var(--rule); padding-top: 14px; font-size: 12px; color: var(--ink-3); }
  footer p { max-width: 80ch; }
  @media (max-width: 900px) {
    .side { flex: none; width: auto; border-left: none; border-top: 1px solid var(--rule); overflow: visible; }
  }
</style>
