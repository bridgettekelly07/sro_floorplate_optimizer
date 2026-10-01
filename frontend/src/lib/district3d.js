// The district in 3D: the same footprints, streets and Appendix B buildings
// as the map, raised to the height the City's 2009 LiDAR recorded for each
// footprint. Framework-free: the Svelte component owns the element and
// feeds this class its data, colours and selection.
import * as THREE from "three";
import { css, hexOf } from "./colours.js";
import { arterialPicks } from "./projection.js";
import { paintGround } from "./groundTexture.js";
import { wheelZoom, EASE } from "./zoom.js";
import { FLOOR_M, NOMINAL_H, floorsOf } from "./typicalFloor.js";

const NAME_PX = 10, NAME_S = 4;   // street-name type size on screen, and the texture oversampling


export class District3D {
  // wrap: the element the canvas goes in; labels: the overlay for building names
  constructor(wrap, labels, { onSelect, onHover }) {
    this.wrap = wrap; this.labels = labels;
    this.onSelect = onSelect; this.onHover = onHover;
    this.on = false; this.ready = false; this.dirty = true; this.needFoot = true;
    this.hover = null; this.mPerUnit = 1; this.plan = false; this.framed = false;
    this.sel = null; this.colourOf = () => "#888888"; this.gradientOf = () => null;
    this.data = null; this.proj = null;
  }

  // ---- data and style ----
  setData(data, proj) { this.data = data; this.proj = proj; this.needFoot = true; }
  // colourOf(b, i) -> hex; gradientOf(i) -> 0..1 strength of the roof fade, or null
  setStyle(colourOf, gradientOf) { this.colourOf = colourOf; this.gradientOf = gradientOf; }
  setSelected(i) { this.sel = i; if (this.ready) { this.select(); this.dirty = true; } }

  init() {
    if (this.ready) return true;
    if (!this.proj) return false;
    let r;
    try { r = new THREE.WebGLRenderer({ antialias: true, alpha: false }); } catch { return false; }
    if (!r || !r.domElement) return false;
    this.renderer = r;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.wrap.insertBefore(r.domElement, this.labels);
    this.scene = new THREE.Scene();
    this.persp = new THREE.PerspectiveCamera(40, 1, 1, 30000);
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 30000);
    this.camera = this.persp;
    this.ray = new THREE.Raycaster();
    this.ndc = { x: 0, y: 0 };
    this.v = new THREE.Vector3();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a80, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-700, 600, 500); this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25); fill.position.set(700, 300, -400); this.scene.add(fill);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    this.matBldg = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.matLand = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matRoad = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matWalk = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matPark = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matTerrain = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.matContour = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    this.matContour5 = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 });
    this.matTree = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.matTrunk = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.matSel = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.matStorey = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 });
    this.gGround = new THREE.Group(); this.gFoot = new THREE.Group(); this.gStreets = new THREE.Group();
    this.gSro = new THREE.Group(); this.gSel = new THREE.Group(); this.gNames = new THREE.Group(); this.gTrees = new THREE.Group();
    this.scene.add(this.gGround, this.gFoot, this.gStreets, this.gNames, this.gTrees, this.gSro, this.gSel);
    this.sroMeshes = [];
    this.bindPointer();
    this.ready = true;
    this.colours();
    this.cam = { r: this.proj.W, theta: Math.PI / 2 + 0.45, phi: 0.95, tx: this.proj.W / 2, tz: this.proj.H / 2 };
    return true;
  }

  colours() {
    if (!this.ready) return;
    this.scene.background = new THREE.Color(css("--m3-sky") || "#e9e5db");
    this.ground.material.color.set(css("--m3-water") || "#d9e0df");
    this.matLand.color.set(css("--m3-ground") || "#f4f1ea");
    this.matRoad.color.set(css("--m3-road") || "#e3dfd5");
    this.matWalk.color.set(css("--m3-walk") || "#ece8de");
    this.matPark.color.set(css("--m3-park") || "#dfe7db");
    this.matSel.color.set(css("--ink") || "#1d2320");
    this.matStorey.color.set(css("--ink") || "#1d2320");
    this.matContour.color.set(css("--m3-contour") || "#bfb9aa");
    this.matContour5.color.set(css("--m3-contour") || "#bfb9aa");
    this.matTree.color.set(css("--m3-tree") || "#8aa58a");
    this.matTrunk.color.set(css("--m3-trunk") || "#8b7d6b");
    this.needFoot = true; this.dirty = true;
  }

  // ---- geometry ----
  clear(g) { while (g.children.length) g.remove(g.children[0]); }

  // the ground's height in scene units at a point in projection units
  yAt(x, z) {
    const t = this.data && this.data.terrain;
    if (!t) return 0;
    return t.at(this.proj.lon(x), this.proj.lat(z)) / this.mPerUnit;
  }
  // the lowest ground under a ring, so a building on a slope sits in it, not over it
  baseOf(ring) {
    let y = Infinity;
    for (const p of ring) y = Math.min(y, this.yAt(this.proj.x(p[0]), this.proj.y(p[1])));
    return y === Infinity ? 0 : y;
  }

  // One merged geometry from many rings: a triangulated roof and one quad per
  // edge, coloured per vertex so a single draw covers the whole district.
  extrude(items) {
    const proj = this.proj, pos = [], col = [];
    items.forEach((it) => {
      const c = it.pts.slice();
      if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
      if (c.length < 3) return;
      const xz = c.map((p) => [proj.x(p[0]), proj.y(p[1])]);
      const base = it.base || 0, y0 = base - 0.6 / this.mPerUnit;   // sunk a little, so no gap opens on a slope
      const y = base + Math.max(0.5, it.h) / this.mPerUnit;
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(xz.map((p) => new THREE.Vector2(p[0], p[1])), []); } catch { tris = []; }
      const r = it.col.r, g = it.col.g, b = it.col.b;
      const push = (x, yy, z, f) => { pos.push(x, yy, z); col.push(r * f, g * f, b * f); };
      tris.forEach((t) => { for (let k = 0; k < 3; k++) push(xz[t[k]][0], y, xz[t[k]][1], 1); });
      for (let i = 0; i < xz.length; i++) {
        const a = xz[i], q = xz[(i + 1) % xz.length];
        push(a[0], y0, a[1], 0.86); push(q[0], y0, q[1], 0.86); push(q[0], y, q[1], 0.86);
        push(a[0], y0, a[1], 0.86); push(q[0], y, q[1], 0.86); push(a[0], y, a[1], 0.86);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }
  flatGeo(pos) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }
  polys(rings, y) {
    const proj = this.proj, pos = [];
    rings.forEach((ring) => {
      const c = ring.slice();
      if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
      if (c.length < 3) return;
      const xz = c.map((p) => [proj.x(p[0]), proj.y(p[1])]);
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(xz.map((p) => new THREE.Vector2(p[0], p[1])), []); } catch { tris = []; }
      tris.forEach((t) => { for (let k = 0; k < 3; k++) pos.push(xz[t[k]][0], y, xz[t[k]][1]); });
    });
    return this.flatGeo(pos);
  }
  // A flat strip along a polyline: one rectangle per segment, each extended
  // by its half width so the rectangles meet at corners and intersections.
  strip(pos, c, half, y) {
    const proj = this.proj;
    for (let i = 1; i < c.length; i++) {
      let ax = proj.x(c[i - 1][0]), az = proj.y(c[i - 1][1]), bx = proj.x(c[i][0]), bz = proj.y(c[i][1]);
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      if (!L) continue;
      const nx = -dz / L * half, nz = dx / L * half, ex = dx / L * half, ez = dz / L * half;
      ax -= ex; az -= ez; bx += ex; bz += ez;
      pos.push(ax + nx, y, az + nz, bx - nx, y, bz - nz, bx + nx, y, bz + nz,
               ax + nx, y, az + nz, ax - nx, y, az - nz, bx - nx, y, bz - nz);
    }
  }

  scale() {
    const proj = this.proj;
    this.mPerUnit = proj.mPerUnit;
    this.ground.scale.set(proj.W * 8, proj.H * 8, 1);
    this.ground.position.set(proj.W / 2, -0.05, proj.H / 2);
  }
  // The terrain: one vertex per heightfield cell, the painted ground as its
  // texture, lit so the slopes read. Without a heightfield the land is flat.
  buildGround() {
    this.clear(this.gGround);
    const proj = this.proj, t = this.data.terrain;
    // the heightfield covers the streets' extent, which runs wider than the map's frame
    const bb = t ? t.bbox : proj.bbox;
    const ext = { x0: proj.x(bb[0]), x1: proj.x(bb[2]), z0: proj.y(bb[3]), z1: proj.y(bb[1]) };
    const cv = paintGround(proj, this.data, this.renderer.capabilities.maxTextureSize, ext, bb);
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    if (this.matTerrain.map) this.matTerrain.map.dispose();
    this.matTerrain.map = tex; this.matTerrain.needsUpdate = true;
    const uvOf = (x, z) => [(x - ext.x0) / (ext.x1 - ext.x0), 1 - (z - ext.z0) / (ext.z1 - ext.z0)];
    let geo;
    if (t) {
      const nx = t.nx, ny = t.ny, pos = [], uv = [], idx = [];
      const lat0 = (bb[1] + bb[3]) / 2, kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = proj.x(bb[0] + i * t.cell / kx), z = proj.y(bb[1] + j * t.cell / ky);
        pos.push(x, t.heights[j * nx + i] / this.mPerUnit, z);
        uv.push(...uvOf(x, z));
      }
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        idx.push(a, b, c, b, d, c);   // wound so the normals face up: z runs south
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
    } else {
      geo = new THREE.PlaneGeometry(ext.x1 - ext.x0, ext.z1 - ext.z0);
      geo.rotateX(-Math.PI / 2); geo.translate((ext.x0 + ext.x1) / 2, 0.02, (ext.z0 + ext.z1) / 2);
    }
    this.gGround.add(new THREE.Mesh(geo, this.matTerrain));
    this.buildContours();
  }
  // The City's 1-metre contours, laid just above the ground they describe:
  // every metre faint, every fifth metre stronger.
  buildContours() {
    const t = this.data.terrain, proj = this.proj;
    if (!t || !t.contours.length) return;
    const lift = 0.25 / this.mPerUnit, one = [], five = [];
    t.contours.forEach((c) => {
      const out = Math.abs(c.z % 5) < 1e-6 ? five : one;
      for (let i = 1; i < c.pts.length; i++) {
        const a = c.pts[i - 1], b = c.pts[i];
        const ax = proj.x(a[0]), az = proj.y(a[1]), bx = proj.x(b[0]), bz = proj.y(b[1]);
        out.push(ax, this.yAt(ax, az) + lift, az, bx, this.yAt(bx, bz) + lift, bz);
      }
    });
    [[one, this.matContour], [five, this.matContour5]].forEach(([seg, mat]) => {
      if (!seg.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
      this.gGround.add(new THREE.LineSegments(g, mat));
    });
  }
  // Footprints that an SRO already stands on are drawn by the SRO itself.
  buildFoot() {
    this.clear(this.gFoot);
    const foot = this.data.foot;
    if (!foot) return;
    const skip = {};
    this.data.surveyed.forEach((b) => { if (b.foot != null) skip[b.foot] = true; });
    const colour = new THREE.Color(css("--m3-bldg") || "#d8d2c3"), items = [];
    for (let i = 0; i < foot.length; i++) {
      if (skip[i]) continue;
      items.push({ pts: foot[i].p, h: foot[i].h || NOMINAL_H, col: colour, base: this.baseOf(foot[i].p) });
    }
    // the city around the surveyed extent: the 2009 footprints at their LiDAR heights
    (this.data.context || []).forEach((f) => {
      items.push({ pts: f.p, h: f.h || NOMINAL_H, col: colour, base: this.baseOf(f.p) });
    });
    this.gFoot.add(new THREE.Mesh(this.extrude(items), this.matBldg));
  }
  // The street surfaces are in the ground texture; what remains here is the names.
  buildStreets() {
    this.clear(this.gStreets);
    const proj = this.proj;
    this.streetLabels = [];
    const pick = arterialPicks(this.data.streets, proj);
    Object.keys(pick).forEach((name) => {
      const sg = pick[name].sg, a = sg.c[0], b = sg.c[sg.c.length - 1];
      const x = (proj.x(a[0]) + proj.x(b[0])) / 2, z = (proj.y(a[1]) + proj.y(b[1])) / 2;
      this.streetLabels.push({ text: name, x, z, y: this.yAt(x, z),
                               ax: proj.x(a[0]), az: proj.y(a[1]), bx: proj.x(b[0]), bz: proj.y(b[1]) });
    });
    this.buildNames();
  }
  // The City's public trees: a canopy and a trunk each, instanced, sized by
  // the height the City records, standing on the ground.
  buildTrees() {
    this.clear(this.gTrees);
    const trees = this.data.trees, proj = this.proj;
    if (!trees || !trees.length) return;
    const u = 1 / this.mPerUnit, n = trees.length;
    const canopy = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), this.matTree, n);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), this.matTrunk, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    trees.forEach((t, i) => {
      const x = proj.x(t.lon), z = proj.y(t.lat), y = this.yAt(x, z), h = Math.max(2, t.h);
      const r = Math.max(1, Math.min(6, h * 0.28)), dia = Math.max(0.15, t.d / 100);
      pos.set(x, y + h * 0.62 * u, z); scl.set(r * u, h * 0.45 * u, r * u);
      canopy.setMatrixAt(i, m.compose(pos, q, scl));
      pos.set(x, y + h * 0.3 * u, z); scl.set(dia * 0.5 * u, h * 0.6 * u, dia * 0.5 * u);
      trunk.setMatrixAt(i, m.compose(pos, q, scl));
    });
    this.gTrees.add(canopy, trunk);
  }

  // ---- street names, painted on the road ----
  nameTexture(text) {
    const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    const font = "600 " + (NAME_PX * NAME_S) + "px 'IBM Plex Sans Condensed', sans-serif", sp = NAME_PX * NAME_S * 0.14;
    ctx.font = font;
    let w = 0;
    for (let i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + sp;
    cv.width = Math.ceil(w + NAME_S * 4); cv.height = Math.ceil(NAME_PX * NAME_S * 1.3);
    ctx.font = font; ctx.textBaseline = "middle"; ctx.fillStyle = css("--ink-3") || "#7d847e";
    let x = NAME_S * 2;
    for (let k = 0; k < text.length; k++) { ctx.fillText(text[k], x, cv.height / 2); x += ctx.measureText(text[k]).width + sp; }
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    return tex;
  }
  buildNames() {
    this.clear(this.gNames);
    this.nameMeshes = [];
    (this.streetLabels || []).forEach((l) => {
      const tex = this.nameTexture(l.text);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.order = "YXZ"; m.rotation.x = -Math.PI / 2;
      m.position.set(l.x, l.y + 0.16, l.z);
      const dx = l.bx - l.ax, dz = l.bz - l.az, len = Math.hypot(dx, dz) || 1;
      m.userData = { l, dx: dx / len, dz: dz / len, len, pw: tex.image.width / NAME_S, ph: tex.image.height / NAME_S };
      m.visible = false;
      this.gNames.add(m); this.nameMeshes.push(m);
    });
  }
  placeNames() {
    this.namePlaced = [];
    if (!this.nameMeshes) return;
    const W = this.renderer.domElement.clientWidth, H = this.renderer.domElement.clientHeight;
    const far = Math.max(0.7, Math.min(1, Math.pow(this.proj.W * 0.22 / this.cam.r, 0.25)));
    this.nameMeshes.forEach((m) => {
      const u = m.userData, l = u.l;
      m.visible = false;
      const q = this.toScreen(l.x, l.y, l.z);
      if (!q.on || q.x < 30 || q.x > W - 30 || q.y < 20 || q.y > H - 20) return;
      let dx = u.dx, dz = u.dz;
      const qa = this.toScreen(l.ax, l.y, l.az), qb = this.toScreen(l.bx, l.y, l.bz);
      if (qb.x < qa.x) { dx = -dx; dz = -dz; }
      const cd = this.toScreen(l.x + dx, l.y, l.z + dz), cn = this.toScreen(l.x - dz, l.y, l.z + dx);
      const pxD = Math.hypot(cd.x - q.x, cd.y - q.y), pxN = Math.hypot(cn.x - q.x, cn.y - q.y);
      if (pxD < 1e-6 || pxN < 1e-6 || pxN / pxD < 0.15 || pxD / pxN < 0.15) return;
      let w = u.pw * far / pxD, h = u.ph * far / pxN;
      const cap = Math.min(Math.max(u.len, 150), 320);
      if (w > cap) { if (w > cap * 2) return; h *= cap / w; w = cap; }
      const sw = u.pw * far;
      for (let i = 0; i < this.namePlaced.length; i++) {
        const o = this.namePlaced[i];
        if (Math.abs(o[0] - q.x) < (o[2] + sw) / 2 && Math.abs(o[1] - q.y) < 16) return;
      }
      this.namePlaced.push([q.x, q.y, sw]);
      m.scale.set(w, h, 1);
      m.rotation.y = Math.atan2(-dz, dx);
      m.visible = true;
    });
  }

  // ---- the SRO buildings: measured massing, or the footprint extruded ----
  buildSro() {
    this.clear(this.gSro);
    this.sroMeshes = [];
    const { surveyed, mass, foot } = this.data, proj = this.proj;
    surveyed.forEach((b, i) => {
      if (b.lon == null) return;
      const colour = new THREE.Color(this.colourOf(b, i));
      const rec = mass && mass[i] && mass[i].parts.length ? mass[i] : null;
      const pts = (b.foot != null && foot && foot[b.foot]) ? foot[b.foot].p : b.poly;
      const h = b.hgtM || floorsOf(b) * FLOOR_M;
      const base = rec ? Math.min(...rec.parts.map((p) => this.baseOf(p.r))) : pts ? this.baseOf(pts) : this.yAt(proj.x(b.lon), proj.y(b.lat));
      let mesh, cx, cz, top = h;
      if (rec) {
        mesh = new THREE.Mesh(this.extrude(rec.parts.map((p) => ({ pts: p.r, h: p.h || NOMINAL_H, col: colour, base }))), this.matBldg);
        let sx = 0, sz = 0, nn = 0;
        rec.parts.forEach((p) => { top = Math.max(top, p.h || 0); p.r.forEach((q) => { sx += proj.x(q[0]); sz += proj.y(q[1]); nn++; }); });
        cx = sx / nn; cz = sz / nn;
      } else if (pts) {
        mesh = new THREE.Mesh(this.extrude([{ pts, h, col: colour, base }]), this.matBldg);
        let sx = 0, sz = 0;
        pts.forEach((p) => { sx += proj.x(p[0]); sz += proj.y(p[1]); });
        cx = sx / pts.length; cz = sz / pts.length;
      } else {
        // a hundred-block placement has no outline: a column marks it
        cx = proj.x(b.lon); cz = proj.y(b.lat);
        const rr = 7 / this.mPerUnit, y = h / this.mPerUnit;
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), new THREE.MeshLambertMaterial({ color: colour }));
        mesh.scale.set(rr, y, rr);
        mesh.position.set(cx, base + y / 2, cz);
      }
      mesh.userData = { s: i, cx, cz, base, top: base + top / this.mPerUnit, est: !b.hgtM };
      this.gradient(mesh, i);
      this.gSro.add(mesh);
      this.sroMeshes.push(mesh);
      // storey markers: one faint line around each part at every floor level
      const rings = rec ? rec.parts.map((p) => ({ r: p.r, h: p.h || NOMINAL_H })) : (pts ? [{ r: pts, h }] : []);
      const seg = [];
      rings.forEach((rg) => {
        const c = rg.r.slice();
        if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
        const levels = Math.max(1, Math.round(rg.h / FLOOR_M)), pitch = rg.h / levels;
        for (let lv = 1; lv < levels; lv++) {
          const y = base + lv * pitch / this.mPerUnit;
          for (let q = 0; q < c.length; q++) {
            const a = c[q], d = c[(q + 1) % c.length];
            seg.push(proj.x(a[0]), y, proj.y(a[1]), proj.x(d[0]), y, proj.y(d[1]));
          }
        }
      });
      if (seg.length) {
        const sg = new THREE.BufferGeometry();
        sg.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
        this.gSro.add(new THREE.LineSegments(sg, this.matStorey));
      }
    });
  }

  // The policy painted on the massing: a converting building fades from the
  // colour of nobody displaced at the ground toward the displacement colour
  // at the roof; how red the roof gets is the share of its tenants who lose
  // their room, full red at half, the largest cut the Guidelines allow.
  gradient(mesh, i) {
    const strength = this.gradientOf(i);
    if (strength == null) return;
    const geo = mesh.geometry, col = geo.getAttribute("color"), pos = geo.getAttribute("position");
    if (!col || !pos) return;
    const y0 = mesh.userData.base || 0, span = Math.max(1e-6, (mesh.userData.top || 1) - y0);
    const base = new THREE.Color(hexOf(css("--scen-0"))), hot = new THREE.Color(hexOf(css("--scen-1"))), c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const f = Math.max(0, Math.min(1, (pos.getY(k) - y0) / span));
      c.copy(base).lerp(hot, f * strength);
      col.setXYZ(k, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  select() {
    this.clear(this.gSel);
    this.sroMeshes.forEach((m) => {
      if (m.userData.s !== this.sel) return;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 40), this.matSel);
      edges.position.copy(m.position); edges.scale.copy(m.scale);
      this.gSel.add(edges);
    });
  }

  build() {
    if (!this.ready || !this.data || !this.data.streets || !this.proj) return;
    this.scale();
    if (this.needFoot) { this.buildGround(); this.buildFoot(); this.buildStreets(); this.buildTrees(); this.needFoot = false; }
    this.buildSro();
    this.select();
    this.dirty = true;
  }

  // the hint text under the map: what the heights are
  hint() {
    let n = 0, est = 0, none = 0;
    this.data.surveyed.forEach((b) => { if (b.hgtM) n++; else if (b.lon != null) est++; });
    if (this.data.foot) this.data.foot.forEach((f) => { if (!f.h) none++; });
    return "Heights are the City’s 2009 LiDAR: " + n + " of the Appendix B buildings measured"
      + (est ? ", " + est + " estimated from room count" : "") + "."
      + (none ? " " + none.toLocaleString("en-CA") + " footprints with no reading stand at " + NOMINAL_H + " m." : "");
  }

  // ---- camera ----
  setPlan(on) {
    this.plan = on;
    this.camera = on ? this.ortho : this.persp;
    this.resize(); this.place(); this.dirty = true;
  }
  place() {
    const c = this.cam;
    if (this.plan) {
      this.ortho.position.set(c.tx, c.r, c.tz);
      this.ortho.up.set(0, 0, -1);
      this.ortho.lookAt(c.tx, 0, c.tz);
      const hh = c.r * Math.tan(20 * Math.PI / 180), aspect = this.persp.aspect || 1;
      this.ortho.left = -hh * aspect; this.ortho.right = hh * aspect; this.ortho.top = hh; this.ortho.bottom = -hh;
      this.ortho.updateProjectionMatrix(); this.ortho.updateMatrixWorld();
      return;
    }
    const sp = Math.max(0.12, Math.min(1.5, c.phi));
    this.camera.position.set(c.tx + c.r * Math.sin(sp) * Math.cos(c.theta), c.r * Math.cos(sp), c.tz + c.r * Math.sin(sp) * Math.sin(c.theta));
    this.camera.lookAt(c.tx, 0, c.tz);
    this.camera.updateMatrixWorld();
  }
  clamp() {
    const c = this.cam, proj = this.proj;
    c.r = Math.max(proj.W * 0.02, Math.min(proj.W * 2.2, c.r));
    c.tx = Math.max(-proj.W * 0.3, Math.min(proj.W * 1.3, c.tx));
    c.tz = Math.max(-proj.H * 0.3, Math.min(proj.H * 1.3, c.tz));
    c.phi = Math.max(0.12, Math.min(1.5, c.phi));
  }
  // Frame the district: pull the camera back until the ground rectangle the
  // stock sits on projects inside the canvas, whatever its aspect.
  fit() {
    if (!this.ready) return;
    const proj = this.proj, xs = [], zs = [];
    this.data.surveyed.forEach((b) => { if (b.lon != null) { xs.push(proj.x(b.lon)); zs.push(proj.y(b.lat)); } });
    const x0 = xs.length ? Math.min(...xs) : 0, x1 = xs.length ? Math.max(...xs) : proj.W;
    const z0 = zs.length ? Math.min(...zs) : 0, z1 = zs.length ? Math.max(...zs) : proj.H;
    this._zoomTarget = null; this.zoomAnchor = null;
    this.cam = { r: Math.max(x1 - x0, z1 - z0), theta: Math.PI / 2 + 0.5, phi: 1.12, tx: (x0 + x1) / 2, tz: (z0 + z1) / 2 };
    const corners = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]];
    for (let pass = 0; pass < 4; pass++) {
      this.place();
      let m = 0;
      corners.forEach((c) => { this.v.set(c[0], 0, c[1]).project(this.camera); m = Math.max(m, Math.abs(this.v.x), Math.abs(this.v.y)); });
      if (m > 0) this.cam.r *= m / 0.96;
    }
    this.clamp(); this.dirty = true;
  }
  zoom(f) { if (!this.ready) return; this.zoomTo(this.zoomTarget * f, null, null); }
  // Set where the zoom is heading; the loop eases the camera there over a few
  // frames and keeps the ground point under the cursor where it was.
  get zoomTarget() { return this._zoomTarget == null ? this.cam.r : this._zoomTarget; }
  zoomTo(r, ndc, ground) {
    const proj = this.proj;
    this._zoomTarget = Math.max(proj.W * 0.02, Math.min(proj.W * 2.2, r));
    this.zoomAnchor = ndc && ground ? { ndc, g: ground } : null;
    this.dirty = true;
  }
  easeZoom() {
    if (this._zoomTarget == null) return;
    const c = this.cam, d = this._zoomTarget - c.r;
    if (Math.abs(d) < c.r * 0.0005) { c.r = this._zoomTarget; this._zoomTarget = null; }
    else { c.r += d * EASE; this.dirty = true; }
    this.clamp(); this.place();
    const a = this.zoomAnchor;
    if (a) {
      const g1 = this.groundPointAt(a.ndc);
      if (g1) { c.tx += a.g.x - g1.x; c.tz += a.g.z - g1.z; this.clamp(); this.place(); }
    }
    if (this._zoomTarget == null) this.zoomAnchor = null;
  }
  resize() {
    if (!this.ready) return;
    const w = this.wrap.clientWidth || 600, h = this.wrap.clientHeight || Math.max(380, Math.round(w * 0.64));
    this.renderer.setSize(w, h, false);
    this.persp.aspect = w / h;
    this.persp.updateProjectionMatrix();
    if (this.plan) this.place();
    this.dirty = true;
  }

  // ---- picking ----
  ndcOf(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return this.ndc;
  }
  groundPoint(e) { return this.groundPointAt(this.ndcOf(e)); }
  groundPointAt(ndc) {
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObject(this.ground, false);
    return hits.length ? hits[0].point : null;
  }
  pick(e) {
    this.ray.setFromCamera(this.ndcOf(e), this.camera);
    const hits = this.ray.intersectObjects(this.sroMeshes, false);
    return hits.length ? hits[0].object : null;
  }
  toScreen(x, y, z) {
    this.v.set(x, y, z).project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: (this.v.x + 1) / 2 * r.width, y: (1 - this.v.y) / 2 * r.height,
             on: this.v.z < 1 && Math.abs(this.v.x) < 1.05 && Math.abs(this.v.y) < 1.05 };
  }

  bindPointer() {
    const el = this.renderer.domElement, pointers = new Map(), self = this;
    let down = null, lastPinch = 0;
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, e);
      if (pointers.size > 1) { down = null; return; }
      const orbit = e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey;
      if (orbit && self.plan) { self.cam.phi = 0.12; self.cam.theta = -Math.PI / 2; self.setPlan(false); if (self.onPlanChange) self.onPlanChange(false); }
      self._zoomTarget = null; self.zoomAnchor = null;
      down = { x: e.clientX, y: e.clientY, moved: false, orbit, theta: self.cam.theta, phi: self.cam.phi, g: self.groundPoint(e) };
      self.wrap.classList.toggle("orbiting", orbit);
      e.stopPropagation();
    });
    el.addEventListener("pointermove", (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e);
      if (pointers.size > 1) { pinch(); return; }
      if (!down) { hover(e); return; }
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
      if (!down.moved) return;
      self.onHover(null);
      if (down.orbit) {
        self.cam.theta = down.theta + dx * 0.006;
        self.cam.phi = down.phi - dy * 0.006;
      } else if (down.g) {
        const g = self.groundPoint(e);
        if (g) { self.cam.tx += down.g.x - g.x; self.cam.tz += down.g.z - g.z; }
      }
      self.clamp(); self.place(); self.dirty = true;
    });
    function end(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) lastPinch = 0;
      self.wrap.classList.remove("orbiting");
      if (!down) return;
      const d = down; down = null;
      if (d.moved || e.button === 2) return;
      const hit = self.pick(e);
      if (hit) self.onSelect(hit.userData.s);
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("contextmenu", (e) => { e.preventDefault(); });
    el.addEventListener("pointerleave", () => { self.hover = null; self.onHover(null); self.wrap.classList.remove("picking"); self.dirty = true; });
    el.addEventListener("wheel", (e) => {
      e.preventDefault(); e.stopPropagation();
      // the step follows the scroll distance, so a trackpad's many small
      // events add up to the same zoom as a mouse wheel's few large ones
      const ndc = self.ndcOf(e);
      self.zoomTo(self.zoomTarget * wheelZoom(e), { x: ndc.x, y: ndc.y }, self.groundPointAt(ndc));
    }, { passive: false });
    function pinch() {
      const pts = Array.from(pointers.values());
      if (pts.length < 2) return;
      const d = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      if (lastPinch) { self._zoomTarget = null; self.cam.r *= lastPinch / d; self.clamp(); self.dirty = true; }
      lastPinch = d;
    }
    function hover(e) {
      const hit = self.pick(e), s = hit ? hit.userData.s : null;
      self.wrap.classList.toggle("picking", s !== null);
      if (s === self.hover) return;
      self.hover = s; self.dirty = true;
      if (s === null) { self.onHover(null); return; }
      const u = hit.userData, q = self.toScreen(u.cx, u.top, u.cz);
      self.onHover({ i: s, x: q.x, y: q.y });
    }
  }

  // Building names when close enough that they can be read, skipping any that
  // would land on one already placed or on a street name.
  drawLabels() {
    const parts = [], placed = (this.namePlaced || []).slice(), esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const free = (x, y, w) => {
      for (let i = 0; i < placed.length; i++) if (Math.abs(placed[i][0] - x) < (placed[i][2] + w) / 2 && Math.abs(placed[i][1] - y) < 14) return false;
      placed.push([x, y, w]); return true;
    };
    const close = this.cam.r < this.proj.W * 0.22;
    this.sroMeshes.forEach((m) => {
      const u = m.userData, sel = u.s === this.sel;
      if (!close && !sel && u.s !== this.hover) return;
      const q = this.toScreen(u.cx, u.top, u.cz);
      if (!q.on) return;
      const name = this.data.surveyed[u.s].name, w = name.length * 6.2 + 8;
      if (!sel && !free(q.x, q.y, w)) return;
      parts.push('<span class="lbl' + (sel ? " sel" : "") + '" style="left:' + q.x.toFixed(0) + 'px;top:' + (q.y - 4).toFixed(0) + 'px">' + esc(name) + '</span>');
    });
    this.labels.innerHTML = parts.join("");
  }

  // ---- the loop ----
  start(onFail) {
    if (this.on) return;
    this.on = true;
    const loop = () => {
      if (!this.on) return;
      requestAnimationFrame(loop);
      if (!this.dirty) return;
      this.dirty = false;
      try {
        this.easeZoom();
        this.place(); this.placeNames();
        this.renderer.render(this.scene, this.camera);
        this.drawLabels();
      } catch (e) {
        this.on = false;
        if (onFail) onFail((e && e.message) ? e.message : String(e));
      }
    };
    loop();
  }
  stop() { this.on = false; }
  dispose() {
    this.stop();
    if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); }
    this.ready = false;
  }
}
