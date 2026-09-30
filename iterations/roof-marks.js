/* ==== columns in perspective, discs in plan, one per building ==== */
  // roof marks are off: the gradient on the massing carries the policy
  // the tenants a building loses, stood on its roof: a column one metre tall
  // per person in perspective, so the district reads as a skyline of
  // displacement; looking straight down, a disc whose area is the same count.
  // The colour is the building's own, the share displaced.
  var M_PER_TENANT = 1.0;
  function m3marks() {
    clear3(M3.gMoves);
    if (!scenColour || !SCEN || !M3.roofMarks) return;
    var u1 = 1 / M3.mPerUnit, edge = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
    M3.sroMeshes.forEach(function (m) {
      var u = m.userData, sc = SCEN.byIndex[u.s], b = SURVEYED[u.s];
      if (!sc || sc.state !== "converted" || !sc.lost) return;
      var colour = new THREE.Color(mapColourHex(b, u.s));
      if (M3.plan) {
        // area in proportion to the count: 1 tenant = 2.5 m^2
        var r = Math.sqrt(sc.lost * 2.5 / Math.PI) * u1;
        var disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color: colour }));
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(u.cx, u.top + 0.3 * u1, u.cz);
        M3.gMoves.add(disc);
        var ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
          Array.apply(null, Array(48)).map(function (_, k) { var t = k / 48 * Math.PI * 2; return new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r); })), edge);
        ring.position.set(u.cx, u.top + 0.35 * u1, u.cz);
        M3.gMoves.add(ring);
      } else {
        var w = 4.5 * u1, h = sc.lost * M_PER_TENANT * u1, gap = 0.4 * u1;
        var col = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshLambertMaterial({ color: colour }));
        col.position.set(u.cx, u.top + gap + h / 2, u.cz);
        M3.gMoves.add(col);
        var ln = new THREE.LineSegments(new THREE.EdgesGeometry(col.geometry), edge);
        ln.position.copy(col.position);
        M3.gMoves.add(ln);
      }
    });
  }
