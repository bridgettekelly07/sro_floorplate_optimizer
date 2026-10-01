// Small formatting helpers shared by every component.

export function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString("en-CA"); }
export function pct(x) { return (Math.round(x * 1000) / 10) + "%"; }
export function pctInt(x) { return Math.round(x * 100) + "%"; }
export function money(n) { return "$" + Math.round(n).toLocaleString("en-CA"); }
export function count(n) { return (n || 0).toLocaleString("en-CA"); }
export function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }

export function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// 0 -> A, 25 -> Z, 26 -> AA
export function letter(n) {
  let s = "";
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}
