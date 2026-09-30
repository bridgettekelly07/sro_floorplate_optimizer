/* ==== the README's hand-worked floorplate, the editor's starting state ==== */
  // The README's hand-worked floorplate, in corridor order.
  var AREAS = [100, 110, 165, 121, 100, 110, 165, 121, 100, 100];
  var TEN = [5, 6, 14 / 12, 3, 10, 7, 10 / 12, 8 / 12, 12, 5];

/* ==== the floor stack: switch, add, duplicate, remove, reset, presets ==== */
  function setActiveFloor(i) {
    if (i < 0 || i >= floors.length) return;
    syncFloor();
    activeFloor = i;
    rooms = floors[i].rooms;
    joints = floors[i].joints;
    selected = null;
    refresh();
    frameAll(currentView);
  }

  // Duplicate copies the scheme as well as the rooms: a building is usually
  // stacked identically, and re-cutting the same merges floor by floor is the
  // tedium this is here to remove. A plain new floor starts unmerged.
  function addFloor(copyActive) {
    syncFloor();
    var src = floors[activeFloor];
    floors.splice(activeFloor + 1, 0, {
      rooms: src.rooms.map(function (r, k) {
        return {
          id: String(k + 1), area: r.area, tenancy: r.tenancy,
          keep: copyActive ? r.keep : false
        };
      }),
      joints: copyActive
        ? src.joints.slice()
        : new Array(Math.max(src.rooms.length - 1, 0)).fill(false)
    });
    setActiveFloor(activeFloor + 1);
  }

  function removeFloor() {
    if (floors.length <= 1) return;
    floors.splice(activeFloor, 1);
    activeFloor = Math.min(activeFloor, floors.length - 1);
    rooms = floors[activeFloor].rooms;
    joints = floors[activeFloor].joints;
    selected = null;
    refresh();
    frameAll(currentView);
  }

  function resetFloorplate() {
    rooms = AREAS.map(function (a, i) {
      return { id: String(i + 1), area: a, tenancy: TEN[i], keep: false };
    });
    nextId = rooms.length + 1;
    joints = new Array(rooms.length - 1).fill(false);
    floors = [{ rooms: rooms, joints: joints }];
    activeFloor = 0;
  }

  function applyPreset(which) {
    rooms.forEach(function (r) { r.keep = false; });
    joints = new Array(Math.max(rooms.length - 1, 0)).fill(false);
    syncFloor();
    if (which === "case1") {
      for (var i = 0; i < joints.length; i += 2) joints[i] = true;
    } else if (which === "case2") {
      [0, 2, 4].forEach(function (i) { if (i < joints.length) joints[i] = true; });
      rooms.forEach(function (r, k) { if (k >= 6) r.keep = true; });
    }
  }

/* ==== the model: one floor in three.js, its camera, picking, wall dragging, labels ==== */
  /* ======================================================================
     2. THE MODEL
     Feet are scene units. Rooms run along +X off one corridor; existing
     stock sits on the near side, the proposed scheme on the far side, and
     the merge markers sit in the corridor between them.
     ====================================================================== */

  var FLOOR_H = 11;       // floor-to-floor, for the stack
  var DEPTH = 12;         // assumed room depth
  var CORRIDOR = 9;       // drawn width between the two bands
  var WALL_H = 3.0;       // partitions cut down so the plan reads from above
  var WALL_T = 0.5;
  var SLAB_H = 0.3;
  var BATH = [5, 8];      // 40 SF, per Guidelines p.5-6
  var KITCH = [8, 2];     // 16 SF counter run incl. the 24" x 24" fridge
  var MIN_AREA = 60, MAX_AREA = 420;

  var Z_EXIST = CORRIDOR / 2;              // near band: z from  4.5 to 16.5
  var Z_PROP = -CORRIDOR / 2 - DEPTH;      // far band:  z from -16.5 to -4.5

  var THREE = window.THREE;
  var viewport = document.getElementById("viewport");
  var overlay = document.getElementById("overlay");
  var hintEl = document.getElementById("hint");
  var renderer, scene, camera, raycaster, ground;
  var groupExist, groupProp, groupMarks, groupStack;
  var pickables = [], markPickables = [], floorPickables = [];
  var MAT = {}, GEO = null, has3d = false, dirty = true;

  // orbit state
  var cam = { r: 95, theta: Math.PI / 2 + 0.55, phi: 0.92, tx: 0, ty: 0, tz: 0 };

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function buildMaterials() {
    var defs = {
      ground: ["--m-ground", 1],
      sra: ["--m-slab-sra", 1],
      unit: ["--m-slab-unit", 1],
      short: ["--m-slab-short", 1],
      wall: ["--m-wall", 1],
      keep: ["--m-slab-keep", 1],
      pod: ["--m-pod", 1],
      select: ["--m-select", 1]
    };
    Object.keys(defs).forEach(function (k) {
      var c = new THREE.Color(css(defs[k][0]) || "#888888");
      if (MAT[k]) { MAT[k].color.copy(c); return; }
      MAT[k] = new THREE.MeshLambertMaterial({ color: c });
    });
    if (!MAT.ghost) {
      MAT.ghost = new THREE.MeshLambertMaterial({
        color: new THREE.Color(css("--m-wall") || "#999"), transparent: true, opacity: 0.35
      });
    } else {
      MAT.ghost.color.set(css("--m-wall") || "#999");
    }
    if (scene) scene.background = new THREE.Color(css("--m-ground") || "#e6e2d8");
  }

  function init3d() {
    if (!THREE) return false;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (e) { return false; }
    if (!renderer || !renderer.domElement) return false;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    viewport.insertBefore(renderer.domElement, overlay);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 1, 900);
    raycaster = new THREE.Raycaster();
    GEO = new THREE.BoxGeometry(1, 1, 1);
    proj = new THREE.Vector3();

    buildMaterials();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x556055, 1.25));
    var key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(-40, 70, 40);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(50, 30, -30);
    scene.add(fill);

    groupExist = new THREE.Group();
    groupProp = new THREE.Group();
    groupMarks = new THREE.Group();
    groupStack = new THREE.Group();
    scene.add(groupExist, groupProp, groupMarks, groupStack);

    // invisible plane for pointer projection
    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    bindPointer();
    window.addEventListener("resize", function () { resize(); scheduleRefit(); });
    resize();
    has3d = true;
    return true;
  }

  function box(parent, x, y, z, w, h, d, mat, meta) {
    var m = new THREE.Mesh(GEO, mat);
    m.position.set(x + w / 2, y + h / 2, z + d / 2);
    m.scale.set(w, h, d);
    if (meta) { m.userData = meta; }
    parent.add(m);
    return m;
  }

  function clear(group) {
    for (var i = group.children.length - 1; i >= 0; i--) group.remove(group.children[i]);
  }

  function widths() { return rooms.map(function (r) { return r.area / DEPTH; }); }

  function layoutX() {
    var w = widths(), xs = [0];
    for (var i = 0; i < w.length; i++) xs.push(xs[i] + w[i]);
    return xs; // xs[i] = left edge of room i; xs[n] = total width
  }

  var tags = [];
  function tag(kind, x, y, z, id, sub) {
    // Showing the whole stack, room-by-room text collides into noise: the
    // building view is for reading floors, the isolated view for reading rooms.
    if (!isolated && floors.length > 1 && kind.indexOf("band") !== 0) return;
    tags.push({ kind: kind, pos: new THREE.Vector3(x, y, z), id: id, sub: sub });
  }

  function buildModel(ev) {
    clear(groupExist); clear(groupProp); clear(groupMarks);
    hovered = null;
    floorPickables = [];
    pickables = []; markPickables = []; tags = [];

    var w = widths(), xs = layoutX(), total = xs[rooms.length] || 1;

    // ---- ground ----
    var pad = 10;
    box(groupExist, -pad, -0.6, Z_PROP - pad, total + pad * 2, 0.5,
      (Z_EXIST + DEPTH) - (Z_PROP - pad) + pad, MAT.ground);

    // ---- existing band: the editable inventory ----
    rooms.forEach(function (r, i) {
      var isSel = selected === i;
      var slab = box(groupExist, xs[i], 0, Z_EXIST, w[i], SLAB_H, DEPTH,
        isSel ? MAT.select : (r.keep ? MAT.keep : MAT.sra), { type: "room", i: i });
      pickables.push(slab);
      tag("room" + (r.keep ? " keep" : ""), xs[i] + w[i] / 2, WALL_H + 1.6, Z_EXIST + DEPTH / 2,
        r.id, fmt(r.area) + " SF" + (r.keep ? " · SRA" : ""));
    });

    // The corridor and back walls are the envelope and stay put. The partitions
    // between rooms move: dragging one shifts area from the room on one side to
    // the room on the other, which is what moving a partition actually does. The
    // left end wall is the datum and is fixed; the right end wall moves, and the
    // floor extends with it.
    box(groupExist, -WALL_T, 0, Z_EXIST + DEPTH, total + WALL_T * 2, WALL_H, WALL_T, MAT.wall);
    box(groupExist, -WALL_T, 0, Z_EXIST - WALL_T, total + WALL_T * 2, WALL_H, WALL_T, MAT.wall);
    for (var b = 0; b <= rooms.length; b++) {
      var interior = b > 0 && b < rooms.length;
      var movable = interior || b === rooms.length;
      var t = movable ? WALL_T * 1.7 : WALL_T;
      var wm = box(groupExist, xs[b] - t / 2, 0, Z_EXIST, t, WALL_H, DEPTH, MAT.wall,
        movable ? { type: "wall", b: b, interior: interior } : null);
      if (movable) pickables.push(wm);
    }

    // ---- proposed band: derived, read-only ----
    var items = [];
    ev.units.forEach(function (u) {
      if (u.floor !== activeFloor) return;      // this band is the edited floor
      items.push({ kind: "unit", u: u, start: u.idx[0] });
    });
    rooms.forEach(function (r, k) { if (r.keep) items.push({ kind: "sra", r: r, i: k }); });
    items.sort(function (a, b) {
      return (a.kind === "unit" ? a.start : a.i) - (b.kind === "unit" ? b.start : b.i);
    });

    var px = 0;
    items.forEach(function (it) {
      var area = it.kind === "unit" ? it.u.area : it.r.area;
      var uw = area / DEPTH;
      var mat = it.kind === "sra" ? MAT.sra : (it.u.ok ? MAT.unit : MAT.short);
      box(groupProp, px, 0, Z_PROP, uw, SLAB_H, DEPTH, mat);

      if (it.kind === "unit") {
        // pods, per Guidelines p.5-6
        if (uw > BATH[0] + 3) {
          box(groupProp, px + uw - BATH[0] - 0.6, SLAB_H, Z_PROP + DEPTH - BATH[1] - 0.6,
            BATH[0], 2.4, BATH[1], MAT.pod);
          var kw = Math.min(KITCH[0], uw - BATH[0] - 2);
          box(groupProp, px + 0.6, SLAB_H, Z_PROP + DEPTH - KITCH[1] - 0.6, kw, 1.3, KITCH[1], MAT.pod);
        }
        tag("unit" + (it.u.ok ? "" : " short"), px + uw / 2, WALL_H + 1.6, Z_PROP + DEPTH / 2,
          it.u.label, it.u.ids.join("+") + " · " + fmt(area) + " SF");
      } else {
        tag("room keep", px + uw / 2, WALL_H + 1.6, Z_PROP + DEPTH / 2, it.r.id,
          fmt(area) + " SF · SRA");
      }
      // unit perimeter: a partition only where a boundary survives
      box(groupProp, px - WALL_T / 2, 0, Z_PROP, WALL_T, WALL_H, DEPTH, MAT.wall);
      px += uw;
    });
    box(groupProp, px - WALL_T / 2, 0, Z_PROP, WALL_T, WALL_H, DEPTH, MAT.wall);
    box(groupProp, -WALL_T, 0, Z_PROP + DEPTH, (px || total) + WALL_T * 2, WALL_H, WALL_T, MAT.wall);
    box(groupProp, -WALL_T, 0, Z_PROP - WALL_T, (px || total) + WALL_T * 2, WALL_H, WALL_T, MAT.wall);

    // ---- merge markers, in the corridor ----
    for (var j = 0; j < rooms.length - 1; j++) {
      var locked = rooms[j].keep || rooms[j + 1].keep;
      var merged = joints[j];
      var mk = box(groupMarks, xs[j + 1] - 1.3, 0.1, -1.3, 2.6, 0.7, 2.6,
        merged ? MAT.unit : (locked ? MAT.wall : MAT.sra), { type: "joint", j: j, locked: locked });
      if (merged) { mk.material = MAT.select; }
      mk.userData.locked = locked;
      if (!locked) markPickables.push(mk);
      // a bar showing the partition that merging removes
      if (merged) {
        box(groupMarks, xs[j + 1] - WALL_T / 2, 0.1, -0.35, WALL_T, 0.35, 0.7, MAT.select);
      }
    }

    // band captions sit at the head of each run, clear of the room labels
    tag("band", total / 2, 0.4, Z_EXIST + DEPTH + 7, "",
      (floors.length > 1 ? "FLOOR " + (activeFloor + 1) + " · " : "EXISTING · ")
      + rooms.length + " SRA ROOMS");
    tag("band", (px || total) / 2, 0.4, Z_PROP - 7, "", "PROPOSED · "
      + (ev.perFloor ? ev.perFloor[activeFloor].surviving : ev.surviving) + " ROOMS");

    // The edited floor sits at its own height; the rest of the building is
    // drawn around it as context, and clicking one moves the edit there.
    var lift = isolated ? 0 : activeFloor * FLOOR_H;
    groupExist.position.y = lift;
    groupProp.position.y = lift;
    groupMarks.position.y = lift;
    drawStack();

    if (cam.tx === 0 && cam.tz === 0) { cam.tx = total / 2; }
    dirty = true;
  }

  /* ---- camera, picking, dragging ---- */

  function resize() {
    if (!has3d) return;
    var w = viewport.clientWidth, h = viewport.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    dirty = true;
  }

  var refit = null;
  function scheduleRefit() {
    if (refit) return;
    refit = setTimeout(function () { refit = null; frameAll(currentView); }, 140);
  }

  function placeCamera() {
    var sp = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, cam.phi));
    camera.position.set(
      cam.tx + cam.r * Math.sin(sp) * Math.cos(cam.theta),
      cam.ty + cam.r * Math.cos(sp),
      cam.tz + cam.r * Math.sin(sp) * Math.sin(cam.theta)
    );
    camera.lookAt(cam.tx, cam.ty, cam.tz);
  }

  // Pull back until the whole composition projects inside the frame. Solving
  // this against the projected corners keeps it correct at any pane width and
  // at any camera angle, which a radius guessed from the floor length is not.
  function fitView() {
    if (!has3d) return;
    var total = layoutX()[rooms.length] || 60;
    var minX = -12, maxX = total + 12;
    var minZ = Z_PROP - 10, maxZ = Z_EXIST + DEPTH + 10;
    var maxY = isolated ? WALL_H + 3 : (floors.length - 1) * FLOOR_H + WALL_H + 3;
    cam.tx = (minX + maxX) / 2;
    cam.ty = 0;
    cam.tz = (minZ + maxZ) / 2;

    var corners = [], v = new THREE.Vector3();
    for (var a = 0; a < 8; a++) {
      corners.push(new THREE.Vector3(
        (a & 1) ? maxX : minX, (a & 2) ? maxY : 0, (a & 4) ? maxZ : minZ));
    }
    for (var pass = 0; pass < 3; pass++) {
      placeCamera();
      camera.updateMatrixWorld();
      var m = 0;
      for (var c = 0; c < corners.length; c++) {
        v.copy(corners[c]).project(camera);
        m = Math.max(m, Math.abs(v.x), Math.abs(v.y));
      }
      if (m > 0) cam.r = Math.max(24, Math.min(420, cam.r * m / 0.88));
    }
    dirty = true;
  }

  function frameAll(view) {
    if (!has3d) return;
    var total = layoutX()[rooms.length] || 60;
    if (view === "eye") {
      // stand at the end of the corridor and look down it, at eye height
      cam.theta = Math.PI;
      cam.phi = Math.PI / 2 - 0.07;
      cam.tx = total / 2; cam.ty = 5.5; cam.tz = 0;
      cam.r = Math.max(30, total * 0.62);
      dirty = true;
      return;
    }
    if (view === "plan") { cam.phi = 0.035; cam.theta = -Math.PI / 2; }
    else { cam.phi = 0.86; cam.theta = -Math.PI / 2 + 0.62; }
    cam.r = total + 40;   // starting guess; fitView converges from here
    fitView();
    dirty = true;
  }

  var drag = null;

  function pointerNDC(e, out) {
    var rect = renderer.domElement.getBoundingClientRect();
    out.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    out.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return out;
  }

  var ndc = { x: 0, y: 0 }; // Raycaster reads .x / .y; no Vector2 needed before init

  function pick(e, list) {
    pointerNDC(e, ndc);
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(list, false);
    return hits.length ? hits[0] : null;
  }

  function groundX(e) {
    pointerNDC(e, ndc);
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObject(ground, false);
    return hits.length ? hits[0].point.x : null;
  }

  function bindPointer() {
    var el = renderer.domElement;
    var pointers = new Map();

    el.addEventListener("pointerdown", function (e) {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, e);
      if (pointers.size > 1) { drag = null; return; }

      var floorHit = pick(e, floorPickables);
      var markHit = pick(e, markPickables);
      var hit = pick(e, pickables);
      if (floorHit && (!hit || floorHit.distance < hit.distance)) {
        setActiveFloor(floorHit.object.userData.f);
        return;
      }
      if (markHit && (!hit || markHit.distance <= hit.distance + 0.5)) {
        var j = markHit.object.userData.j;
        joints[j] = !joints[j];
        refresh();
        return;
      }
      if (hit) {
        var d = hit.object.userData;
        var gx = groundX(e);
        if (d.type === "wall") {
          drag = {
            mode: "wall", b: d.b, interior: d.interior, shift: e.shiftKey,
            startX: gx, moved: false,
            leftArea: d.b > 0 ? rooms[d.b - 1].area : 0,
            rightArea: d.b < rooms.length ? rooms[d.b].area : 0
          };
          return;
        }
        select(d.i);
        drag = { mode: "move", i: d.i, startX: gx, startLeft: layoutX()[d.i], moved: false };
        return;
      }
      drag = { mode: "orbit", x: e.clientX, y: e.clientY, shift: e.shiftKey || e.button === 2 };
    });

    el.addEventListener("pointermove", function (e) {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e);
      if (pointers.size > 1) { pinch(pointers); return; }
      if (!drag) { hover(e); return; }

      if (drag.mode === "orbit") {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY;
        if (drag.shift) {
          var s = cam.r * 0.0016;
          cam.tx -= dx * s * Math.sin(cam.theta) * -1;
          cam.tz -= dx * s * Math.cos(cam.theta);
          cam.ty += dy * s;
        } else {
          cam.theta -= dx * 0.006;
          cam.phi -= dy * 0.005;
          cam.phi = Math.max(0.03, Math.min(Math.PI / 2 - 0.02, cam.phi));
        }
        dirty = true;
        return;
      }

      var gx = groundX(e);
      if (gx === null || drag.startX === null) return;
      var delta = gx - drag.startX;

      if (drag.mode === "wall") { moveWall(drag, delta); return; }

      // move: reorder when the dragged room's centre passes a neighbour's
      var w = widths(), xs = layoutX();
      var centre = drag.startLeft + delta + w[drag.i] / 2;
      var i = drag.i;
      if (i > 0 && centre < xs[i - 1] + w[i - 1] / 2) { swap(i, i - 1); drag.i = i - 1; drag.moved = true; }
      else if (i < rooms.length - 1 && centre > xs[i + 1] + w[i + 1] / 2) { swap(i, i + 1); drag.i = i + 1; drag.moved = true; }
      if (drag.moved) { drag.startLeft = layoutX()[drag.i]; drag.startX = gx; }
    });

    function end(e) {
      pointers.delete(e.pointerId);
      if (drag && drag.moved) refresh();
      hintOverride = null;
      drag = null;
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    el.addEventListener("wheel", function (e) {
      e.preventDefault();
      cam.r = Math.max(22, Math.min(320, cam.r * (1 + Math.sign(e.deltaY) * 0.09)));
      dirty = true;
    }, { passive: false });

    var lastPinch = 0;
    function pinch(map) {
      var pts = Array.from(map.values());
      if (pts.length < 2) return;
      var d = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      if (lastPinch) {
        cam.r = Math.max(22, Math.min(320, cam.r * (lastPinch / d)));
        dirty = true;
      }
      lastPinch = d;
      if (map.size < 2) lastPinch = 0;
    }
    el.addEventListener("pointerup", function () { lastPinch = 0; });
  }

  function clampArea(a) { return Math.max(MIN_AREA, Math.min(MAX_AREA, a)); }

  // delta is the wall's travel in feet; area follows at the assumed depth.
  function moveWall(d, delta) {
    var shiftSF = delta * DEPTH, changed = false;
    if (d.interior && !d.shift) {
      // transfer between neighbours: the floor's overall extent is unchanged
      var lo = Math.max(MIN_AREA - d.leftArea, d.rightArea - MAX_AREA);
      var hi = Math.min(MAX_AREA - d.leftArea, d.rightArea - MIN_AREA);
      var t = Math.round(Math.max(lo, Math.min(hi, shiftSF)));
      var L = d.leftArea + t, R = d.rightArea - t;
      if (rooms[d.b - 1].area !== L || rooms[d.b].area !== R) {
        rooms[d.b - 1].area = L;
        rooms[d.b].area = R;
        changed = true;
      }
      hintOverride = "Partition between rooms " + rooms[d.b - 1].id + " and "
        + rooms[d.b].id + " — <b>" + fmt(rooms[d.b - 1].area) + " SF</b> ↔ <b>"
        + fmt(rooms[d.b].area) + " SF</b>. The floor’s total area is unchanged.";
    } else {
      // the end wall, or a shift-drag: one room grows and the floor with it
      var i = d.b - 1;
      if (i < 0 || i >= rooms.length) return;
      var a = Math.round(clampArea(d.leftArea + shiftSF));
      if (rooms[i].area !== a) { rooms[i].area = a; changed = true; }
      hintOverride = "Room " + rooms[i].id + " — <b>" + fmt(rooms[i].area)
        + " SF</b>. The floor extends with the wall.";
    }
    if (changed) { d.moved = true; refresh(true); }
    else { updateHint(evaluate()); }
  }

  var hovered = null;
  function setHover(mesh) {
    if (hovered === mesh) return;
    if (hovered && hovered.__mat) { hovered.material = hovered.__mat; hovered.__mat = null; }
    hovered = mesh || null;
    if (hovered) { hovered.__mat = hovered.material; hovered.material = MAT.select; }
    dirty = true;
  }

  function hover(e) {
    var mk = pick(e, markPickables), hit = pick(e, pickables);
    var best = (mk && (!hit || mk.distance <= hit.distance + 0.5)) ? mk : hit;
    var el = renderer.domElement;
    if (!best) { setHover(null); el.style.cursor = "grab"; return; }
    setHover(best.object);
    var t = best.object.userData.type;
    el.style.cursor = t === "wall" ? "ew-resize" : (t === "joint" ? "pointer" : "move");
  }

  function swap(a, b) {
    var t = rooms[a]; rooms[a] = rooms[b]; rooms[b] = t;
    // a merge belongs to the boundary, not to the rooms, so moving a room
    // through a boundary clears the joints it crossed.
    var lo = Math.min(a, b);
    if (lo - 1 >= 0) joints[lo - 1] = false;
    joints[lo] = false;
    if (lo + 1 < joints.length) joints[lo + 1] = false;
    selected = b;
  }

  /* ---- label overlay: HTML, so the type stays crisp and theme-aware ---- */
  var tagEls = [];
  var proj = null; // set in init3d

  function drawTags() {
    var w = viewport.clientWidth, h = viewport.clientHeight;
    while (tagEls.length < tags.length) {
      var d = document.createElement("div");
      d.className = "tag";
      d.innerHTML = '<span class="id"></span><span class="sub"></span>';
      overlay.appendChild(d);
      tagEls.push(d);
    }
    tagEls.forEach(function (el, i) {
      if (i >= tags.length) { el.hidden = true; return; }
      var t = tags[i];
      proj.copy(t.pos).project(camera);
      if (proj.z > 1) { el.hidden = true; return; }
      el.hidden = false;
      el.className = "tag " + t.kind;
      el.style.left = ((proj.x * 0.5 + 0.5) * w).toFixed(1) + "px";
      el.style.top = ((-proj.y * 0.5 + 0.5) * h).toFixed(1) + "px";
      el.firstChild.textContent = t.id;
      el.lastChild.textContent = t.sub;
    });
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!has3d || !dirty) return;
    dirty = false;
    placeCamera();
    renderer.render(scene, camera);
    drawTags();
  }

/* ==== the rooms table: select, inventory, cells ==== */
  var elInv = document.getElementById("inv");

  function select(i) {
    selected = i;
    document.getElementById("del").disabled = i === null || rooms.length <= 1;
    document.getElementById("dup").disabled = i === null;
    renderInventory();
    if (has3d) { buildModel(evaluate()); }
  }

  function renderInventory() {
    elInv.textContent = "";
    rooms.forEach(function (r, i) {
      var tr = document.createElement("tr");
      tr.className = (selected === i ? "sel " : "") + (r.keep ? "keep" : "");

      var td0 = document.createElement("td");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rid";
      b.style.border = "none";
      b.style.background = "none";
      b.style.padding = "0";
      b.textContent = r.id;
      b.title = "Select room " + r.id;
      b.addEventListener("click", function () { select(i); });
      td0.appendChild(b);
      tr.appendChild(td0);

      tr.appendChild(cell(numInput("area-" + r.id, r.area, 1, function (v) {
        r.area = Math.max(MIN_AREA, Math.min(MAX_AREA, v)); refresh();
      })));
      tr.appendChild(cell(numInput("ten-" + r.id, Math.round(r.tenancy * 100) / 100, 0.25,
        function (v) { r.tenancy = v; refresh(); })));

      var td3 = document.createElement("td");
      td3.style.textAlign = "right";
      var keep = document.createElement("button");
      keep.type = "button";
      keep.className = "chip" + (r.keep ? " on" : "");
      keep.textContent = r.keep ? "SRA" : "—";
      keep.title = "Leave room " + r.id + " unconverted";
      keep.setAttribute("aria-pressed", String(r.keep));
      keep.addEventListener("click", function () {
        r.keep = !r.keep;
        if (r.keep) {
          if (i > 0) joints[i - 1] = false;
          if (i < joints.length) joints[i] = false;
        }
        refresh();
      });
      td3.appendChild(keep);
      tr.appendChild(td3);
      elInv.appendChild(tr);
    });
  }

  function cell(child) {
    var td = document.createElement("td");
    td.appendChild(child);
    return td;
  }

  function numInput(id, value, step, onchange) {
    var el = document.createElement("input");
    el.type = "number";
    el.id = id;
    el.step = String(step);
    el.min = "0";
    el.value = String(value);
    el.addEventListener("change", function () {
      var v = parseFloat(el.value);
      if (!isFinite(v) || v < 0) { el.value = String(value); return; }
      onchange(v);
    });
    return el;
  }

/* ==== the hint under the model ==== */
  var hintOverride = null;

  function updateHint(ev) {
    if (hintOverride) { hintEl.innerHTML = hintOverride; return; }
    var short = ev.units.filter(function (u) { return !u.ok; }).length;
    var msg;
    if (selected !== null && rooms[selected]) {
      var r = rooms[selected];
      msg = "<b>Room " + r.id + "</b> — " + fmt(r.area) + " SF, "
        + (Math.round(r.tenancy * 100) / 100) + " yr tenancy"
        + (r.keep ? ", left as an SRA room." : ".")
        + " Drag it to reorder, or drag a partition to resize it.";
    } else if (short) {
      msg = short + " unit" + (short === 1 ? " is" : "s are") + " under " + MIN_UNIT_AREA + " SF — drawn in red, "
        + "carried by the average fallback if the project average holds.";
    } else {
      msg = "Click a room to select it, or a marker in the corridor to merge.";
    }
    hintEl.innerHTML = msg;
  }

/* ==== the floor strip ==== */
  function renderFloors(ev) {
    var strip = document.getElementById("floor-strip");
    if (!strip) return;
    strip.textContent = "";
    // top floor first, the way a building section reads
    for (var i = floors.length - 1; i >= 0; i--) {
      (function (i) {
        var pf = ev.perFloor ? ev.perFloor[i] : null;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "floor-tab" + (i === activeFloor ? " on" : "");
        b.title = "Edit floor " + (i + 1);
        b.innerHTML = '<span class="n">' + (i + 1) + '</span>'
          + (pf ? '<small>' + pf.original + "\u2192" + pf.surviving + '</small>' : "");
        b.addEventListener("click", function () { setActiveFloor(i); });
        strip.appendChild(b);
      })(i);
    }
    document.getElementById("fl-del").disabled = floors.length <= 1;
  }

/* ==== add and remove rooms, the floor buttons, views, presets, the theme hook ==== */
  function addRoom() {
    var src = selected !== null ? rooms[selected] : null;
    var r = { id: String(nextId++), area: src ? src.area : 100, tenancy: src ? src.tenancy : 2, keep: false };
    var at = selected === null ? rooms.length : selected + 1;
    rooms.splice(at, 0, r);
    joints.splice(Math.min(at, joints.length), 0, false);
    while (joints.length < rooms.length - 1) joints.push(false);
    selected = at;
    refresh();
    frameAll(currentView);
  }

  function removeRoom() {
    if (selected === null || rooms.length <= 1) return;
    rooms.splice(selected, 1);
    joints.splice(Math.min(selected, joints.length - 1), 1);
    joints.length = Math.max(rooms.length - 1, 0);
    selected = Math.min(selected, rooms.length - 1);
    refresh();
    frameAll(currentView);
  }

  document.getElementById("fl-add").addEventListener("click", function () { addFloor(false); });
  document.getElementById("fl-dup").addEventListener("click", function () { addFloor(true); });
  document.getElementById("fl-del").addEventListener("click", removeFloor);
  document.getElementById("fl-iso").addEventListener("click", function () {
    isolated = !isolated;
    this.classList.toggle("on", isolated);
    this.title = isolated ? "Showing this floor alone" : "Showing every floor";
    refresh();
    frameAll(currentView);
  });

  document.getElementById("add").addEventListener("click", addRoom);
  document.getElementById("dup").addEventListener("click", addRoom);
  document.getElementById("del").addEventListener("click", removeRoom);

  var currentView = "axo";
  Array.prototype.forEach.call(document.querySelectorAll("[data-view]"), function (b) {
    b.addEventListener("click", function () {
      currentView = b.getAttribute("data-view");
      Array.prototype.forEach.call(document.querySelectorAll("[data-view]"), function (o) {
        o.classList.toggle("on", o === b);
      });
      frameAll(currentView);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-preset]"), function (b) {
    b.addEventListener("click", function () {
      if (rooms.length !== 10) resetFloorplate();
      applyPreset(b.getAttribute("data-preset"));
      selected = null;
      refresh();
      frameAll(currentView);
    });
  });

  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onTheme = function () { if (has3d) { buildMaterials(); dirty = true; } };
    if (mq.addEventListener) mq.addEventListener("change", onTheme);
    else if (mq.addListener) mq.addListener(onTheme);
  }

/* ==== the search applied to the editor's floorplate, and the old view buttons ==== */
  /* ---- the search applied to the editor's own floorplate (section 07) ---- */

  function optimiseEditor(strict) {
    syncFloor();
    var runs = floors.map(function (fl) { return fl.rooms.map(function (r) { return r.area; }); });
    var o = optimise(runs, strict);
    var note = document.getElementById("opt-note");
    note.hidden = false;
    if (!o.feasible) {
      note.innerHTML = "<strong>No compliant scheme of adjacent merges exists</strong> for this floorplate under the " + (strict ? "strict" : "average") + " reading: " + esc(o.reason) + ".";
      return;
    }
    floors.forEach(function (fl, f) {
      fl.rooms.forEach(function (r) { r.keep = false; });
      fl.joints = new Array(Math.max(fl.rooms.length - 1, 0)).fill(false);
      var sch = o.runs[f];
      sch.kept.forEach(function (k) { fl.rooms[k].keep = true; });
      sch.groups.forEach(function (g) { for (var q = 0; q < g.length - 1; q++) fl.joints[g[q]] = true; });
    });
    rooms = floors[activeFloor].rooms; joints = floors[activeFloor].joints; selected = null;
    note.innerHTML = "Drawn above: the scheme that loses the fewest rooms while passing every test under the " + (strict ? "strict" : "average") + " reading — " + o.units + " units, " + o.kept + " kept, <strong>" + o.lost + " rooms lost</strong> of " + o.original + ". Every scheme of adjacent merges was searched; none loses fewer.";
    refresh();
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-plan-view]"), function (b) {
    b.addEventListener("click", function () {
      planView = b.getAttribute("data-plan-view");
      Array.prototype.forEach.call(document.querySelectorAll("[data-plan-view]"), function (o) { o.classList.toggle("on", o === b); });
      renderBuilding();
    });
  });
  document.getElementById("opt-strict").addEventListener("click", function () { optimiseEditor(true); });
  document.getElementById("opt-avg").addEventListener("click", function () { optimiseEditor(false); });

/* ==== start-up: the example floor, and the WebGL fallback ==== */
  resetFloorplate();
  applyPreset("case1");

  var EDITOR_OFF = true;   // the floorplate editor is set aside until it is folded into the map
  if (!EDITOR_OFF && init3d()) {
    frameAll("axo");
    loop();
  } else {
    viewport.hidden = true;
    var fb = document.getElementById("fallback");
    fb.hidden = false;
    fb.textContent = "This browser could not start WebGL, so the 3D model is unavailable. "
      + "The inventory table on the right still drives every test below.";
  }
  document.getElementById("r-unit-sf").addEventListener("input", function () { unitTouched = true; });

/* ==== the other floors of the stack, ghosted ==== */
  // Other floors: slab and partitions only, ghosted, pickable as a whole.
  function drawStack() {
    clear(groupStack);
    floorPickables = [];
    if (isolated || floors.length < 2) return;
    floors.forEach(function (fl, fi) {
      if (fi === activeFloor) return;
      var y = fi * FLOOR_H, x = 0;
      var w = fl.rooms.map(function (r) { return r.area / DEPTH; });
      var total = w.reduce(add, 0) || 1;
      box(groupStack, 0, y, Z_EXIST, total, SLAB_H, DEPTH, MAT.ghost);
      fl.rooms.forEach(function (r, i) {
        box(groupStack, x - WALL_T / 2, y, Z_EXIST, WALL_T, WALL_H * 0.8, DEPTH, MAT.ghost);
        x += w[i];
      });
      box(groupStack, x - WALL_T / 2, y, Z_EXIST, WALL_T, WALL_H * 0.8, DEPTH, MAT.ghost);
      box(groupStack, 0, y, Z_EXIST + DEPTH, total, WALL_H * 0.8, WALL_T, MAT.ghost);
      box(groupStack, 0, y, Z_EXIST - WALL_T, total, WALL_H * 0.8, WALL_T, MAT.ghost);
      // one flat target per floor, so a click anywhere on the slab selects it
      var hit = box(groupStack, 0, y, Z_EXIST, total, WALL_H * 0.8, DEPTH,
        MAT.ghost, { type: "floor", f: fi });
      hit.material = new THREE.MeshBasicMaterial({ visible: false });
      floorPickables.push(hit);
      tag("band", -9, y + 1.2, Z_EXIST + DEPTH / 2, "", "FLOOR " + (fi + 1));
    });
  }
