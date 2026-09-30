  /* ---- export to Rhino ----
     One .3dm per building, in metres, z up, the footprint's centroid at the
     origin. The massing is the City's LiDAR parts extruded; the typical floor
     of section 02 is drawn on every residential storey, existing and proposed
     on layers of their own, with the pods of Guidelines p.5-6. The library is
     McNeel's rhino3dm, fetched only when the button is first pressed. */

  var RHINO_SRC = "https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.min.js";
  var rhinoLib = null;
  function loadRhino() {
    if (rhinoLib) return rhinoLib;
    rhinoLib = new Promise(function (res, rej) {
      if (window.rhino3dm) return res();
      var sc = document.createElement("script");
      sc.src = RHINO_SRC;
      sc.onload = function () { res(); };
      sc.onerror = function () { rhinoLib = null; rej(new Error("rhino3dm did not load")); };
      document.head.appendChild(sc);
    }).then(function () { return window.rhino3dm(); });
    return rhinoLib;
  }
  function rhinoExportable(i) {
    if (i == null) return false;
    var b = SURVEYED[i], mrec = MASS && MASS[i];
    var ring = (b.foot != null && FOOT && FOOT[b.foot]) ? FOOT[b.foot].p : b.poly;
    return !!((mrec && mrec.parts.length) || (ring && ring.length >= 3));
  }
  function rhinoNote(txt) { var el = document.getElementById("rh-note"); if (el) el.textContent = txt; }

  function exportRhino(i) {
    var b = SURVEYED[i];
    if (!b || !rhinoExportable(i)) return;
    rhinoNote("Loading the Rhino library…");
    loadRhino().then(function (rhino) {
      var out = buildRhinoFile(rhino, i);
      var blob = new Blob([out.bytes], { type: "application/octet-stream" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (b.name || "sro").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".3dm";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      rhinoNote("Saved " + a.download + ": " + out.count + " objects on " + out.layers + " layers, metres.");
    }).catch(function (e) {
      rhinoNote("Export failed: " + (e && e.message ? e.message : e));
      if (window.console) console.error(e);
    });
  }

  function buildRhinoFile(rhino, i) {
    var b = SURVEYED[i], mrec = MASS && MASS[i], p = typicalPlan(i);
    var ring = (b.foot != null && FOOT && FOOT[b.foot]) ? FOOT[b.foot].p : b.poly;
    var lon0 = p ? p.lon0 : ring[0][0], lat0 = p ? p.lat0 : ring[0][1];
    // origin: the footprint's centroid, so the model lands near 0,0
    var foot = localXY(ring, lon0, lat0), cx = 0, cy = 0;
    foot.forEach(function (q) { cx += q[0]; cy += q[1]; });
    cx /= foot.length; cy /= foot.length;
    function toXY(lonlat) { var q = localXY([lonlat], lon0, lat0)[0]; return [q[0] - cx, q[1] - cy]; }
    function uvXY(u, v) {
      var r = p.rect, uu = u + r.u0, vv = v + r.v0;
      return [uu * r.ux + vv * r.vx - cx, uu * r.uy + vv * r.vy - cy];
    }

    var doc = new rhino.File3dm();
    doc.settings().modelUnitSystem = rhino.UnitSystem.Meters;
    doc.applicationName = "SRA Conversion Optimizer";
    var layers = {}, count = 0;
    function layer(name, rgb) {
      if (layers[name] !== undefined) return layers[name];
      var L = new rhino.Layer(); L.name = name; L.color = { r: rgb[0], g: rgb[1], b: rgb[2], a: 255 };
      layers[name] = doc.layers().add(L);
      return layers[name];
    }
    function attrs(name, objName) {
      var a = new rhino.ObjectAttributes(); a.layerIndex = layer(name, LAYER_RGB[name] || [90, 90, 90]);
      if (objName) a.name = objName;
      return a;
    }
    var LAYER_RGB = { "Site outline": [30, 35, 32], "Massing": [140, 140, 140], "Storeys": [190, 190, 190],
                      "Typical floor - existing": [76, 84, 80], "Typical floor - proposed": [63, 125, 92],
                      "Proposed - pods": [150, 150, 150], "Labels": [125, 132, 126] };
    function polyline(pts, z, closed) {
      var pl = new rhino.Polyline();
      pts.forEach(function (q) { pl.add(q[0], q[1], z); });
      if (closed) pl.add(pts[0][0], pts[0][1], z);
      return pl.toPolylineCurve();
    }
    function ccw(pts) {
      var a = 0;
      for (var k = 0, j = pts.length - 1; k < pts.length; j = k++) a += (pts[j][0] + pts[k][0]) * (pts[j][1] - pts[k][1]);
      return a < 0 ? pts : pts.slice().reverse();     // shoelace here is negative for counter-clockwise
    }
    function add(geo, ly, name) { doc.objects().add(geo, attrs(ly, name)); count++; }
    function rect(u, v, w, d) { return [uvXY(u, v), uvXY(u + w, v), uvXY(u + w, v + d), uvXY(u, v + d)]; }
    function dot(text, xy, z, ly) { add(new rhino.TextDot(text, [xy[0], xy[1], z]), ly || "Labels"); }

    // site outline at grade
    add(polyline(foot.map(function (q) { return [q[0] - cx, q[1] - cy]; }), 0, true), "Site outline", b.name + " footprint");

    // massing: each LiDAR part extruded to its height; the footprint stands in where there is none
    var parts = (mrec && mrec.parts.length) ? mrec.parts.map(function (pt) {
      return { pts: pt.r.map(toXY), h: pt.h || NOMINAL_H, name: (pt.est ? "estimated" : "LiDAR") + " part, " + (pt.h || NOMINAL_H) + " m" + (pt.roof ? ", roof " + pt.roof.toLowerCase() : "") };
    }) : [{ pts: foot.map(function (q) { return [q[0] - cx, q[1] - cy]; }), h: b.hgtM || floorsOf(b) * FLOOR_M, name: (b.hgtM ? "LiDAR height " : "assumed height ") + (b.hgtM || floorsOf(b) * FLOOR_M) + " m" }];
    parts.forEach(function (pt) {
      var crv = polyline(ccw(pt.pts), 0, true);
      var ext = rhino.Extrusion.create(crv, pt.h, true);
      if (ext) add(ext, "Massing", pt.name); else add(crv, "Massing", pt.name);
    });

    // storeys: the plan outline at every floor level, ground up
    var storeys = floorsOf(b), res = residentialFloors(b), first = (PLAN.groundRetail && storeys > 1) ? 1 : 0;
    if (p && p.placed) {
      var outline = p.ring.map(function (q) { return uvXY(q[0], q[1]); });
      for (var f = 0; f < storeys; f++) add(polyline(outline, f * FLOOR_M, true), "Storeys", "floor " + (f + 1) + " at " + (f * FLOOR_M).toFixed(1) + " m");

      // the two plans from the editor's state, loading the building first if section 02 holds another
      if (loadedFor !== i) loadPlanIntoEditor(i, optimumFor(i, readBuilding === "strict"));
      var gE = planFromState(i, true), gP = planFromState(i, false);
      var cv = p.dbl ? p.depth : p.W - p.corridor;
      for (var k = 0; k < res; k++) {
        var z = (first + k) * FLOOR_M, label = k === 0;
        // circulation, shared by both schemes
        add(polyline(rect(p.stair, cv, p.L - p.stair, p.corridor), z, true), "Storeys", "corridor");
        if (p.stair) add(polyline(rect(0, 0, p.stair, p.W), z, true), "Storeys", "stair");
        if (gE) gE.rooms.forEach(function (r) {
          add(polyline(rect(r.u, r.v, r.w, r.d), z, true), "Typical floor - existing", "room " + r.n + ", " + Math.round(r.sf) + " SF");
          if (label) dot(r.n + " · " + Math.round(r.sf) + " SF", uvXY(r.u + r.w / 2, r.v + r.d / 2), z, "Typical floor - existing");
        });
        if (gP) drawProposed(gP, z, label);
      }
    }

    function drawProposed(g, z, label) {
      var groups = groupsOf(g.fr, g.fj), unitOf = {}, unitArea = {};
      groups.forEach(function (grp, ui) {
        var a = grp.reduce(function (t, k) { return t + g.fr[k].area; }, 0);
        grp.forEach(function (k) { unitOf[k] = ui; unitArea[k] = a; });
      });
      g.rooms.forEach(function (r) {
        var u = unitOf[r.idx];
        if (u === undefined) {
          add(polyline(rect(r.u, r.v, r.w, r.d), z, true), "Typical floor - proposed", "room " + r.n + " kept as SRA, " + Math.round(r.sf) + " SF");
          if (label) dot(r.n + " SRA · " + Math.round(r.sf) + " SF", uvXY(r.u + r.w / 2, r.v + r.d / 2), z, "Typical floor - proposed");
        }
      });
      var done = {};
      g.rooms.forEach(function (r) {
        var u = unitOf[r.idx];
        if (u === undefined || done[u]) return;
        done[u] = true;
        var mates = g.rooms.filter(function (q) { return unitOf[q.idx] === u; });
        var u0 = Math.min.apply(null, mates.map(function (q) { return q.u; })), u1 = Math.max.apply(null, mates.map(function (q) { return q.u + q.w; }));
        var name = "unit " + letter(u) + ", " + Math.round(unitArea[r.idx]) + " SF" + (mates.length > 1 ? ", rooms " + mates.map(function (q) { return q.n; }).join("+") : "");
        add(polyline(rect(u0, r.v, u1 - u0, r.d), z, true), "Typical floor - proposed", name);
        if (label) dot(letter(u) + " · " + Math.round(unitArea[r.idx]) + " SF", uvXY((u0 + u1) / 2, r.v + r.d / 2), z, "Typical floor - proposed");
        // pods at the corridor wall, as drawn in section 02: bath, door, kitchen run
        var cwY = r.side === 0 ? r.v + r.d - POD.bath[1] : r.v, kY = r.side === 0 ? r.v + r.d - POD.kitchen[1] : r.v;
        var kx0 = u0 + POD.bath[0] + 0.1 + POD.door + 0.1, kLen = Math.min(POD.kitchen[0], u1 - 0.1 - kx0);
        add(polyline(rect(u0 + 0.08, cwY, POD.bath[0] - 0.08, POD.bath[1]), z, true), "Proposed - pods", "bath " + letter(u));
        if (kLen >= POD.kitchenMin) {
          add(polyline(rect(kx0, kY, kLen, POD.kitchen[1]), z, true), "Proposed - pods", "kitchen " + letter(u));
        } else {
          var vLen = Math.min(POD.kitchen[0], r.d - 0.2), vx = u1 - 0.08 - POD.kitchen[1];
          var vy = r.side === 0 ? r.v + r.d - 0.08 - vLen : r.v + 0.08;
          add(polyline(rect(vx, vy, POD.kitchen[1], vLen), z, true), "Proposed - pods", "kitchen " + letter(u) + (vx >= kx0 && vLen >= POD.kitchenMin ? "" : " (does not fit)"));
        }
      });
    }

    // the record travels as document user text (File > Properties > Notes does not survive rhino3dm.js)
    var notes = [
      b.name + (b.addr ? ", " + b.addr : ""),
      "Exported from the SRA Conversion Optimizer on " + new Date().toISOString().slice(0, 10) + ".",
      "Units metres, z up. Origin: footprint centroid, " + (lon0 + cx / (111320 * Math.cos(lat0 * Math.PI / 180))).toFixed(6) + " E, " + (lat0 + cy / 110540).toFixed(6) + " N (WGS84); x east, y north.",
      "Massing: City of Vancouver Building Footprints 2009, LiDAR height above grade, per part. Site outline: Building Footprints 2015.",
      "Storeys at " + FLOOR_M + " m floor to floor, read from the LiDAR height" + (PLAN.groundRetail ? "; the ground floor is taken as non-residential." : "."),
      "Typical floor: rooms as drawn in section 02 of the tool, " + (p && p.placed ? p.placed + " per floor over " + res + " residential storeys" : "not drawn") + ". Existing and proposed schemes on separate layers; labels on the lowest residential floor only.",
      "Pods per SRA Conversion Guidelines p.5-6: bath 1.52 x 2.44 m, kitchen run 2.44 x 0.61 m, door 0.9 m. The Guidelines dimension only the fridge; the rest are conventional minimums.",
      "Building record: 2024 SRO Tenant Survey, Appendix B. " + (b.rooms || "?") + " rooms, " + storeys + " storeys."
    ];
    var keys = ["Building", "Exported", "Coordinates", "Massing source", "Storeys", "Typical floor", "Pods", "Record"];
    notes.forEach(function (t, k) { doc.strings().set("SRA " + (k + 1) + " " + keys[k], t); });
    dot(b.name + (b.addr ? " \u00b7 " + b.addr : "") + " \u00b7 origin", [0, 0], 0, "Site outline");
    return { bytes: doc.toByteArray(), count: count, layers: Object.keys(layers).length };
  }

  /* ---- import from Rhino ----
     The file is read in the frame the export wrote: metres or the file's own
     unit, z up, the footprint's centroid at the origin. Solids on a Massing
     layer become the building's parts on the map and set its height. Closed
     curves on the proposed-floor layer are the scheme: each rectangle is laid
     over the typical floor, the rooms under it merge into one unit of its
     area, one named "SRA" keeps its rooms, and rooms under no rectangle are
     kept. Nothing on the existing layer is read: the stock is the survey's. */

  function rhinoUnitScale(rhino, doc) {
    var v = doc.settings().modelUnitSystem, val = v && v.value !== undefined ? v.value : v;
    var U = rhino.UnitSystem, table = {};
    function put(name, m) { if (U[name] && U[name].value !== undefined) table[U[name].value] = m; }
    put("Millimeters", 0.001); put("Centimeters", 0.01); put("Meters", 1); put("Inches", 0.0254); put("Feet", 0.3048);
    return table[val] || 1;
  }
  // a closed ring of [x, y] from a curve, or null
  function rhinoRing(g, k) {
    var pts = [];
    if (g.pointCount !== undefined && g.point) {
      for (var i = 0; i < g.pointCount; i++) pts.push(g.point(i));
    } else if (g.tryGetPolyline) {
      var r = g.tryGetPolyline();
      var pl = Array.isArray(r) ? r[1] : r;
      if (pl && pl.count) for (var j = 0; j < pl.count; j++) pts.push(pl.get(j));
    }
    if (pts.length < 3) return null;
    var out = pts.map(function (q) { return [q[0] * k, q[1] * k, q[2] * k]; });
    if (Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-6) out.pop();
    return out.length >= 3 ? out : null;
  }
  // a solid's footprint and height: extrusions by their profile, anything else by its vertices
  function rhinoSolid(g, k) {
    var type = g.constructor.name;
    if (type === "Extrusion") {
      var prof = g.profile3d(0, 0), ring = prof ? rhinoRing(prof, k) : null;
      var ps = g.pathStart, pe = g.pathEnd, top = Math.max(ps[2], pe[2]) * k, hgt = Math.abs(pe[2] - ps[2]) * k;
      // a mass extruded downward, or drawn below grade, still stands its own height above it
      if (ring) return { ring: ring.map(function (q) { return [q[0], q[1]]; }), top: top > 0.5 ? top : hgt };
    }
    var verts = [];
    try {
      var vl = g.vertices();
      for (var i = 0; i < vl.count; i++) { var v = vl.get(i); verts.push(v.location ? v.location : v); }
    } catch (e) { verts = []; }
    if (!verts.length) return null;
    var zmin = Infinity, zmax = -Infinity;
    verts.forEach(function (v) { zmin = Math.min(zmin, v[2]); zmax = Math.max(zmax, v[2]); });
    var base = verts.filter(function (v) { return v[2] <= zmin + 0.3 / k; }).map(function (v) { return [v[0] * k, v[1] * k]; });
    var hull = hullOf(base);
    if (hull.length < 3) return null;
    return { ring: hull, top: zmax * k > 0.5 ? zmax * k : (zmax - zmin) * k };
  }

  function importRhino(i, file) {
    var b = SURVEYED[i], p0 = typicalPlan(i);
    if (!b || !p0 || !p0.placed) { rhinoNote("Nothing to import onto: this building has no typical floor."); return; }
    rhinoNote("Reading " + file.name + "…");
    Promise.all([loadRhino(), file.arrayBuffer()]).then(function (res) {
      var rhino = res[0], doc = rhino.File3dm.fromByteArray(new Uint8Array(res[1]));
      if (!doc) throw new Error("not a Rhino file");
      var tag = null;
      try { var st = doc.strings(); for (var q = 0; q < st.count; q++) { var kv = st.get(q); if (/SRA 1 Building/.test(kv[0])) tag = kv[1]; } } catch (e) {}
      if (tag && tag.toUpperCase().indexOf(b.name.toUpperCase()) !== 0) {
        throw new Error("this file was exported for " + tag.split(",")[0] + "; select that building and import again");
      }
      var k = rhinoUnitScale(rhino, doc);
      // the frame of the export: the old footprint's centroid in local metres
      var ring0 = (b.foot != null && FOOT && FOOT[b.foot]) ? FOOT[b.foot].p : b.poly;
      var lon0 = p0.lon0, lat0 = p0.lat0, foot0 = localXY(ring0, lon0, lat0), cx = 0, cy = 0;
      foot0.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= foot0.length; cy /= foot0.length;
      var kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
      function toLonLat(xy) { return [lon0 + (xy[0] + cx) / kx, lat0 + (xy[1] + cy) / ky]; }

      var parts = [], units = [], site = null, layers = doc.layers(), objs = doc.objects();
      for (var n = 0; n < objs.count; n++) {
        var o = objs.get(n), g = o.geometry(), a = o.attributes();
        var ln = (layers.get(a.layerIndex) || {}).name || "", name = a.name || "";
        if (/massing/i.test(ln)) {
          var sol = rhinoSolid(g, k);
          if (sol && sol.top > 0.5) parts.push({ r: sol.ring.map(toLonLat), h: Math.round(sol.top * 10) / 10, roof: "Flat", faces: [], imported: true });
        } else if (/proposed/i.test(ln) && !/pod/i.test(ln)) {
          var ring = rhinoRing(g, k);
          if (ring) units.push({ ring: ring, z: ring[0][2], keep: /kept|sra/i.test(name), name: name });
        } else if (/site/i.test(ln)) {
          var sr = rhinoRing(g, k);
          if (sr && !site) site = sr.map(function (q) { return [q[0], q[1]]; });
        }
      }
      if (!parts.length && !units.length) throw new Error("no massing solids or proposed-floor curves found; the layers are named as the export writes them");

      var note = [];
      // 1. the massing: the map takes the file's solids, and the storeys follow the tallest
      if (parts.length) {
        var top = 0; parts.forEach(function (pt) { top = Math.max(top, pt.h); });
        if (!MASS) MASS = [];
        MASS[i] = { i: i, parts: parts, heritage: MASS[i] && MASS[i].heritage };
        b.hgtM = top;
        // the outline the typical floor is read from: the site outline, or the parts together
        var newFoot = site || hullOf([].concat.apply([], parts.map(function (pt) { return localXY(pt.r, lon0, lat0).map(function (q) { return [q[0] - cx, q[1] - cy]; }); })));
        var newRing = newFoot.map(toLonLat);
        if (b.foot != null && FOOT && FOOT[b.foot]) FOOT[b.foot].p = newRing; else b.poly = newRing;
        b.imported = true;
        note.push(parts.length + " massing part" + (parts.length === 1 ? "" : "s") + ", " + top + " m");
        planCache = {}; optCache = {}; districtCands = null;
        if (M3.ready) { M3.needFoot = true; m3build(); }
      }

      // 2. the scheme: rectangles laid over the (possibly new) typical floor
      var p = typicalPlan(i);
      if (!p || !p.placed) throw new Error("the typical floor could not be drawn from the imported outline");
      loadPlanIntoEditor(i, null);
      var fr = floors[0].rooms, fj = floors[0].joints;
      var toUV = function (xy) { var lx = xy[0] + cx, ly = xy[1] + cy; return [lx * p.rect.ux + ly * p.rect.uy - p.rect.u0, lx * p.rect.vx + ly * p.rect.vy - p.rect.v0]; };
      if (units.length) {
        // the floor the user drew on: the lowest level that holds rectangles
        var z0 = Math.min.apply(null, units.map(function (u) { return u.z; }));
        var floorUnits = units.filter(function (u) { return Math.abs(u.z - z0) < 0.5; });
        var covered = {}, placed = 0, skipped = 0;
        fr.forEach(function (r) { r.keep = false; });
        for (var j = 0; j < fj.length; j++) fj[j] = false;
        floorUnits.forEach(function (u) {
          var uv = u.ring.map(function (q) { return toUV([q[0], q[1]]); });
          var umin = Infinity, umax = -Infinity, vs = 0;
          uv.forEach(function (q) { umin = Math.min(umin, q[0]); umax = Math.max(umax, q[0]); vs += q[1]; });
          var vc = vs / uv.length, side = (p.dbl && vc > p.W / 2) ? 1 : 0;
          var idx = [];
          p.rooms.forEach(function (r, kk) { if (r.side === side && r.u + r.w / 2 > umin - 0.15 && r.u + r.w / 2 < umax + 0.15 && !covered[kk]) idx.push(kk); });
          if (!idx.length) { skipped++; return; }
          idx.forEach(function (kk) { covered[kk] = true; });
          var sf = ringArea(uv) * 10.7639, tot = idx.reduce(function (t, kk) { return t + fr[kk].area; }, 0);
          if (u.keep) { idx.forEach(function (kk) { fr[kk].keep = true; }); return; }
          idx.forEach(function (kk) { fr[kk].area = Math.max(MIN_AREA, Math.min(MAX_AREA, Math.round(sf * fr[kk].area / tot))); });
          for (var q2 = 0; q2 < idx.length - 1; q2++) if (idx[q2 + 1] === idx[q2] + 1) fj[idx[q2]] = true;
          placed++;
        });
        var uncovered = 0;
        fr.forEach(function (r, kk) { if (!covered[kk]) { r.keep = true; uncovered++; } });
        note.push(placed + " unit" + (placed === 1 ? "" : "s") + " from the drawing" + (uncovered ? ", " + uncovered + " room" + (uncovered === 1 ? "" : "s") + " under no rectangle kept as SRA" : "")
          + (skipped ? ", " + skipped + " rectangle" + (skipped === 1 ? "" : "s") + " over no room ignored" : ""));
      } else {
        note.push("no proposed-floor curves, so the scheme is the search's");
      }
      typicalToAllFloors(); refresh(); pinEditor(); renderBuilding(); renderStock();
      rhinoNote("Imported " + file.name + ": " + note.join("; ") + ". The building is pinned to this drawing.");
    }).catch(function (e) {
      rhinoNote("Import failed: " + (e && e.message ? e.message : e));
      if (window.console) console.error(e);
    });
  }

/* ==== pinning: a building imported from Rhino was taken exactly as drawn ==== */
  // An edit in section 02 pins the building: the policy takes it exactly as
  // drawn, or not at all. Reset or Unpin hands it back to the search.
  function pinEditor() {
    if (surveySel === null) return;
    var ev = evaluate();
    PINNED[surveySel] = { compliant: ev.compliant, original: ev.original, units: ev.units.length, kept: ev.untouched.length, lost: ev.lost,
                          area: ev.units.reduce(function (t, u) { return t + u.area; }, 0) };
    districtCands = null; renderDistrict();
    if (!scenColour) setScenarioColour(true);     // an edit is a question about the district: let the map answer it
  }
  function unpin(i) {
    delete PINNED[i];
    districtCands = null; renderDistrict();
  }
