// The ground: a heightfield interpolated from the City's 1-metre contours,
// sampled bilinearly, in metres above the datum.
export function decodeTerrain(d) {
  if (!d || !d.heights) return null;
  const bin = atob(d.heights), n = bin.length / 2, h = new Float32Array(n);
  for (let i = 0; i < n; i++) h[i] = ((bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) - 100) / 10;
  const [lon0, lat0, lon1, lat1] = d.bbox, nx = d.nx, ny = d.ny;
  const lat0r = (lat0 + lat1) / 2, kx = 111320 * Math.cos(lat0r * Math.PI / 180), ky = 110540;
  const contours = decodeContours(d.contours);
  return {
    bbox: d.bbox, cell: d.cell, nx, ny, heights: h, contours, land: d.land || null,
    min: h.reduce((a, b) => Math.min(a, b), Infinity), max: h.reduce((a, b) => Math.max(a, b), -Infinity),
    // elevation in metres at a longitude and latitude; the edge value beyond the grid
    at(lon, lat) {
      const fx = (lon - lon0) * kx / d.cell, fy = (lat - lat0) * ky / d.cell;
      const i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(ny - 2, Math.floor(fy)));
      const tx = Math.max(0, Math.min(1, fx - i)), ty = Math.max(0, Math.min(1, fy - j));
      const a = h[j * nx + i], b = h[j * nx + i + 1], c = h[(j + 1) * nx + i], e = h[(j + 1) * nx + i + 1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty;
    }
  };
}

function decodeContours(c) {
  if (!c) return [];
  const o = c.origin, k = c.scale;
  return c.lines.map((e, n) => {
    const pts = []; let x = e[0], y = e[1];
    pts.push([o[0] + x * k, o[1] + y * k]);
    for (let i = 2; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; pts.push([o[0] + x * k, o[1] + y * k]); }
    return { z: c.levels[n], pts };
  });
}

export function decodeLines(d) {
  if (!d || !d.lines) return null;
  const o = d.origin, k = d.scale;
  return d.lines.map((e) => {
    const pts = []; let x = e[0], y = e[1];
    pts.push([o[0] + x * k, o[1] + y * k]);
    for (let i = 2; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; pts.push([o[0] + x * k, o[1] + y * k]); }
    return pts;
  });
}

export function decodeTrees(d) {
  if (!d || !d.x) return null;
  const o = d.origin, k = d.scale, out = [];
  let x = 0, y = 0;
  for (let i = 0; i < d.x.length; i++) {
    x += d.x[i]; y += d.y[i];
    out.push({ lon: o[0] + x * k, lat: o[1] + y * k, h: d.h[i] / 2, d: d.d[i] });
  }
  return out;
}

// The land mask as a small canvas, land one colour and water another, to be
// drawn scaled over the terrain's extent. Rows run from the south-west corner.
export function landCanvas(terrain, landColour, waterColour) {
  const m = terrain && terrain.land;
  if (!m || typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = m.nx; cv.height = m.ny;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = waterColour; ctx.fillRect(0, 0, m.nx, m.ny);
  ctx.fillStyle = landColour;
  m.rows.forEach((runs, j) => {
    let x = 0, land = false;
    const y = m.ny - 1 - j;                       // row 0 is the south edge; canvas row 0 is the top
    runs.forEach((n) => { if (land && n) ctx.fillRect(x, y, n, 1); x += n; land = !land; });
  });
  return cv;
}
