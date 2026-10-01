<script>
  // Where the tenants go: one bar for every room in scope, as modelled.
  import { pct, count } from "../lib/format.js";
  let { parts } = $props();
  const total = $derived(parts.reduce((t, p) => t + p.n, 0));
  const W = 520, H = 26;
  const laid = $derived.by(() => {
    let x = 0;
    return parts.filter((p) => p.n).map((p) => { const w = p.n / total * W, out = { ...p, x, w }; x += w; return out; });
  });
</script>

{#if total}
  <div class="curve"><svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" font-family="IBM Plex Sans Condensed, sans-serif" font-size="10" style="max-height:26px">
    {#each laid as p}
      <rect x={p.x.toFixed(1)} y="0" width={p.w.toFixed(1)} height={H} fill={p.colour}/>
      {#if p.w > 34}<text x={(p.x + p.w / 2).toFixed(1)} y={H / 2 + 3.5} text-anchor="middle" fill={p.dark ? "var(--surface)" : "var(--ink)"}>{count(p.n)}</text>{/if}
    {/each}
  </svg></div>
  <div class="legend">
    {#each laid as p}<span><i class="swatch" style:background={p.colour}></i>{p.label} · {pct(p.n / total)}</span>{/each}
  </div>
{/if}

<style>
  .curve { border: 1px solid var(--rule); background: var(--surface); }
  .curve svg { display: block; width: 100%; height: auto; }
  .legend { margin-top: 6px; }
</style>
