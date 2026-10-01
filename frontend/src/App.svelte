<script>
  // The frame: the map fills the window, the tool lives in a sidebar.
  // This component loads the data once and derives the district-wide
  // outcome of the committed policy, which both halves read.
  import { onMount } from "svelte";
  import { ui } from "./lib/state.svelte.js";
  import { loadAll, recordOf } from "./lib/data.js";
  import { makeProj, mapBbox } from "./lib/projection.js";
  import { planOf, optimumOf } from "./lib/model.js";
  import { candidatesFor, policyOutcome, scenarioOf } from "./lib/district.js";
  import Sidebar from "./components/Sidebar.svelte";
  import MapStage from "./components/MapStage.svelte";

  let data = $state(null);
  onMount(async () => { data = await loadAll(); });

  const proj = $derived(data && data.streets ? makeProj(mapBbox(data.surveyed, data.streets.bbox)) : null);

  // the policy applied to every building it reaches, under the committed thresholds
  const district = $derived.by(() => {
    if (!data || !data.foot || !data.surveyed.length) return null;
    const { assume, policy, strict, scope } = ui;
    const cands = candidatesFor({
      surveyed: data.surveyed, scope,
      recordOf: (b) => recordOf(data.records, b),
      planOf: (i) => planOf(data, i, assume),
      optimumOf: (i) => optimumOf(data, i, assume, strict, policy)
    });
    return { cands, policy, strict, outcome: policyOutcome(cands, data.surveyed, policy), scen: scenarioOf(cands, data.surveyed) };
  });
</script>

<div class="app">
  <Sidebar {data} {district} />
  <MapStage {data} {proj} {district} />
</div>
