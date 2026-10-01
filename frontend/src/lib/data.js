// The data the page draws from: static JSON files published beside the app.
import { decodeTerrain, decodeLines, decodeTrees } from "./terrain.js";

const BASE = import.meta.env.BASE_URL + "data/";

async function getJson(name) {
  try {
    const r = await fetch(BASE + name);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// rings arrive delta-encoded in 1e-5 degree steps from an origin
export function decodeFootprints(d) {
  if (!d || !d.rings) return null;
  const o = d.origin, k = d.scale;
  return d.rings.map((e, i2) => {
    const pts = [];
    let x = e[0], y = e[1];
    pts.push([o[0] + x * k, o[1] + y * k]);
    for (let i = 2; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; pts.push([o[0] + x * k, o[1] + y * k]); }
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    return { p: pts, b: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
             h: d.heights ? (d.heights[i2] || 0) : 0 };   // metres; 0 = no 2009 height
  });
}

// Every file loads on its own; whatever fails leaves its slot null and the
// rest of the tool still works.
export async function loadAll() {
  const [streets, buildings, footprints, massing, records, ground, terrain, trees, sidewalks, context] = await Promise.all([
    getJson("dtes-streets.json"), getJson("sro-buildings.json"), getJson("footprints.json"),
    getJson("sro-massing.json"), getJson("sro-records.json"), getJson("dtes-ground.json"),
    getJson("dtes-terrain.json"), getJson("dtes-trees.json"), getJson("dtes-sidewalks.json"),
    getJson("dtes-context.json")
  ]);
  const mass = [];
  if (massing && massing.buildings) massing.buildings.forEach((rec) => { mass[rec.i] = rec; });
  return {
    streets: streets || null,
    surveyed: (buildings && buildings.buildings) || [],
    foot: decodeFootprints(footprints),
    mass: massing ? mass : null,
    records: (records && records.records) || {},
    ground: (ground && ground.land) ? ground : null,
    terrain: decodeTerrain(terrain),
    trees: decodeTrees(trees),
    sidewalks: decodeLines(sidewalks),
    context: decodeFootprints(context)
  };
}

export function recordOf(records, b) { return (b && records[(b.name || "").toUpperCase()]) || null; }
