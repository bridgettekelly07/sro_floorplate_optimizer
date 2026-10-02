<script>
  // The building's record: Appendix B, the heritage register and whatever
  // else is known about it, with its source.
  import { floorsOf } from "../lib/typicalFloor.js";
  import { fmt } from "../lib/format.js";
  import { recordOf } from "../lib/data.js";
  import { isPrivate } from "../lib/colours.js";
  let { b, i, data, colour, onclose } = $props();

  const heritage = $derived(data.mass && data.mass[i] && data.mass[i].heritage);
  const rd = $derived(recordOf(data.records, b));
</script>

<div class="map-card" style:--pick={colour}>
  <button type="button" class="close" aria-label="Close" onclick={onclose}>&times;</button>
  <div>
    <h4><i></i>{b.name}</h4>
    <div class="addr">{b.addr}</div>
    <div class="who">{isPrivate(b) ? "Private" : "Public"}{b.surveyed ? "" : " · not surveyed"}
      {#if b.ownerType}· owned <b>{b.ownerType}</b>{/if}</div>
  </div>
  <div class="stats">
    <span><em>Rooms</em>{b.rooms}</span>
    {#if b.parcelSf}<span><em>Lot</em>{fmt(b.parcelSf)} SF</span>{/if}
    {#if b.hgtM}<span><em>Height</em>{b.hgtM} m · ≈{floorsOf(b)} storeys</span>{/if}
  </div>
  {#if heritage}
    <div class="why">Vancouver Heritage Register{heritage.group ? ", evaluation group " + heritage.group : ""}{heritage.name && heritage.name.toUpperCase() !== b.name.toUpperCase() ? ", listed as “" + heritage.name + "”" : ""}{heritage.flags.length ? " · " + heritage.flags.join(", ") : ""}.</div>
  {/if}
  {#if rd}
    <div class="record"><div class="label">Record{rd.selfContained ? " · already self-contained" : ""}</div>
      {#each rd.facts || [] as f}
        <div class="fact">{f.text} <span class="cite">{#if f.url}<a href={f.url} target="_blank" rel="noopener">{f.source}</a>{:else}{f.source}{/if}{f.retrieved ? ", read " + f.retrieved : ""}</span></div>
      {/each}
    </div>
  {/if}
  {#if b.note}<div class="why">{b.surveyed ? "" : "Not surveyed: "}{b.note}. <span class="cite">2024 SRO Tenant Survey, Appendix B.</span></div>{/if}
  {#if !b.parcelSf}<div class="why">No parcel matched this address, so the point sits on its hundred block.</div>{/if}
</div>

<style>
  .map-card { position: relative; border-left: 4px solid var(--pick, var(--ink-3)); padding: 0 0 12px 10px; margin-bottom: 12px;
    border-bottom: 1px solid var(--rule); display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px 18px; align-items: start; }
  .close { display: none; }
  h4 { margin: 0; font-family: "IBM Plex Sans Condensed", sans-serif; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 7px; }
  h4 i { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--pick, var(--ink-3)); }
  .addr { font-size: 12px; color: var(--ink-2); }
  .who { font-family: "IBM Plex Sans Condensed", sans-serif; text-transform: uppercase; letter-spacing: 0.07em; font-size: 10px; color: var(--ink-3); margin-top: 2px; }
  .who b { color: var(--ink-2); font-weight: 600; }
  .stats { display: flex; flex-wrap: wrap; gap: 3px 16px; font-variant-numeric: tabular-nums; font-size: 12px;
    justify-content: flex-start; border: 1px solid var(--rule); padding: 6px 10px; margin-top: 6px; }
  .stats span { display: flex; gap: 5px; align-items: baseline; }
  .stats em { font-style: normal; color: var(--ink-3); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; }
  .why { font-size: 11.5px; color: var(--ink-2); font-style: italic; }
  .record { border: 1px solid var(--rule); padding: 8px 10px; margin-top: 6px; }
  .record .label { margin-bottom: 4px; }
  .record .fact { font-size: 12px; color: var(--ink-2); margin: 3px 0; }
  .record .cite, .why .cite { font-size: 11px; color: var(--ink-3); font-style: normal; }
  .record .cite a { color: var(--ink-3); }
</style>
