// Polygon helpers. Points are [lat, lng]. Used by the browser (preview) and the server (authoritative).
const R = 6378137, SQFT = 10.7639;
const toXY = (pts) => {
  const lat0 = (pts.reduce((s, p) => s + p[0], 0) / pts.length) * Math.PI / 180;
  return pts.map(([la, lo]) => [R * lo * Math.PI / 180 * Math.cos(lat0), R * la * Math.PI / 180]);
};
export function areaSqFt(pts) {
  const xy = toXY(pts); let a = 0;
  xy.forEach(([x1, y1], i) => { const [x2, y2] = xy[(i + 1) % xy.length]; a += x1 * y2 - x2 * y1; });
  return Math.abs(a) / 2 * SQFT;
}
const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0]);
const cross = (a, b, c, d) => ccw(a, c, d) * ccw(b, c, d) < 0 && ccw(a, b, c) * ccw(a, b, d) < 0;
export function selfIntersects(p) {
  const n = p.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (cross(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return true;
  }
  return false;
}
export const LIMITS = { minSqft: 100, maxSqft: 50000, maxSpanMeters: 250 };
export function validatePolygon(pts) {
  const ok = Array.isArray(pts) && pts.length >= 3 && pts.length <= 200 &&
    pts.every((p) => Array.isArray(p) && p.length === 2 && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180 && p.every(Number.isFinite));
  if (!ok) return { ok: false, error: 'Outline the project area with at least three points.' };
  if (selfIntersects(pts)) return { ok: false, error: 'The outline crosses itself. Clear it and draw the area again.' };
  const xy = toXY(pts), xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) > LIMITS.maxSpanMeters)
    return { ok: false, error: 'That outline is larger than a typical driveway. Zoom in and outline only the project area.' };
  const sqft = Math.round(areaSqFt(pts));
  if (sqft < LIMITS.minSqft || sqft > LIMITS.maxSqft) return { ok: false, error: 'The outlined area is outside the supported size range.' };
  return { ok: true, sqft };
}
