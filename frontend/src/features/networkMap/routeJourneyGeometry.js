/**
 * routeJourneyGeometry.js
 *
 * Pure geometry/classification helpers for the ĐTC2 (Mạng đường thư cấp 2)
 * journey visual remediation. No React/Leaflet dependency — safe to unit
 * test directly with `node --test`. Leaflet-specific pixel-projection glue
 * (map.latLngToLayerPoint / layerPointToLatLng) lives in Level2RoutesMap.jsx
 * and consumes these functions.
 *
 * Never mutates or replaces the real `stop.lat`/`stop.lon` values — every
 * function here either classifies/derives metadata or returns *additional*
 * offset coordinates for display only.
 */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Compass bearing (0-360, 0 = North) from point 1 to point 2.
 */
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Finds the "turnaround" (quay đầu) stop of a there-and-back journey: the
 * stop with the greatest straight-line distance from the route's first
 * stop. This is a visual heuristic, not a ground-truth business field — it
 * matches the PO's own example (Route 6: Lăng Cô, the farthest point from
 * BCVH Phú Lộc, is stop #4 of 6 and the maximum-distance stop).
 *
 * Returns null when there are fewer than 3 geo-valid stops (no meaningful
 * turnaround concept — a straight A→B leg or a single point).
 */
export function computeTurnaroundIndex(stops) {
  if (!stops || stops.length < 3) return null;
  const start = stops[0];
  if (typeof start.lat !== 'number' || typeof start.lon !== 'number') return null;

  let maxDist = -1;
  let maxIdx = null;
  stops.forEach((s, idx) => {
    if (typeof s.lat !== 'number' || typeof s.lon !== 'number') return;
    const d = haversineKm(start.lat, start.lon, s.lat, s.lon);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = idx;
    }
  });

  // The turnaround only means something if it isn't the very first or very
  // last stop (a monotonically-increasing one-way route has no return leg).
  if (maxIdx === null || maxIdx === 0 || maxIdx === stops.length - 1) return null;
  return maxIdx;
}

/**
 * Classifies every stop as 'outbound' (chiều đi, before the turnaround),
 * 'turnaround' (quay đầu, the pivot itself), or 'return' (chiều về, after
 * the turnaround). When no turnaround is detected, every stop is 'outbound'
 * (a one-way journey — there is no return leg to distinguish).
 */
export function classifyStopDirections(stops) {
  const turnaroundIndex = computeTurnaroundIndex(stops);
  const directions = (stops || []).map((_, idx) => {
    if (turnaroundIndex === null) return 'outbound';
    if (idx < turnaroundIndex) return 'outbound';
    if (idx === turnaroundIndex) return 'turnaround';
    return 'return';
  });
  return { turnaroundIndex, directions };
}

/**
 * Groups stop indices by their (rounded) physical coordinate — the same
 * ma_diem revisited on the outbound and return legs shares one entry here.
 * Returns a Map keyed by "lat,lon" (fixed precision) → array of stop
 * indices, in original seq order. Coordinates themselves are never altered.
 */
export function groupStopIndicesByCoordinate(stops, precision = 6) {
  const map = new Map();
  (stops || []).forEach((s, idx) => {
    if (typeof s.lat !== 'number' || typeof s.lon !== 'number') return;
    const key = `${s.lat.toFixed(precision)},${s.lon.toFixed(precision)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(idx);
  });
  return map;
}

/**
 * Evenly-spaced angles (degrees, 0 = up/north, clockwise) for fanning N
 * markers out from a shared coordinate ("spiderfy"). A single-item group
 * gets [0] (no offset needed — handled by the caller, which skips offsetting
 * groups of size 1).
 */
export function fanAngles(n) {
  if (!n || n <= 1) return [0];
  const step = 360 / n;
  return Array.from({ length: n }, (_, i) => i * step);
}

/**
 * Converts a fan angle (degrees, 0 = up, clockwise) + radius (any unit,
 * typically pixels) into an {x, y} screen-space-style offset, y-down (matches
 * Leaflet's layer point convention where y increases downward).
 */
export function fanAngleToOffset(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
}

/**
 * Given a polyline as an array of {x, y} pixel points (already projected),
 * returns a new array of points shifted perpendicular to the local line
 * direction by `offsetPx` (positive = one side, negative = the other).
 * Interior points average the perpendicular of their two adjacent segments
 * so the offset line stays smooth; endpoints use their single adjacent
 * segment. Used to visually separate outbound/return lines that would
 * otherwise draw exactly on top of each other (PO Gate 3 remediation
 * follow-up §5) — never changes the underlying route/geometry data, only
 * this derived display copy.
 */
export function offsetPixelPolyline(points, offsetPx) {
  if (!points || points.length === 0 || !offsetPx) return points || [];
  if (points.length === 1) return points;

  const segPerp = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular (rotate direction vector 90°), normalized.
    return { x: -dy / len, y: dx / len };
  };

  const perps = [];
  for (let i = 0; i < points.length - 1; i++) {
    perps.push(segPerp(points[i], points[i + 1]));
  }

  return points.map((p, i) => {
    let px;
    let py;
    if (i === 0) {
      px = perps[0].x;
      py = perps[0].y;
    } else if (i === points.length - 1) {
      px = perps[perps.length - 1].x;
      py = perps[perps.length - 1].y;
    } else {
      const a = perps[i - 1];
      const b = perps[i];
      px = (a.x + b.x) / 2;
      py = (a.y + b.y) / 2;
      const len = Math.hypot(px, py) || 1;
      px /= len;
      py /= len;
    }
    return { x: p.x + px * offsetPx, y: p.y + py * offsetPx };
  });
}

/**
 * Picks `count` evenly-spaced-by-distance sample positions along a
 * [lat, lon] position array, each with the local bearing (direction of
 * travel) — used to place directional arrow markers along a road-geometry
 * polyline without needing OSRM's per-leg `steps` response.
 */
export function pickArrowSamplePositions(positions, count) {
  if (!positions || positions.length < 2 || count <= 0) return [];

  const cumulative = [0];
  for (let i = 1; i < positions.length; i++) {
    const [lat1, lon1] = positions[i - 1];
    const [lat2, lon2] = positions[i];
    cumulative.push(cumulative[i - 1] + haversineKm(lat1, lon1, lat2, lon2));
  }
  const total = cumulative[cumulative.length - 1];
  if (total === 0) return [];

  const samples = [];
  for (let k = 1; k <= count; k++) {
    const targetDist = (total * k) / (count + 1);
    // Find the segment containing targetDist.
    let idx = 1;
    while (idx < cumulative.length - 1 && cumulative[idx] < targetDist) idx++;
    const [lat1, lon1] = positions[idx - 1];
    const [lat2, lon2] = positions[idx];
    const segLen = cumulative[idx] - cumulative[idx - 1] || 1;
    const t = Math.min(1, Math.max(0, (targetDist - cumulative[idx - 1]) / segLen));
    const lat = lat1 + (lat2 - lat1) * t;
    const lon = lon1 + (lon2 - lon1) * t;
    samples.push({ position: [lat, lon], bearing: bearingDeg(lat1, lon1, lat2, lon2) });
  }
  return samples;
}

/**
 * Total length (km) of a [lat, lon] position array, summing consecutive
 * haversine distances. Used to scale arrow count to geometry length.
 */
export function computePolylineLengthKm(positions) {
  if (!positions || positions.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < positions.length; i++) {
    const [lat1, lon1] = positions[i - 1];
    const [lat2, lon2] = positions[i];
    total += haversineKm(lat1, lon1, lat2, lon2);
  }
  return total;
}

/**
 * How many direction arrows a leg of the given length should get — dense
 * enough to be visible along a long journey, sparse enough not to clutter a
 * short one. One arrow roughly every `kmPerArrow` km, clamped to
 * [minCount, maxCount].
 */
export function computeArrowCount(lengthKm, { minCount = 2, maxCount = 8, kmPerArrow = 15 } = {}) {
  if (!lengthKm || lengthKm <= 0) return minCount;
  const raw = Math.round(lengthKm / kmPerArrow);
  return Math.min(maxCount, Math.max(minCount, raw));
}

export default {
  haversineKm,
  bearingDeg,
  computeTurnaroundIndex,
  classifyStopDirections,
  groupStopIndicesByCoordinate,
  fanAngles,
  fanAngleToOffset,
  offsetPixelPolyline,
  pickArrowSamplePositions,
  computePolylineLengthKm,
  computeArrowCount,
};
