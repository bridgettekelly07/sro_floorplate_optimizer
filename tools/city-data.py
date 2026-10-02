#!/usr/bin/env python3
"""Build the ground the 3D map draws, for an extent wider than the SRO stock
so the district reads as part of the city rather than an island of data.

City of Vancouver Open Data, Open Government Licence - Vancouver. Outputs, all
into frontend/public/data and all for the CONTEXT extent below:

  dtes-streets.json    public-streets: centrelines by use, with hundred-block names
  dtes-ground.json     parks-polygon-representation and lanes
  dtes-terrain.json    1-metre contours -> a heightfield; shoreline-2002 -> a land mask; the contours to draw
  dtes-trees.json      public-trees: position, height, trunk diameter
  dtes-sidewalks.json  sidewalk-condition-rating: the sidewalk centrelines
  dtes-rail.json       railways: the rail centrelines
  dtes-context.json    building-footprints-2009 outside the surveyed extent, with LiDAR heights

footprints.json (2015 footprints over the surveyed extent, which the SRO records index into)
and the sro-*.json files are not touched.

Stdlib only. Downloads are cached; pass --cache DIR to choose where.
Run from the repository root:  python3 tools/city-data.py
"""
import base64, json, math, os, struct, sys, urllib.parse, urllib.request
from collections import deque

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "frontend", "public", "data")
CACHE = sys.argv[sys.argv.index("--cache") + 1] if "--cache" in sys.argv else os.path.join(ROOT, ".cache", "city")
API = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/"
RETRIEVED = "2026-09-30"

# the context: the downtown peninsula, False Creek and the blocks east to Clark Drive
CONTEXT = [-123.165, 49.252, -123.040, 49.305]           # [lon0, lat0, lon1, lat1]
# the surveyed extent the 2015 footprints already cover
INNER = json.load(open(os.path.join(OUT, "footprints.json")))
INNER_BBOX = None
LAT0 = (CONTEXT[1] + CONTEXT[3]) / 2
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540     # metres per degree
W_M, H_M = (CONTEXT[2] - CONTEXT[0]) * KX, (CONTEXT[3] - CONTEXT[1]) * KY
CELL = 15.0                                                 # heightfield cell, metres
MASK = 6.0                                                  # land mask cell, metres
NX, NY = int(W_M / CELL) + 1, int(H_M / CELL) + 1
MX, MY = int(W_M / MASK) + 1, int(H_M / MASK) + 1
LAND_SEEDS = [(-123.1007, 49.2814), (-123.1347, 49.2710), (-123.150, 49.265), (-123.140, 49.300), (-123.100, 49.260), (-123.060, 49.280)]

def fetch(name, dataset, fmt, extra=""):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        where = "in_bbox(geom,%f,%f,%f,%f)" % (CONTEXT[1], CONTEXT[0], CONTEXT[3], CONTEXT[2])
        url = API + dataset + "/exports/" + fmt + ("?where=" + urllib.parse.quote(where) + extra if fmt != "whole" else "")
        if fmt == "whole": url = API + dataset + "/exports/geojson"
        print("fetching", dataset); urllib.request.urlretrieve(url, path)
    return json.load(open(path))

def mx(lon): return (lon - CONTEXT[0]) * KX
def my(lat): return (lat - CONTEXT[1]) * KY
def lon_of(x): return x / KX + CONTEXT[0]
def lat_of(y): return y / KY + CONTEXT[1]
def r5(v): return round(v, 5)

def simplify(pts, tol):
    """Douglas-Peucker on [x, y] metres."""
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
    best, bi = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dx * (a[1] - pts[i][1]) - dy * (a[0] - pts[i][0])) / L
        if d > best: best, bi = d, i
    if best > tol: return simplify(pts[:bi + 1], tol)[:-1] + simplify(pts[bi:], tol)
    return [a, b]

def simplify_any(pts, tol):
    """Rings close on their first point, which a straight Douglas-Peucker collapses:
    split a closed line at its farthest point from the start and simplify the halves."""
    if len(pts) > 3 and pts[0] == pts[-1]:
        far = max(range(1, len(pts) - 1), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
        return simplify(pts[:far + 1], tol)[:-1] + simplify(pts[far:], tol)
    return simplify(pts, tol)

def to_m(coords): return [[mx(p[0]), my(p[1])] for p in coords]
def to_deg(pts): return [[r5(lon_of(p[0])), r5(lat_of(p[1]))] for p in pts]

def encode_lines(lines_deg, scale=1e-5):
    out = []
    for pts in lines_deg:
        if len(pts) < 2: continue
        e, px, py = [], 0, 0
        for k, (lon, lat) in enumerate(pts):
            x, y = round((lon - CONTEXT[0]) / scale), round((lat - CONTEXT[1]) / scale)
            e += [x, y] if k == 0 else [x - px, y - py]; px, py = x, y
        out.append(e)
    return out

def lines_of(geom):
    if geom["type"] == "LineString": return [geom["coordinates"]]
    if geom["type"] == "MultiLineString": return geom["coordinates"]
    return []
def rings_of(geom):
    if geom["type"] == "Polygon": return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon": return [p[0] for p in geom["coordinates"]]
    return []

# ---- streets -----------------------------------------------------------------
USE = {"Residential": 0, "Collector": 1, "Secondary Arterial": 1, "Arterial": 2}
segs = []
for f in fetch("ctx-streets.geojson", "public-streets", "geojson")["features"]:
    u = USE.get(f["properties"].get("streetuse"))
    if u is None: continue
    for c in lines_of(f["geometry"]):
        segs.append({"u": u, "h": f["properties"].get("hblock") or "", "c": to_deg(simplify_any(to_m(c), 0.8))})
print("streets", len(segs))
json.dump({
    "source": "City of Vancouver Open Data, 'Public streets' (public-streets), the downtown peninsula, False Creek and the blocks east to Clark Drive. Retrieved " + RETRIEVED + ".",
    "licence": "Open Government Licence - Vancouver",
    "bbox": CONTEXT, "streetuse": {"0": "Residential or collector", "1": "Secondary arterial", "2": "Arterial"}, "segments": segs
}, open(os.path.join(OUT, "dtes-streets.json"), "w"), separators=(",", ":"))

# ---- parks and lanes -----------------------------------------------------------
parks = []
for f in fetch("ctx-parks.geojson", "parks-polygon-representation", "geojson")["features"]:
    for r in rings_of(f["geometry"]):
        parks.append({"n": f["properties"].get("park_name") or "", "r": to_deg(simplify_any(to_m(r), 1.5))})
lanes = [to_deg(simplify_any(to_m(c), 0.8)) for f in fetch("ctx-lanes.geojson", "lanes", "geojson")["features"] for c in lines_of(f["geometry"])]
print("parks", len(parks), "lanes", len(lanes))
json.dump({
    "source": "City of Vancouver Open Data: 'Parks' (parks-polygon-representation) and 'Lanes' (lanes) within the context extent. The land itself is the mask in dtes-terrain.json. Retrieved " + RETRIEVED + ".",
    "licence": "Open Government Licence - Vancouver",
    "bbox": CONTEXT, "land": [], "parks": parks, "lanes": lanes
}, open(os.path.join(OUT, "dtes-ground.json"), "w"), separators=(",", ":"))

# ---- the land mask, flood-filled from the shoreline ------------------------------
mask = bytearray(MX * MY)         # 0 water, 1 land, 2 shoreline
def plot(x0, y0, x1, y1):
    """Bresenham in mask cells."""
    dx, dy = abs(x1 - x0), -abs(y1 - y0); sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1); err = dx + dy
    while True:
        if 0 <= x0 < MX and 0 <= y0 < MY: mask[y0 * MX + x0] = 2
        if x0 == x1 and y0 == y1: break
        e2 = 2 * err
        if e2 >= dy: err += dy; x0 += sx
        if e2 <= dx: err += dx; y0 += sy
for f in fetch("ctx-shoreline.geojson", "shoreline-2002", "whole")["features"]:
    for c in lines_of(f["geometry"]):
        pts = [(int(mx(p[0]) // MASK), int(my(p[1]) // MASK)) for p in c]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if max(x0, x1) < 0 or min(x0, x1) >= MX or max(y0, y1) < 0 or min(y0, y1) >= MY: continue
            plot(x0, y0, x1, y1)
q = deque()
for lon, lat in LAND_SEEDS:
    i, j = int(mx(lon) // MASK), int(my(lat) // MASK)
    if 0 <= i < MX and 0 <= j < MY and mask[j * MX + i] == 0: mask[j * MX + i] = 1; q.append((i, j))
while q:
    i, j = q.popleft()
    for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        a, b = i + di, j + dj
        if 0 <= a < MX and 0 <= b < MY and mask[b * MX + a] == 0: mask[b * MX + a] = 1; q.append((a, b))
land_cells = sum(1 for v in mask if v)
print("land mask", MX, "x", MY, "land share %.0f%%" % (100 * land_cells / (MX * MY)))
# run-length rows: alternating water, land, water... lengths
rows = []
for j in range(MY):
    runs, cur, n = [], 0, 0
    for i in range(MX):
        v = 1 if mask[j * MX + i] else 0
        if v == cur: n += 1
        else: runs.append(n); cur = v; n = 1
    runs.append(n); rows.append(runs)
def is_land(x, y):
    i, j = int(x // MASK), int(y // MASK)
    return 0 <= i < MX and 0 <= j < MY and mask[j * MX + i] != 0

# ---- terrain -----------------------------------------------------------------
contours = fetch("ctx-contours.geojson", "elevation-contour-lines-1-metre-contours", "geojson")["features"]
lines = [(f["properties"]["elevation"], simplify_any(to_m(f["geometry"]["coordinates"]), 1.5)) for f in contours]
print("contours", len(lines), "vertices", sum(len(p) for _, p in lines))
BIN = 40.0
bins = {}
for z, pts in lines:
    dense = []
    for i in range(len(pts)):
        dense.append(pts[i])
        if i + 1 < len(pts):
            a, b = pts[i], pts[i + 1]; n = int(math.hypot(b[0] - a[0], b[1] - a[1]) / 8)
            for k in range(1, n): t = k / n; dense.append([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    for x, y in dense: bins.setdefault((int(x // BIN), int(y // BIN)), []).append((x, y, z))
def height_at(x, y):
    bx, by = int(x // BIN), int(y // BIN)
    for r in (1, 2, 4, 8):
        near = {}
        for i in range(bx - r, bx + r + 1):
            for j in range(by - r, by + r + 1):
                for px, py, z in bins.get((i, j), ()):
                    d = (px - x) ** 2 + (py - y) ** 2
                    if z not in near or d < near[z]: near[z] = d
        if len(near) >= 2:
            (z1, d1), (z2, d2) = sorted(near.items(), key=lambda kv: kv[1])[:2]
            d1, d2 = math.sqrt(d1), math.sqrt(d2)
            return z1 if d1 < 1e-6 else (z1 * d2 + z2 * d1) / (d1 + d2)
        if len(near) == 1 and r >= 4: return next(iter(near))
    return None
grid, missing = [], 0
for j in range(NY):
    for i in range(NX):
        x, y = i * CELL, j * CELL
        if not is_land(x, y): grid.append(-3.0); continue
        h = height_at(x, y)
        if h is None: h = 0.0; missing += 1
        grid.append(h)
    if j % 60 == 0: print("  row", j, "of", NY)
print("heightfield", NX, "x", NY, "missing", missing, "range %.1f %.1f" % (min(grid), max(grid)))
packed = struct.pack("<%dH" % len(grid), *[max(0, min(65535, int(round((h + 10) * 10)))) for h in grid])
draw = [(z, to_deg(simplify_any(pts, 3.0))) for z, pts in lines if abs(z % 2) < 1e-6]   # every second metre is drawn; all of them shape the ground
json.dump({
    "source": "City of Vancouver Open Data: 'Elevation contour lines - 1-metre contours' (elevation-contour-lines-1-metre-contours) and 'Shoreline 2002' (shoreline-2002), the context extent. The heightfield interpolates linearly between the two nearest contour levels at each cell; the land mask is the shoreline flood-filled from known land, and water cells sit below sea level. Retrieved " + RETRIEVED + ".",
    "licence": "Open Government Licence - Vancouver",
    "bbox": CONTEXT, "cell": CELL, "nx": NX, "ny": NY, "unit": "decimetres, offset by 100 (value 100 = 0 m)",
    "heights": base64.b64encode(packed).decode("ascii"),
    "land": {"cell": MASK, "nx": MX, "ny": MY, "rows": rows, "note": "run lengths per row from the south-west corner, water first"},
    "contours": {"origin": [CONTEXT[0], CONTEXT[1]], "scale": 1e-5, "levels": [z for z, _ in draw], "lines": encode_lines([pts for _, pts in draw])}
}, open(os.path.join(OUT, "dtes-terrain.json"), "w"), separators=(",", ":"))

# ---- trees -------------------------------------------------------------------
trees = fetch("ctx-trees.json", "public-trees", "json", "&select=height_m,diameter_cm,geo_point_2d")
cols = {"x": [], "y": [], "h": [], "d": []}
px = py = 0
for t in sorted(trees, key=lambda t: (t["geo_point_2d"]["lon"], t["geo_point_2d"]["lat"])):
    p = t["geo_point_2d"]
    x, y = round((p["lon"] - CONTEXT[0]) / 1e-5), round((p["lat"] - CONTEXT[1]) / 1e-5)
    cols["x"].append(x - px); cols["y"].append(y - py); px, py = x, y
    cols["h"].append(round((t.get("height_m") or 6) * 2))
    cols["d"].append(int(round(t.get("diameter_cm") or 15)))
print("trees", len(cols["x"]))
json.dump({
    "source": "City of Vancouver Open Data, 'Public trees' (public-trees), the context extent: street and park trees the City maintains, with the height class and trunk diameter it records. Retrieved " + RETRIEVED + ".",
    "licence": "Open Government Licence - Vancouver",
    "origin": [CONTEXT[0], CONTEXT[1]], "scale": 1e-5, "unit": "h in half metres, d in centimetres; x and y delta-encoded", **cols
}, open(os.path.join(OUT, "dtes-trees.json"), "w"), separators=(",", ":"))

# ---- sidewalks ---------------------------------------------------------------
sw_lines = [to_deg(simplify_any(to_m(c), 0.5)) for f in fetch("ctx-sidewalks.geojson", "sidewalk-condition-rating", "geojson")["features"] for c in lines_of(f["geometry"])]
print("sidewalks", len(sw_lines))
json.dump({
    "source": "City of Vancouver Open Data, 'Sidewalk condition rating 2021' (sidewalk-condition-rating), the context extent: the centreline of every sidewalk segment the City rated, used for where the sidewalks are and not for their condition. Retrieved " + RETRIEVED + ".",
    "licence": "Open Government Licence - Vancouver",
    "origin": [CONTEXT[0], CONTEXT[1]], "scale": 1e-5, "lines": encode_lines(sw_lines)
}, open(os.path.join(OUT, "dtes-sidewalks.json"), "w"), separators=(",", ":"))

# ---- railways ----------------------------------------------------------------
rail_lines = [to_deg(simplify_any(to_m(c), 0.5)) for f in fetch("ctx-railways.geojson", "railways", "geojson") ["features"] for c in lines_of(f["geometry"])]
print("railways", len(rail_lines))
json.dump({
    "source": "City of Vancouver Open Data, 'Railways' (railways), the context extent: the rail centrelines, drawn as light lines on the ground. Retrieved " + RETRIEVED + ".",
    "licence": "Open Government Licence - Vancouver",
    "origin": [CONTEXT[0], CONTEXT[1]], "scale": 1e-5, "lines": encode_lines(rail_lines)
}, open(os.path.join(OUT, "dtes-rail.json"), "w"), separators=(",", ":"))

# ---- context footprints: 2009, with heights, outside the surveyed extent -----------
# the surveyed extent is the 2015 footprints' bounding box
o, k = INNER["origin"], INNER["scale"]
xs, ys = [], []
for e in INNER["rings"]:
    x, y = e[0], e[1]; xs.append(x); ys.append(y)
    for i in range(2, len(e), 2): x += e[i]; y += e[i + 1]; xs.append(x); ys.append(y)
INNER_BBOX = [o[0] + min(xs) * k, o[1] + min(ys) * k, o[0] + max(xs) * k, o[1] + max(ys) * k]
rings, heights, kept = [], [], 0
for f in fetch("ctx-footprints2009.geojson", "building-footprints-2009", "geojson", "&select=hgt_agl,area_m2,geom")["features"]:
    if (f["properties"].get("area_m2") or 0) < 25: continue
    for r in rings_of(f["geometry"]):
        cx = sum(p[0] for p in r) / len(r); cy = sum(p[1] for p in r) / len(r)
        if INNER_BBOX[0] <= cx <= INNER_BBOX[2] and INNER_BBOX[1] <= cy <= INNER_BBOX[3]: continue
        s = to_deg(simplify_any(to_m(r), 1.0))
        if len(s) < 4: continue
        rings.append(s); heights.append(round(f["properties"].get("hgt_agl") or 0, 1)); kept += 1
print("context footprints", kept, "of the extent's", "inner bbox", [round(v, 4) for v in INNER_BBOX])
json.dump({
    "source": "City of Vancouver Open Data, 'Building Footprints 2009' (building-footprints-2009), the context extent outside the surveyed extent that footprints.json covers, with each footprint's LiDAR height (hgt_agl). Simplified to ~1 m, footprints under 25 m2 dropped. Retrieved " + RETRIEVED + ".",
    "licence": "Open Government Licence - Vancouver",
    "origin": [CONTEXT[0], CONTEXT[1]], "scale": 1e-5, "encoding": "each ring: first vertex absolute, then deltas, in 1e-5 degree steps",
    "rings": encode_lines(rings), "heights": heights
}, open(os.path.join(OUT, "dtes-context.json"), "w"), separators=(",", ":"))
print("done")
