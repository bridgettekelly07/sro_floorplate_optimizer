/* ==== address to hundred block ==== */
  function geocode(addr) {
    if (!STREETS || !addr) return null;
    var key = addr.trim().toUpperCase().replace(/\s+/g, " ");
    if (STREETS.hblocks[key]) return STREETS.hblocks[key].slice();
    // round the street number down to its hundred block, then match
    var m = key.match(/^(\d+)\s+(.*)$/);
    if (m) {
      var hb = (Math.floor(parseInt(m[1], 10) / 100) * 100) + " " + m[2];
      if (STREETS.hblocks[hb]) return STREETS.hblocks[hb].slice();
    }
    return null;
  }

/* ==== the records drawn on the flat map ==== */
    // the user's own records, sized by room count
    var maxRooms = Math.max.apply(null, buildings.map(function (b) { return b.rooms || 0 }).concat([1]));
    buildings.forEach(function (b) {
      if (b.lon == null || b.lat == null) return;
      var x = PROJ.x(b.lon), y = PROJ.y(b.lat);
      var r = (6 + 14 * Math.sqrt((b.rooms || 1) / maxRooms)) * z;
      var sel = bSelected === b.id;
      parts.push('<circle data-id="' + esc(b.id) + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1)
        + '" r="' + r.toFixed(1) + '" fill="' + (sel ? "var(--map-dot-sel)" : "var(--map-dot)")
        + '" fill-opacity="0.75" stroke="var(--surface)" stroke-width="' + (2 * z).toFixed(2) + '" style="cursor:pointer"/>');
    });

/* ==== the store: db when the viewer has it, memory otherwise ==== */
  /* ---- store: db when the viewer has it, memory otherwise ---- */

  function storeNote(txt) { document.getElementById("b-store-note").textContent = txt; }

  function initStore() {
    if (!window.claude || !window.claude.use) { storeNote(memoryNote()); renderStock(); return; }
    window.claude.use("db").then(function (db) {
      if (!db) { storeNote(memoryNote()); renderStock(); return; }
      DB = db; dbReady = true;
      storeNote("Saved for everyone who can open this page.");
      db.collection("buildings").onSnapshot(function (snap) {
        buildings = (snap.docs || []).map(function (d) {
          var v = d.data ? d.data() : d;
          v.id = d.id || v.id;
          return v;
        });
        renderStock();
      }, function () { storeNote(memoryNote()); renderStock(); });
    }).catch(function () { storeNote(memoryNote()); renderStock(); });
  }

  function memoryNote() {
    return "Not saved: this view has no store, so buildings last only until the page is reloaded. "
      + "Use Export to keep them.";
  }

  function saveBuilding(b) {
    if (DB) {
      DB.doc("buildings/" + b.id).set(b).catch(function () {});
      return;
    }
    var i = buildings.findIndex(function (x) { return x.id === b.id; });
    if (i >= 0) buildings[i] = b; else buildings.push(b);
    renderStock();
  }

  function deleteBuilding(id) {
    if (DB) { DB.doc("buildings/" + id).delete().catch(function () {}); }
    buildings = buildings.filter(function (b) { return b.id !== id; });
    if (bSelected === id) bSelected = null;
    renderStock();
  }

/* ==== the recorded-buildings list and the Appendix B pick (renderStock as it was) ==== */
  function renderStock() {
    var list = document.getElementById("b-list");
    list.textContent = "";
    buildings.slice().sort(function (a, b) {
      return (a.name || "").localeCompare(b.name || "");
    }).forEach(function (b) {
      var el = document.createElement("div");
      el.className = "bldg" + (bSelected === b.id ? " sel" : "");
      var sfPer = (b.plate && b.rooms) ? b.plate / b.rooms : null;
      var perSf = (b.rent && sfPer) ? b.rent / sfPer : null;
      el.innerHTML = '<b>' + esc(b.name || "Untitled") + '</b>'
        + '<span class="rooms">' + (b.rooms != null ? b.rooms + " rm" : "—") + '</span>'
        + '<span class="meta">' + esc(b.addr || "no address")
        + (sfPer ? " · " + Math.round(sfPer) + " SF/room" : "")
        + (perSf ? " · $" + perSf.toFixed(2) + "/SF" : "")
        + (b.tenancy != null ? " · " + b.tenancy + " yr" : "") + '</span>';
      el.addEventListener("click", function () { selectBuilding(b.id); });
      list.appendChild(el);
    });

    var pick = document.getElementById("survey-pick");
    if (pick) {
      if (surveySel !== null && SURVEYED[surveySel]) {
        var sb = SURVEYED[surveySel];
        pick.innerHTML = '<div class="label">From Appendix B</div>'
          + '<div class="bldg sel" style="cursor:default"><b>' + esc(sb.name) + '</b>'
          + '<span class="rooms">' + sb.rooms + ' rm</span>'
          + '<span class="meta">' + esc(sb.addr) + ' \u00b7 ' + esc(sb.tenure)
          + (sb.surveyed ? " \u00b7 " + sb.surveys + " surveys" : "")
          + (sb.parcelSf ? " \u00b7 lot " + fmt(sb.parcelSf) + " SF" : "")
          + (sb.hgtM ? " \u00b7 " + sb.hgtM + " m" : "")
          + (sb.approx ? " \u00b7 placed approximately" : "")
          + (sb.note ? '</span><span class="meta">' + esc(sb.note) : "")
          + '</span></div>';
      } else { pick.innerHTML = ""; }
    }
    var ctx = document.getElementById("survey-ctx");
    if (ctx) {
      var placed = SURVEYED.length;
      ctx.textContent = placed
        ? "Coloured points: the " + placed + " SRO buildings listed in Appendix B of the 2024 SRO "
          + "Tenant Survey, placed from their addresses on the City street grid. Private red, "
          + "public green, not surveyed grey; area \u221d rooms. Click one to load it below. "
          + "The 3D button raises every footprint to the height the City's LiDAR measured."
        : "2024 SRO Tenant Survey: " + SURVEY.buildings + " buildings and " + SURVEY.respondents
          + " tenants surveyed.";
    }
    var rooms = buildings.reduce(function (s, b) { return s + (b.rooms || 0); }, 0);
    var sTotal = SURVEYED.length, sRooms = SURVEYED.reduce(function (t, b) { return t + (b.rooms || 0); }, 0);
    document.getElementById("stock-summary").textContent = buildings.length
      ? buildings.length + " of your own \u00b7 " + sTotal + " from Appendix B"
      : (sTotal ? sTotal + " buildings \u00b7 " + sRooms.toLocaleString("en-CA") + " rooms" : "");
    document.getElementById("b-export").disabled = !buildings.length;
    drawMap();
  }

/* ==== selecting one of the records ==== */
  function selectBuilding(id) {
    surveySel = null;
    renderCard();
    bSelected = (bSelected === id) ? null : id;
    var b = buildings.filter(function (x) { return x.id === id; })[0];
    if (bSelected && b) {
      // a selected building sets the starting condition for sections 02-04
      if (b.rooms) document.getElementById("u-count").value = b.rooms;
      if (b.plate && b.rooms) document.getElementById("u-sf").value = Math.round(b.plate / b.rooms);
      if (b.tenancy != null) document.getElementById("u-ten").value = b.tenancy;
      if (b.rent) document.getElementById("r-existing").value = b.rent;
      if (b.plate && b.rooms) document.getElementById("r-existing-sf").value = Math.round(b.plate / b.rooms);
      renderBreakdown();
      renderAfford();
    }
    renderStock();
  }

/* ==== the record form, its address hint, and CSV export ==== */
  /* ---- the record form ---- */

  var form = document.getElementById("b-form");

  function openForm(b) {
    bEditing = b || null;
    formCoords = b && b.lon != null ? [b.lon, b.lat] : null;
    document.getElementById("b-list-wrap").hidden = true;
    form.hidden = false;
    document.getElementById("f-name").value = b ? (b.name || "") : "";
    document.getElementById("f-addr").value = b ? (b.addr || "") : "";
    document.getElementById("f-rooms").value = b && b.rooms != null ? b.rooms : "";
    document.getElementById("f-floors").value = b && b.floors != null ? b.floors : "";
    document.getElementById("f-plate").value = b && b.plate != null ? b.plate : "";
    document.getElementById("f-rent").value = b && b.rent != null ? b.rent : "";
    document.getElementById("f-ten").value = b && b.tenancy != null ? b.tenancy : "";
    document.getElementById("f-delete").hidden = !b;
    document.getElementById("f-addr-hint").textContent =
      "Matched against the hundred-block index, or click the map to place";
    setPlacing(!b);
    document.getElementById("f-name").focus();
  }

  function closeForm() {
    form.hidden = true;
    document.getElementById("b-list-wrap").hidden = false;
    setPlacing(false);
    bEditing = null;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var addr = document.getElementById("f-addr").value.trim();
    var coords = formCoords || geocode(addr);
    var b = {
      id: bEditing ? bEditing.id : ("b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      name: document.getElementById("f-name").value.trim() || "Untitled",
      addr: addr,
      rooms: num(document.getElementById("f-rooms").value),
      floors: num(document.getElementById("f-floors").value),
      plate: num(document.getElementById("f-plate").value),
      rent: num(document.getElementById("f-rent").value),
      tenancy: num(document.getElementById("f-ten").value),
      lon: coords ? coords[0] : null,
      lat: coords ? coords[1] : null
    };
    saveBuilding(b);
    closeForm();
  });

  document.getElementById("f-cancel").addEventListener("click", closeForm);
  document.getElementById("f-delete").addEventListener("click", function () {
    if (bEditing) deleteBuilding(bEditing.id);
    closeForm();
  });
  document.getElementById("b-add").addEventListener("click", function () { openForm(null); });
  document.getElementById("f-addr").addEventListener("change", function () {
    var c = geocode(this.value);
    var h = document.getElementById("f-addr-hint");
    if (c) { formCoords = c; h.textContent = "Matched to a hundred block on the City street grid."; }
    else { h.textContent = "No matching hundred block — click the map to place it instead."; }
  });

  document.getElementById("b-export").addEventListener("click", function () {
    var cols = ["name", "addr", "rooms", "floors", "plate", "rent", "tenancy", "lon", "lat"];
    var rows = [cols.join(",")].concat(buildings.map(function (b) {
      return cols.map(function (c) {
        var v = b[c];
        if (v == null) return "";
        return /[",]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
      }).join(",");
    }));
    var out = rows.join("\n");
    navigator.clipboard && navigator.clipboard.writeText(out).then(function () {
      document.getElementById("b-store-note").textContent = "CSV copied to the clipboard.";
    }, function () { showImport(out); });
  });

/* ==== the survey toggle and CSV import ==== */
  document.getElementById("b-survey").addEventListener("click", function () {
    showSurveyed = !showSurveyed;
    this.classList.toggle("on", showSurveyed);
    if (!showSurveyed) surveySel = null;
    renderStock();
  });

  document.getElementById("b-import").addEventListener("click", function () { showImport(""); });

  function showImport(prefill) {
    var ta = document.createElement("textarea");
    ta.style.cssText = "width:100%;height:120px;font:12px/1.4 ui-monospace,monospace;margin-top:8px";
    ta.placeholder = "name,addr,rooms,floors,plate,rent,tenancy\nEmpress Hotel,235 E HASTINGS ST,90,4,,,";
    ta.value = prefill;
    var go = document.createElement("button");
    go.type = "button"; go.textContent = "Import these rows"; go.style.marginTop = "6px";
    var wrap = document.getElementById("b-list-wrap");
    var old = document.getElementById("import-box");
    if (old) old.remove();
    var box = document.createElement("div");
    box.id = "import-box";
    box.appendChild(ta); box.appendChild(go);
    wrap.appendChild(box);
    go.addEventListener("click", function () {
      var lines = ta.value.trim().split(/\r?\n/);
      if (lines.length < 2) { box.remove(); return; }
      var head = lines[0].split(",").map(function (h) { return h.trim().toLowerCase(); });
      lines.slice(1).forEach(function (ln) {
        var cells = ln.split(","), o = {};
        head.forEach(function (h, i) { o[h] = (cells[i] || "").trim(); });
        if (!o.name && !o.addr) return;
        var coords = (o.lon && o.lat) ? [parseFloat(o.lon), parseFloat(o.lat)] : geocode(o.addr);
        saveBuilding({
          id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: o.name || "Untitled", addr: o.addr || "",
          rooms: num(o.rooms), floors: num(o.floors), plate: num(o.plate),
          rent: num(o.rent), tenancy: num(o.tenancy),
          lon: coords ? coords[0] : null, lat: coords ? coords[1] : null
        });
      });
      box.remove();
    });
  }

/* ==== the hundred-block datalist for the address field, filled when the streets load ==== */
        var dl = document.getElementById("hblocks");
        Object.keys(d.hblocks).sort().forEach(function (h) {
          var o = document.createElement("option");
          o.value = h;
          dl.appendChild(o);
        });

/* ==== click the map to place a record ==== */
  mapStage.addEventListener("click", function (e) {
    if (!placing || !PROJ || M3.on) return;
    var u = toUser(e);
    if (!u) return;
    document.getElementById("f-addr-hint").textContent =
      "Placed on the map at " + PROJ.lat(u[1]).toFixed(5) + ", " + PROJ.lon(u[0]).toFixed(5);
    formCoords = [PROJ.lon(u[0]), PROJ.lat(u[1])];
    setPlacing(false);
  });

  var formCoords = null;

  function setPlacing(on) {
    placing = on;
    document.body.classList.toggle("placing", on);
    document.getElementById("b-place").hidden = !on;
  }
