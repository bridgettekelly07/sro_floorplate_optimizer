/* ==== selecting a building seeded the breakdown and rent inputs ==== */
    var b = SURVEYED[i];
    if (surveySel !== null && b && b.rooms) {
      // The survey gives rooms per building, never the floorplate. Rooms are
      // spread over the storeys the building's LiDAR height implies, or an
      // assumed count where the City has no height; both stay editable.
      var tp = typicalPlan(i), fl = tp && tp.placed ? tp.res : floorsOf(b);
      document.getElementById("u-floors").value = fl;
      document.getElementById("u-count").value = tp && tp.placed ? tp.placed : Math.max(1, Math.round(b.rooms / fl));
      if (tp && tp.placed) {
        document.getElementById("u-sf").value = Math.max(MIN_AREA, Math.min(MAX_AREA, Math.round(tp.sf)));
        document.getElementById("r-existing-sf").value = Math.round(tp.sf);
      } else if (b.parcelSf) {
        // The lot area, less a circulation share, divided by the rooms on a
        // floor: a starting room size where the survey gives none.
        var circ = (num(document.getElementById("u-circ").value) || 25) / 100;
        var per = b.parcelSf * (1 - circ) / Math.max(1, Math.round(b.rooms / fl));
        document.getElementById("u-sf").value = Math.max(MIN_AREA, Math.min(MAX_AREA, Math.round(per)));
        document.getElementById("r-existing-sf").value = Math.round(per);
      }
      document.getElementById("r-existing").value =
        b.tenure === "market" ? SURVEY.rentMarket : SURVEY.rentNonMarket;
      document.getElementById("u-ten").value = SURVEY.tenancyYears;
      renderBreakdown();
      renderAfford();
    }

/* ==== the generator ==== */
  /* ======================================================================
     6. UNIT BREAKDOWN — generates the floorplate in section 02
     ====================================================================== */

  function renderBreakdown() {
    var n = num(document.getElementById("u-count").value) || 0;
    var sf = num(document.getElementById("u-sf").value) || 0;
    var circ = Math.min(60, Math.max(0, num(document.getElementById("u-circ").value) || 0));
    var net = n * sf;
    var gross = circ < 100 ? net / (1 - circ / 100) : net;
    var nf = Math.max(1, num(document.getElementById("u-floors").value) || 1);
    document.getElementById("u-tally").innerHTML =
      tile(n, "Units per floor") + tile(fmt(sf) + " SF", "Each")
      + tile(fmt(Math.round(gross)) + " SF", "Gross floorplate")
      + tile(n * nf, "Rooms in building");
    var short = sf < MIN_UNIT_AREA;
    document.getElementById("u-note").innerHTML = short
      ? "At " + fmt(sf) + " SF a unit is below the 200 SF the Guidelines ask of a <em>converted</em> "
        + "unit, which is the ordinary condition of existing SRO stock — it is why conversion "
        + "means merging."
      : "At " + fmt(sf) + " SF each unit already meets the 200 SF conversion standard on its own, so "
        + "no merging would be needed. Existing SRO rooms are rarely this large.";
  }

  function applyBreakdown() {
    var n = Math.max(1, Math.min(60, Math.round(num(document.getElementById("u-count").value) || 1)));
    var sf = Math.max(MIN_AREA, Math.min(MAX_AREA, num(document.getElementById("u-sf").value) || 100));
    var ten = Math.max(0, num(document.getElementById("u-ten").value) || 0);
    var nf = Math.max(1, Math.min(20, Math.round(num(document.getElementById("u-floors").value) || 1)));
    floors = [];
    for (var f = 0; f < nf; f++) {
      var fr = [];
      for (var i = 0; i < n; i++) fr.push({ id: String(i + 1), area: sf, tenancy: ten, keep: false });
      floors.push({ rooms: fr, joints: new Array(Math.max(n - 1, 0)).fill(false) });
    }
    activeFloor = 0;
    rooms = floors[0].rooms;
    joints = floors[0].joints;
    nextId = n + 1;
    selected = null;
    refresh();
    frameAll(currentView);
  }
