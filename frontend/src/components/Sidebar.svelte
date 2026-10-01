<script>
  import BuildingSection from "./BuildingSection.svelte";
  import PolicySection from "./PolicySection.svelte";
  let { data, district } = $props();
</script>

<aside class="side" id="side">
  <section class="sb">
    <div class="sec-head">
      <span class="sec-num">01</span><h2>Building</h2>
      <span class="note">The selected building&rsquo;s typical floor, redrawn as the thresholds move</span>
    </div>
    <BuildingSection {data} {district} />
  </section>

  <section class="sb">
    <div class="sec-head">
      <span class="sec-num">02</span><h2>Policy</h2>
      <span class="note">Applied to every building at once</span>
    </div>
    <PolicySection {data} {district} />
  </section>

  <footer>
    <p><strong>Scope.</strong> The tool searches for the compliant scheme of adjacent merges that loses
      the fewest rooms under the thresholds set, building by building and across the district, and
      draws it. It does not model the permit process, financial-viability findings,
      rent-setting, or whether a merge is physically buildable. The model is diagrammatic: rooms are
      single-loaded off one corridor at an assumed 12&prime; depth, and width follows area. Partitions are
      drawn at 3&prime; so the plan reads from above. Pod program comes from SRA Guidelines p.5&ndash;6,
      which dimensions only the refrigerator (24&Prime;&times;24&Prime;); the bathroom
      (5&prime;&times;8&prime;) and kitchen run (8&prime;&times;2&prime;) are conventional minimums stated
      here as assumptions.</p>
  </footer>
</aside>

<style>
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
