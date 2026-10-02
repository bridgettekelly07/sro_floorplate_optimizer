// The district in 3D: the same footprints, streets and Appendix B buildings
// as the map, raised to the height the City's 2009 LiDAR recorded for each
// footprint. Framework-free: the Svelte component owns the element and
// feeds this class its data, colours and selection.
import * as THREE from "three";
import { css, hexOf } from "./colours.js";
import { paintGround, waterWash } from "./groundTexture.js";
import { shoreDistance, shoreOutline, shoreField } from "./terrain.js";
import { landmarkOf, triangleEdges, roundCentre } from "./landmarks.js";
import { wheelZoom, EASE } from "./zoom.js";
import { FLOOR_M, NOMINAL_H, floorsOf } from "./typicalFloor.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { facadeLines, storeyLines } from "./facade.js";
import { curbRuns } from "./curbs.js";
import { paintCanopyAtlas, CANOPY_SEEDS, FASTIGIATE, drawnHeight } from "./canopy.js";
import { shadePark, toneOf, prng as parkPrng, PARK, hex as hexRgb, mix as mixRgb } from "./parkShade.js";
import { arterialPicks, segInside, ROAD } from "./projection.js";

const NAME_PX = 10, NAME_S = 4;   // street-name type size on screen, and the texture oversampling


// Graphite: a coarse break-up along the line's length plus a fine speckle in
// screen pixels, so the stroke reads as deposited on a tooth, not drawn by a pen.
const GRAIN_GLSL = `
uniform float uGrain, uGrainAmt;
varying vec3 vGrainPos;
float gHash( vec3 p ) { p = fract( p * 0.3183099 + vec3( 0.1, 0.2, 0.3 ) ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float gNoise( vec3 p ) {
  vec3 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( gHash( i ), gHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( gHash( i + vec3( 0, 1, 0 ) ), gHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( gHash( i + vec3( 0, 0, 1 ) ), gHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( gHash( i + vec3( 0, 1, 1 ) ), gHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
float graphite( vec3 p, vec2 px ) {
  float along = gNoise( p ) * 0.6 + gNoise( p * 3.1 ) * 0.4;        // pressure varying along the stroke
  float speck = gHash( vec3( floor( px / 1.5 ), 7.0 ) );              // the tooth of the paper
  float g = along * 0.65 + speck * 0.35;
  return smoothstep( 0.22, 0.62, g ) * 1.15;
}
`;

// procedural windows on the DTES buildings (facade.js): off for now
const WINDOWS = false;
const SHORE_FLAT = 30;   // metres inland held at sea level: the drawn shoreline wanders this far from the mask's edge
const SHORE_RISE = 60;   // metres over which the terrain then rises to its recorded height

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
  setData(data, proj) { this.data = data; this.proj = proj; this.needFoot = true; this.parkShades = null; this.shore = undefined; this.outline = undefined; this.shoreBytes = undefined; }
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
    // a bright sky and a soft sun, so roofs read white and walls a shade off; the
    // theme's --m3-exposure scales all three so dark mode stays dark
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xb5b2a9, 2.4); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.1); this.sun.position.set(-700, 600, 500); this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0xffffff, 0.5); this.fill.position.set(700, 300, -400); this.scene.add(this.fill);
    // the picking plane: the whole ground, drawn by nothing, so drags and clicks have a surface everywhere
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    // the void: the ground beyond the data, a frame around the terrain so nothing lies under it to fight its surface
    this.void = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xf4f1ea, side: THREE.DoubleSide }));
    this.scene.add(this.void);
    // unlit and flat: the drawing is carried by the ink edges, as in an axonometric line drawing
    this.matBldg = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.matLand = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matRoad = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matWalk = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matPark = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matTerrain = new THREE.MeshBasicMaterial({ color: 0xffffff });   // unlit: the painted ground at its own colour, the contours carry the slope
    // the water and the shoreline are the shader's: the ground texture is clear over water, and the
    // shoreline distance field decides, per pixel, whether to show it or the water wash beneath
    const one = (v, cs) => { const t = new THREE.DataTexture(new Uint8Array(v), 1, 1, THREE.RGBAFormat); if (cs) t.colorSpace = cs; t.needsUpdate = true; return t; };
    this.shoreMap = { value: one([255, 255, 255, 255]) };          // all land until the data arrives
    this.waterMap = { value: one([188, 196, 192, 255], THREE.SRGBColorSpace) };
    // the grid beyond the data continues over the water, drawn in the shader so it cannot fight the surface
    this.gridStep = { value: 1 }; this.gridOrigin = { value: new THREE.Vector2() }; this.gridColor = { value: new THREE.Color(0xdcd8ce) };
    this.matTerrain.customProgramCacheKey = () => "shore-terrain";
    this.matTerrain.onBeforeCompile = (sh) => {
      sh.uniforms.uShore = this.shoreMap; sh.uniforms.uWater = this.waterMap;
      sh.uniforms.uGridStep = this.gridStep; sh.uniforms.uGridOrigin = this.gridOrigin; sh.uniforms.uGridColor = this.gridColor;
      sh.vertexShader = sh.vertexShader
        .replace("void main() {", "varying vec2 vGroundXZ;\nvoid main() {")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvGroundXZ = (modelMatrix * vec4(position, 1.0)).xz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("void main() {", "uniform sampler2D uShore;\nuniform sampler2D uWater;\nuniform float uGridStep;\nuniform vec2 uGridOrigin;\nuniform vec3 uGridColor;\nvarying vec2 vGroundXZ;\nvoid main() {")
        .replace("#include <map_fragment>", `#include <map_fragment>
#ifdef USE_MAP
\tfloat sd = texture2D(uShore, vMapUv).r - 0.5;            // positive inland
\tfloat aa = fwidth(sd) * 0.75;
\tfloat land = smoothstep(-aa, aa, sd);
\tvec3 water = texture2D(uWater, vMapUv).rgb;
\tvec2 gp = (vGroundXZ - uGridOrigin) / uGridStep;          // grid cells; a line at every whole number
\tvec2 gd = abs(fract(gp - 0.5) - 0.5) / max(fwidth(gp), vec2(1e-6));
\tfloat line = 1.0 - min(min(gd.x, gd.y), 1.0);              // one pixel wide, anti-aliased
\twater = mix(water, uGridColor, line);
\tdiffuseColor.rgb = mix(water, diffuseColor.rgb, land);
\tdiffuseColor.a = 1.0;
#endif`);
    };
    // contours: dashed, in the contour colour on the land and white over the parks
    const dashed = (opacity) => new THREE.LineDashedMaterial({ color: 0x000000, transparent: true, opacity, dashSize: 1, gapSize: 1 });
    this.matContour = dashed(0.45); this.matContour5 = dashed(0.85);
    this.matContourPark = dashed(0.8); this.matContourPark5 = dashed(1);
    this.matGrass = new THREE.LineBasicMaterial({ vertexColors: true });   // the grass strokes carry their own colour
    // canopies: a painted lobed canopy from the atlas on a quad that always faces
    // the camera; cut out by alpha, so nothing is translucent
    this.matTree = new THREE.MeshBasicMaterial({ color: 0xffffff, alphaTest: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 1 });
    this.matTree.customProgramCacheKey = () => "canopy-billboard";
    this.matTree.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("void main() {", "attribute float aCell;\nattribute float aFlip;\nuniform float uLift;\nvoid main() {")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\n\tvMapUv = vec2(((aFlip > 0.5 ? 1.0 - uv.x : uv.x) + aCell) / " + CANOPY_SEEDS.length.toFixed(1) + ", uv.y);")
        .replace("#include <project_vertex>", `
\tvec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
\tvec2 sc = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
\tmvPosition.xy += position.xy * sc;
\tmvPosition.z += uLift;   // toward the camera, in front of the trunk
\tgl_Position = projectionMatrix * mvPosition;`);
      sh.uniforms.uLift = this.canopyLift;
    };
    this.canopyLift = { value: 0 };
    this.matTrunk = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // building edges: screen-width lines, colour and width from the theme
    // tokens, with a graphite grain worked into the shader so the line breaks
    // up like pencil on paper instead of printing as a solid rule
    const edgePen = () => {
      const m = new LineMaterial({ color: 0x000000, linewidth: 1, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      m.uniforms.uGrain = { value: 1 }; m.uniforms.uGrainAmt = { value: 0.6 };
      m.customProgramCacheKey = () => "graphite";
      m.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader
          .replace("void main() {", "varying vec3 vGrainPos;\nvoid main() {\n\tvGrainPos = ( modelMatrix * vec4( position.y < 0.5 ? instanceStart : instanceEnd, 1.0 ) ).xyz;")
        sh.fragmentShader = sh.fragmentShader
          .replace("void main() {", GRAIN_GLSL + "\nvoid main() {")
          .replace("gl_FragColor = vec4( diffuseColor.rgb, alpha );", "alpha *= mix( 1.0, graphite( vGrainPos * uGrain, gl_FragCoord.xy ), uGrainAmt );\n\tgl_FragColor = vec4( diffuseColor.rgb, alpha );");
      };
      return m;
    };
    this.matEdge = edgePen(); this.matEdgeSro = edgePen();
    this.matWin = edgePen(); this.matWin.opacity = 0.7;   // the windows: a finer line than the edges
    this.matCurb = edgePen(); this.matCurb.opacity = 0.8;  // the curb lines along the streets
    this.matSel = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.matGrid = new THREE.LineBasicMaterial({ color: 0xdcd8ce });   // the grid over the ground beyond the data
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
    const exposure = parseFloat(css("--m3-exposure")) || 1;
    this.hemi.intensity = 2.4 * exposure; this.sun.intensity = 1.1 * exposure; this.fill.intensity = 0.5 * exposure;
    this.void.material.color.set(css("--m3-void") || css("--m3-sky") || "#f4f1ea");   // beyond the data: a plain ground with a grid
    this.matGrid.color.set(css("--m3-grid") || "#dcd8ce");
    this.gridColor.value.set(css("--m3-grid") || "#dcd8ce");
    this.matLand.color.set(css("--m3-ground") || "#f4f1ea");
    this.matRoad.color.set(css("--m3-road") || "#e3dfd5");
    this.matWalk.color.set(css("--m3-walk") || "#ece8de");
    this.matPark.color.set(css("--m3-park") || "#dfe7db");
    this.matSel.color.set(css("--ink") || "#1d2320");
    this.matStorey.color.set(css("--ink") || "#1d2320");
    this.matEdge.color.set(css("--m3-edge") || "#b9b4a8");
    this.edgeW = parseFloat(css("--m3-edge-w")) || 1;
    this.matEdgeSro.color.set(css("--m3-edge-sro") || "#6b665c");
    this.edgeWSro = parseFloat(css("--m3-edge-sro-w")) || 1.6;
    const grain = parseFloat(css("--m3-edge-grain"));
    this.matEdge.uniforms.uGrainAmt.value = this.matEdgeSro.uniforms.uGrainAmt.value = this.matWin.uniforms.uGrainAmt.value = this.matCurb.uniforms.uGrainAmt.value = Number.isFinite(grain) ? grain : 0.6;
    this.matWin.color.set(css("--m3-edge") || "#2b2b2b");
    this.matCurb.color.set(css("--m3-road-line") || "#2b2b2b");
    this.edgeScale();
    this.matContour.color.set(css("--m3-contour") || "#bfb9aa");
    this.matContour5.color.set(css("--m3-contour") || "#bfb9aa");
    this.matContourPark.color.set(css("--m3-contour-park") || "#ffffff");
    this.matContourPark5.color.set(css("--m3-contour-park") || "#ffffff");
    this.matTree.color.set(0xffffff);   // the atlas carries the greens
    const treeA = parseFloat(css("--m3-tree-alpha"));
    this.matTree.opacity = Number.isFinite(treeA) ? treeA : 1;
    this.matTree.transparent = this.matTree.opacity < 1;
    this.matTrunk.color.set(css("--m3-trunk") || "#8b7d6b");
    this.needFoot = true; this.dirty = true;
  }

  // ---- geometry ----
  clear(g) {
    while (g.children.length) {
      const o = g.children[0];
      o.traverse((c) => { if (c.geometry) c.geometry.dispose(); });   // materials are shared and kept
      g.remove(o);
    }
  }

  // the ground's height in scene units at a point in projection units
  yAt(x, z) {
    const t = this.data && this.data.terrain;
    if (!t) return 0;
    return this.groundM(x, z, t.at(this.proj.lon(x), this.proj.lat(z))) / this.mPerUnit;
  }
  // the drawn ground height in metres for a recorded one: the sea bed is held at sea level, so the
  // painted water sits on the terrain; the land is held there too for SHORE_FLAT metres and then
  // eases up over SHORE_RISE, so the shoreline lies on a flat surface rather than on the 15 m steps
  // between a sea cell and the seawall beside it. Everything draped on the ground reads through this.
  groundM(x, z, h) {
    let y = Math.max(0, h);
    if (y > 0 && this.shore) { const r = Math.max(0, Math.min(1, (this.shore.inland(x, z) - SHORE_FLAT) / SHORE_RISE)); y *= r * r * (3 - 2 * r); }
    return y;
  }
  // the lowest ground under a ring, so a building on a slope sits in it, not over it
  baseOf(ring) {
    let y = Infinity;
    for (const p of ring) y = Math.min(y, this.yAt(this.proj.x(p[0]), this.proj.y(p[1])));
    return y === Infinity ? 0 : y;
  }

  // One merged geometry from many rings: a triangulated roof and one quad per
  // edge, coloured per vertex so a single draw covers the whole district. The
  // ink edges come out with it: the roof outline and a vertical at every
  // corner that turns more than a few degrees, cheaper than finding them after.
  extrude(items) {
    const proj = this.proj, pos = [], col = [], edge = [], groundLift = 0.06 / this.mPerUnit;
    this.lastEdges = edge;
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
        const a = xz[i], q = xz[(i + 1) % xz.length], p = xz[(i + xz.length - 1) % xz.length];
        push(a[0], y0, a[1], 1); push(q[0], y0, q[1], 1); push(q[0], y, q[1], 1);
        push(a[0], y0, a[1], 1); push(q[0], y, q[1], 1); push(a[0], y, a[1], 1);
        edge.push(a[0], y, a[1], q[0], y, q[1]);                        // the roof outline
        // where the wall meets the ground: draped on the terrain, in a few pieces on a long wall
        const wl = Math.hypot(q[0] - a[0], q[1] - a[1]) * this.mPerUnit, pieces = Math.max(1, Math.min(5, Math.ceil(wl / 8)));
        let gx = a[0], gz = a[1], gy = this.yAt(gx, gz) + groundLift;
        for (let k = 1; k <= pieces; k++) {
          const t = k / pieces, hx = a[0] + (q[0] - a[0]) * t, hz = a[1] + (q[1] - a[1]) * t, hy = this.yAt(hx, hz) + groundLift;
          edge.push(gx, gy, gz, hx, hy, hz); gx = hx; gz = hz; gy = hy;
        }
        const ux = a[0] - p[0], uz = a[1] - p[1], vx = q[0] - a[0], vz = q[1] - a[1];
        const cross = ux * vz - uz * vx, dot = ux * vx + uz * vz;
        if (Math.abs(Math.atan2(cross, dot)) > 0.35) edge.push(a[0], y0, a[1], a[0], y, a[1]);   // a corner over 20°
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }
  // a footprint ring as façade input: scene units, not closed
  facadeItem(pts, h, base, narrow, shop) {
    const c = pts.slice();
    if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
    return { xz: c.map((p) => [this.proj.x(p[0]), this.proj.y(p[1])]), h, base, narrow, shop };
  }
  fatLines(positions, mat) {
    if (!positions.length) return null;
    const g = new LineSegmentsGeometry();
    g.setPositions(positions);
    const l = new LineSegments2(g, mat);
    l.computeLineDistances();
    return l;
  }
  // the ink edges of the last extrude(), as lines with a screen width
  edgeLines(mat) {
    const g = new LineSegmentsGeometry();
    g.setPositions(this.lastEdges);
    const l = new LineSegments2(g, mat);
    l.computeLineDistances();
    return l;
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
  // the shader's two textures over the ground's extent: the shoreline field and the water wash
  setShoreMaps(ext) {
    const f = this.shoreBytes;
    const sh = f ? new THREE.DataTexture(f.data, f.w, f.h, THREE.RedFormat) : null;
    if (sh) { sh.flipY = true; sh.minFilter = THREE.LinearMipmapLinearFilter; sh.magFilter = THREE.LinearFilter; sh.generateMipmaps = true; sh.needsUpdate = true; }
    const w = new THREE.CanvasTexture(waterWash(css("--m3-water") || "#d9e0df", ext.x0, ext.z0, ext.x1 - ext.x0, ext.z1 - ext.z0, this.mPerUnit, 1024, this.shore));
    w.colorSpace = THREE.SRGBColorSpace;
    if (this.shoreMap.value) this.shoreMap.value.dispose();
    if (this.waterMap.value) this.waterMap.value.dispose();
    this.shoreMap.value = sh || this.oneLand(); this.waterMap.value = w;
  }
  oneLand() { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat); t.needsUpdate = true; return t; }

  buildGround() {
    this.clear(this.gGround);
    const proj = this.proj, t = this.data.terrain;
    // the heightfield covers the streets' extent, which runs wider than the map's frame
    const bb = t ? t.bbox : proj.bbox;
    const ext = { x0: proj.x(bb[0]), x1: proj.x(bb[2]), z0: proj.y(bb[3]), z1: proj.y(bb[1]) };
    if (!this.parkShades) this.parkShades = this.shadeParks();   // no colour in it, so it survives a theme change
    if (this.shore === undefined) this.shore = t ? shoreDistance(t, proj) : null;
    if (this.outline === undefined) this.outline = t ? shoreOutline(t) : null;
    if (this.shoreBytes === undefined) this.shoreBytes = this.outline ? shoreField(this.outline, t.land.nx, t.land.ny, t.land.cell || this.shore.cellM) : null;
    this.setShoreMaps(ext);
    const cv = paintGround(proj, this.data, this.renderer.capabilities.maxTextureSize, ext, bb, this.parkShades, this.shore, this.outline);
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
        pos.push(x, this.groundM(x, z, t.heights[j * nx + i]) / this.mPerUnit, z);
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
    this.buildGrid(ext);
    this.buildContours();
  }
  // The City's 1-metre contours, laid just above the ground they describe:
  // every metre faint, every fifth metre stronger.
  buildContours() {
    const t = this.data.terrain, proj = this.proj;
    if (!t || !t.contours.length) return;
    const lift = 0.25 / this.mPerUnit, u = 1 / this.mPerUnit;
    const inPark = this.parkMask();
    // four runs: land / park, by metre / by five metres; each carries the
    // distance along its contour so the dashes run continuously through it
    const runs = { one: { pos: [], dist: [] }, five: { pos: [], dist: [] }, pone: { pos: [], dist: [] }, pfive: { pos: [], dist: [] } };
    t.contours.forEach((c) => {
      if (c.z < 0) return;   // below sea level: under the water, not drawn
      const isFive = Math.abs(c.z % 5) < 1e-6;
      let d = 0, ax = proj.x(c.pts[0][0]), az = proj.y(c.pts[0][1]), ay = this.yAt(ax, az) + lift;
      for (let i = 1; i < c.pts.length; i++) {
        const b = c.pts[i], bx = proj.x(b[0]), bz = proj.y(b[1]), by = this.yAt(bx, bz) + lift;
        const len = Math.hypot(bx - ax, bz - az), park = inPark((ax + bx) / 2, (az + bz) / 2);
        const run = runs[(park ? "p" : "") + (isFive ? "five" : "one")];
        run.pos.push(ax, ay, az, bx, by, bz); run.dist.push(d, d + len);
        d += len; ax = bx; az = bz; ay = by;
      }
    });
    [["one", this.matContour], ["five", this.matContour5], ["pone", this.matContourPark], ["pfive", this.matContourPark5]].forEach(([k, mat]) => {
      const run = runs[k];
      if (!run.pos.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(run.pos, 3));
      g.setAttribute("lineDistance", new THREE.Float32BufferAttribute(run.dist, 1));
      mat.dashSize = 2.4 * u; mat.gapSize = 1.6 * u;
      this.gGround.add(new THREE.LineSegments(g, mat));
    });
  }
  // Curb lines for the streets inside the surveyed extent, as crisp geometry
  // draped on the ground; the context outside keeps the softer painted line.
  buildCurbs() {
    const streets = this.data.streets, proj = this.proj;
    if (!streets) return;
    const u = 1 / this.mPerUnit;
    const picked = streets.segments.filter((sg) => segInside(sg.c, proj.bbox)).map((sg) => ({
      pts: sg.c.map((p) => [proj.x(p[0]), proj.y(p[1])]),
      hw: (ROAD.pave[sg.u] || ROAD.pave[0]) / 2 * u,
    }));
    const runs = curbRuns(picked, 1.5 * u, { slack: 0.25 * u });
    const lift = 0.08 * u, pos = [];
    runs.forEach((r) => {
      let [ax, az] = r[0], ay = this.yAt(ax, az) + lift;
      for (let i = 1; i < r.length; i++) {
        const [bx, bz] = r[i], by = this.yAt(bx, bz) + lift;
        pos.push(ax, ay, az, bx, by, bz); ax = bx; az = bz; ay = by;
      }
    });
    const l = this.fatLines(new Float32Array(pos), this.matCurb);
    if (l) this.gGround.add(l);
  }
  // Every park's shading, read from the contour lines that run through it
  shadeParks() {
    const parks = this.data.ground && this.data.ground.parks, t = this.data.terrain, proj = this.proj, out = new Map();
    if (!parks || !t || !t.contours.length) return out;
    const u = 1 / this.mPerUnit;
    const levels = [...new Set(t.contours.map((c) => c.z))].sort((a, b) => a - b);
    const step = levels.length > 1 ? levels[1] - levels[0] : 2;
    const segs = [];
    t.contours.forEach((c) => { for (let i = 1; i < c.pts.length; i++) { const a = c.pts[i - 1], b = c.pts[i]; segs.push({ ax: proj.x(a[0]), az: proj.y(a[1]), bx: proj.x(b[0]), bz: proj.y(b[1]), z: c.z }); } });
    const height = (x, z) => t.at(proj.lon(x), proj.lat(z));
    parks.forEach((p, pi) => {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      p.r.forEach((q) => { const x = proj.x(q[0]), z = proj.y(q[1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      const w = x1 - x0, h = z1 - z0;
      if (w <= 0 || h <= 0) return;
      const margin = 60 * u, near = segs.filter((sg) => Math.max(sg.ax, sg.bx) >= x0 - margin && Math.min(sg.ax, sg.bx) <= x1 + margin && Math.max(sg.az, sg.bz) >= z0 - margin && Math.min(sg.az, sg.bz) <= z1 + margin);
      const res = Math.max(1 * u, Math.sqrt((w * h) / 1.2e6));   // a metre, coarser only for a very large park
      out.set(pi, shadePark({ x0, z0, w, h }, res, near, step, p.r.map((q) => [proj.x(q[0]), proj.y(q[1])]), height));
    });
    return out;
  }
  // Grass strokes over the parks: short leaning lines draped on the ground,
  // coloured between the ground tone and the stroke colour, more and darker
  // the lower the ground sits in its park. Geometry, so crisp at any zoom.
  buildGrass() {
    const parks = this.data.ground && this.data.ground.parks, shades = this.parkShades;
    if (!parks || !shades) return;
    const hi = css("--m3-park") || "#dfe7db", lo = css("--m3-park-low") || hi, S = hexRgb(css("--m3-park-stipple") || "#5f6e48");
    const u = 1 / this.mPerUnit, lift = 0.1 * u, pos = [], col = [], tmp = new THREE.Color();
    parks.forEach((p, pi) => {
      const sh = shades.get(pi);
      if (!sh) return;
      const { box } = sh, r = parkPrng(97 + pi), n = Math.min(40000, Math.round((box.w * box.h) * this.mPerUnit * this.mPerUnit / PARK.strokePer * 0.6));
      for (let i = 0; i < n; i++) {
        const x = box.x0 + r() * box.w, z = box.z0 + r() * box.h, smp = sh.sample(x, z);
        if (!smp) continue;
        const low = smp.lowness;
        if (r() > 0.45 + 0.55 * low) continue;   // sparser on the high ground
        const len = (PARK.strokeLen[0] + r() * (PARK.strokeLen[1] - PARK.strokeLen[0])) * u, a = PARK.strokeLean + (r() - 0.5) * PARK.strokeSpread;
        const bx = x + Math.cos(a) * len, bz = z + Math.sin(a) * len;
        const c = mixRgb(toneOf(smp, sh, hi, lo), S, PARK.strokeMix[0] + (PARK.strokeMix[1] - PARK.strokeMix[0]) * low);
        tmp.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
        pos.push(x, this.yAt(x, z) + lift, z, bx, this.yAt(bx, bz) + lift, bz);
        col.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b);
      }
    });
    if (!pos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.gGround.add(new THREE.LineSegments(g, this.matGrass));
  }
  // a quick raster of the parks over the terrain, to ask whether a point is in one
  parkMask() {
    const parks = this.data.ground && this.data.ground.parks, t = this.data.terrain, proj = this.proj;
    if (!parks || !parks.length || !t) return () => false;
    const x0 = proj.x(t.bbox[0]), x1 = proj.x(t.bbox[2]), z0 = proj.y(t.bbox[3]), z1 = proj.y(t.bbox[1]);
    const W = 2048, H = Math.max(1, Math.round(W * (z1 - z0) / (x1 - x0)));
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff";
    parks.forEach((p) => {
      ctx.beginPath();
      p.r.forEach((q, i) => { const x = (proj.x(q[0]) - x0) / (x1 - x0) * W, y = (proj.y(q[1]) - z0) / (z1 - z0) * H; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath(); ctx.fill();
    });
    const px = ctx.getImageData(0, 0, W, H).data;
    return (x, z) => {
      const i = Math.floor((x - x0) / (x1 - x0) * W), j = Math.floor((z - z0) / (z1 - z0) * H);
      if (i < 0 || j < 0 || i >= W || j >= H) return false;
      return px[(j * W + i) * 4] > 127;
    };
  }
  // Footprints that an SRO already stands on are drawn by the SRO itself.
  buildFoot() {
    this.clear(this.gFoot);
    const foot = this.data.foot;
    if (!foot) return;
    const skip = {};
    this.data.surveyed.forEach((b) => { if (b.foot != null) skip[b.foot] = true; });
    // a second 2015 footprint on an SRO's lot (Creekside's north slab) would stand over its massing: the massing replaces it
    const mass = this.data.mass, cen = (r) => [r.reduce((t, q) => t + q[0], 0) / r.length, r.reduce((t, q) => t + q[1], 0) / r.length];
    const within = (c, r) => { let k = false; for (let a = 0, z = r.length - 1; a < r.length; z = a++) if ((r[a][1] > c[1]) !== (r[z][1] > c[1]) && c[0] < (r[z][0] - r[a][0]) * (c[1] - r[a][1]) / (r[z][1] - r[a][1]) + r[a][0]) k = !k; return k; };
    const parts = [];
    if (mass) mass.forEach((rec) => { if (rec) rec.parts.forEach((p) => parts.push({ r: p.r, c: cen(p.r), b: [Math.min(...p.r.map((q) => q[0])), Math.min(...p.r.map((q) => q[1])), Math.max(...p.r.map((q) => q[0])), Math.max(...p.r.map((q) => q[1]))] })); });
    foot.forEach((f, i) => {
      if (skip[i]) return;
      const c = cen(f.p);
      if (parts.some((p) => f.b[2] >= p.b[0] && f.b[0] <= p.b[2] && f.b[3] >= p.b[1] && f.b[1] <= p.b[3] && (within(c, p.r) || within(p.c, f.p)))) skip[i] = true;
    });
    const colour = new THREE.Color(css("--m3-bldg") || "#d8d2c3"), items = [], faces = [], domes = [];
    for (let i = 0; i < foot.length; i++) {
      if (skip[i]) continue;
      const lm = landmarkOf(foot[i].p);
      const h = lm ? lm.baseH : (foot[i].h || NOMINAL_H), base = this.baseOf(foot[i].p);
      items.push({ pts: foot[i].p, h, col: colour, base });
      if (foot[i].h) faces.push(this.facadeItem(foot[i].p, h, base, false, true));   // only a measured height gets a façade
      if (lm && lm.dome) domes.push({ ring: foot[i].p, base, dome: lm.dome });
    }
    // the city around the surveyed extent: the 2009 footprints at their LiDAR heights
    (this.data.context || []).forEach((f) => {
      items.push({ pts: f.p, h: f.h || NOMINAL_H, col: colour, base: this.baseOf(f.p) });
    });
    const geo = this.extrude(items);
    this.gFoot.add(new THREE.Mesh(geo, this.matBldg));
    this.gFoot.add(this.edgeLines(this.matEdge));
    domes.forEach((d) => this.addDome(d, colour));
    // the DTES footprints get floor lines and windows; the 2009 context stays plain
    if (WINDOWS) { const win = this.fatLines(facadeLines(faces, this.mPerUnit), this.matWin); if (win) this.gFoot.add(win); }
    const st = storeyLines(faces, this.mPerUnit);
    if (st.length) this.gFoot.add(new THREE.LineSegments(this.flatGeo(st), this.matStorey));
  }
  // Beyond the data there is nothing to show, so the plane there is plain and carries a simple grid,
  // on lines a set number of metres apart, aligned so a line falls on each edge of the data's extent.
  // The terrain covers the grid where there is data.
  // The lines stop at the data's extent: inside it the water shader draws the same grid, so the two
  // never overlap and fight for the surface.
  buildGrid(ext) {
    const stepM = parseFloat(css("--m3-grid-m")) || 200, step = stepM / this.mPerUnit;
    this.gridStep.value = step; this.gridOrigin.value.set(ext.x0, ext.z0);
    const gx0 = this.ground.position.x - this.ground.scale.x / 2, gz0 = this.ground.position.z - this.ground.scale.y / 2;
    const gx1 = gx0 + this.ground.scale.x, gz1 = gz0 + this.ground.scale.y, y = -0.03, pos = [];
    // the void as four quads around the data
    const vy = -0.05, q = [], quad = (x0, z0, x1, z1) => { q.push(x0, vy, z0, x1, vy, z0, x1, vy, z1, x0, vy, z0, x1, vy, z1, x0, vy, z1); };
    quad(gx0, gz0, gx1, ext.z0); quad(gx0, ext.z1, gx1, gz1); quad(gx0, ext.z0, ext.x0, ext.z1); quad(ext.x1, ext.z0, gx1, ext.z1);
    this.void.geometry.dispose(); this.void.geometry = this.flatGeo(q);
    const from = (a, o) => o + Math.ceil((a - o) / step) * step;
    const eps = step * 1e-3;
    for (let x = from(gx0, ext.x0); x <= gx1; x += step) {
      if (x > ext.x0 + eps && x < ext.x1 - eps) { pos.push(x, y, gz0, x, y, ext.z0, x, y, ext.z1, x, y, gz1); }   // broken where the data lies
      else pos.push(x, y, gz0, x, y, gz1);
    }
    for (let z = from(gz0, ext.z0); z <= gz1; z += step) {
      if (z > ext.z0 + eps && z < ext.z1 - eps) { pos.push(gx0, y, z, ext.x0, y, z, ext.x1, y, z, gx1, y, z); }
      else pos.push(gx0, y, z, gx1, y, z);
    }
    this.gGround.add(new THREE.LineSegments(this.flatGeo(pos), this.matGrid));
  }
  // A geodesic sphere on a landmark's footprint: an icosahedron at the building's colour, its
  // triangles' edges in ink, centred on the round part of the footprint and resting on the ground.
  addDome({ ring, base, dome }, colour) {
    const proj = this.proj, u = this.mPerUnit;
    const lat = ring[0][1], kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 110540;
    const c = roundCentre(ring, kx, ky), cx = proj.x(c.x), cz = proj.y(c.y);
    const r = dome.r / u, g = new THREE.IcosahedronGeometry(r, dome.detail || 3);
    g.translate(cx, base + r + (dome.lift || 0) / u, cz);   // the centre a radius up, plus the lift
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[3 * i] = colour.r; col[3 * i + 1] = colour.g; col[3 * i + 2] = colour.b; }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.gFoot.add(new THREE.Mesh(g, this.matBldg));
    const edges = this.fatLines(triangleEdges(g.attributes.position.array, g.index ? g.index.array : null), this.matEdge);
    if (edges) this.gFoot.add(edges);
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
    // the atlas, painted in the theme's greens; which cell and whether to mirror, per tree
    if (this.matTree.map) this.matTree.map.dispose();
    const atlas = new THREE.CanvasTexture(paintCanopyAtlas(256, css("--m3-tree") || "#a3c184", css("--m3-tree-dark") || "#5f7f4b"));
    atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
    this.matTree.map = atlas; this.matTree.needsUpdate = true;
    this.canopyLift.value = 0.6 * u;   // 60 cm toward the camera, past any trunk
    const canopyGeo = new THREE.PlaneGeometry(1, 1), cell = new Float32Array(n), flip = new Float32Array(n);
    let seed = 5;
    const next = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    // no mirroring: the shade stays to the lower right on every tree, one light for the whole drawing
    for (let i = 0; i < n; i++) { cell[i] = Math.floor(next() * CANOPY_SEEDS.length); flip[i] = 0; }
    canopyGeo.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 1));
    canopyGeo.setAttribute("aFlip", new THREE.InstancedBufferAttribute(flip, 1));
    const canopy = new THREE.InstancedMesh(canopyGeo, this.matTree, n);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), this.matTrunk, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    trees.forEach((t, i) => {
      const x = proj.x(t.lon), z = proj.y(t.lat), y = this.yAt(x, z), h = drawnHeight(t.h);   // the class, squeezed to 15..60 ft
      // the City's diameter, capped: a few records carry unit slips (one reads 66 m) that would draw a trunk the size of a lot
      const r = Math.max(1, Math.min(6, h * 0.28)), dia = Math.max(0.15, Math.min(1.2, t.d / 100));
      // the quad is as wide as the canopy's reach (lobes run to about 1.25 radii); its scale is read by the shader
      pos.set(x, y + h * 0.62 * u, z); scl.set(r * 2.3 * u, r * 2.3 * FASTIGIATE * u, 1);   // the quad has the atlas cell's aspect
      canopy.setMatrixAt(i, m.compose(pos, q, scl));
      // the trunk runs up to the canopy's centre; the canopy quad sits a little
      // toward the camera, so its paint covers the trunk's top from any angle
      pos.set(x, y + h * 0.31 * u, z); scl.set(dia * 0.5 * u, h * 0.62 * u, dia * 0.5 * u);
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
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), new THREE.MeshBasicMaterial({ color: colour }));
        mesh.scale.set(rr, y, rr);
        mesh.position.set(cx, base + y / 2, cz);
      }
      mesh.userData = { s: i, cx, cz, base, top: base + top / this.mPerUnit, est: !b.hgtM };
      this.gradient(mesh, i);
      this.gSro.add(mesh);
      if (rec || pts) {
        this.gSro.add(this.edgeLines(this.matEdgeSro));
        if (WINDOWS) {
          const faces = rec ? rec.parts.map((p) => this.facadeItem(p.r, p.h || NOMINAL_H, base, true, true)) : [this.facadeItem(pts, h, base, true, true)];
          const win = this.fatLines(facadeLines(faces, this.mPerUnit), this.matWin);
          if (win) this.gSro.add(win);
        }
      }
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
    if (this.needFoot) { this.buildGround(); this.buildGrass(); this.buildCurbs(); this.buildFoot(); this.buildStreets(); this.buildTrees(); this.needFoot = false; }
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
  // The edges keep their screen width up close, then thin and fade as the
  // camera pulls back, or at the city scale they would merge into a wash.
  edgeScale() {
    if (!this.cam) return;
    const W = this.proj.W, r = this.cam.r;
    const f = Math.max(0, Math.min(1, (Math.log(W * 0.9) - Math.log(r)) / (Math.log(W * 0.9) - Math.log(W * 0.08))));
    this.matEdge.linewidth = this.edgeW * f; this.matEdge.opacity = 0.8 * Math.min(1, f * 1.5);
    this.matEdgeSro.linewidth = this.edgeWSro * f; this.matEdgeSro.opacity = 0.8 * Math.min(1, f * 1.5);
    this.matEdge.visible = this.matEdgeSro.visible = f > 0.02;
    // the windows are finer and go first, gone by the time the edges are half width
    const g = Math.max(0, Math.min(1, (f - 0.45) / 0.55));
    this.matWin.linewidth = this.edgeW * 0.6 * g; this.matWin.opacity = 0.7 * g; this.matWin.visible = g > 0.02;
    this.matCurb.linewidth = this.edgeW * 0.7 * f; this.matCurb.opacity = 0.8 * Math.min(1, f * 1.5); this.matCurb.visible = f > 0.02;
    // grain cells of about 0.35 m along the edge
    this.matEdge.uniforms.uGrain.value = this.matEdgeSro.uniforms.uGrain.value = this.matWin.uniforms.uGrain.value = this.matCurb.uniforms.uGrain.value = this.mPerUnit / 0.35;
  }
  place() {
    const c = this.cam;
    this.edgeScale();
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
    this.matEdge.resolution.set(w, h); this.matEdgeSro.resolution.set(w, h); this.matWin.resolution.set(w, h); this.matCurb.resolution.set(w, h);
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
