/**
 * roadRoutingService.js
 *
 * Shared road-network routing engine for NETWORK-MANAGEMENT-001's two
 * routed-line map screens: Sơ đồ tuyến phát (DeliveryRoutesMap) and
 * Mạng đường thư cấp 2 / ĐTC2 (Level2RoutesMap). Extracted from the
 * former delivery-only `deliveryRoutingService.js` during the PO Gate 3
 * remediation round so both screens share one routing/timeout/fallback/
 * bounds-exclusion implementation instead of ĐTC2 having none at all.
 *
 * Primary OSRM Service: https://router.project-osrm.org/route/v1/driving/
 * Secondary Fallback Service: https://routing.openstreetmap.de/routed-car/route/v1/driving/
 * (Reused from the reference architecture in
 * Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html, which already
 * used both providers for ĐTC2's "mailLoadRoute" road routing.)
 *
 * PO Gate 3 remediation requirements honored here:
 *  - Each provider request is bounded by an explicit AbortController
 *    timeout (default 15s) so an unresponsive provider can never hang
 *    the UI on an implicit straight-line placeholder forever.
 *  - If the first provider fails or times out, the second provider is
 *    tried before falling back.
 *  - If both providers fail, the caller receives isRoad:false with a
 *    populated `error`/`providerErrors` — never a silent straight line
 *    presented as if it were real road geometry.
 *  - Locations outside a generous Huế-area routing bounding box (data
 *    artifacts — confirmed via live-DB audit to include GPS coordinates
 *    in Morocco and near Hải Phòng) are excluded from the OSRM waypoint
 *    chain only; they are never dropped from the caller's original
 *    location list, never silently guessed/replaced, and one bad
 *    coordinate can no longer break routing for the rest of an
 *    otherwise-valid route.
 *  - Chunking keeps a 1-point overlap between adjacent chunks so no
 *    point is lost and no chunk boundary silently straight-lines across
 *    the gap.
 */

const MAX_WAYPOINTS_PER_CHUNK = 25; // Safe waypoint limit for OSRM URL request length
const DEFAULT_PROVIDER_TIMEOUT_MS = 15000; // PO Gate 3 remediation: bounded per-provider timeout

const ROUTE_PROVIDERS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
];

/**
 * Generous bounding box around Thừa Thiên Huế used only to decide which
 * points are eligible to be sent to OSRM as routing waypoints. Sized from
 * the live network_service_point/network_delivery_point coordinate ranges
 * plus margin; excludes the two confirmed data-artifact clusters (Morocco,
 * Hải Phòng) found during the PO Gate 3 root-cause audit while comfortably
 * containing every legitimate Huế-area point. This is a routing-eligibility
 * filter only — it never modifies, hides, or replaces the underlying data.
 */
export const HUE_ROUTING_BOUNDS = { minLat: 15.5, maxLat: 17.5, minLon: 106.5, maxLon: 108.5 };

export function isWithinHueRoutingBounds(loc) {
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lon !== 'number') return false;
  if (Number.isNaN(loc.lat) || Number.isNaN(loc.lon)) return false;
  return (
    loc.lat >= HUE_ROUTING_BOUNDS.minLat &&
    loc.lat <= HUE_ROUTING_BOUNDS.maxLat &&
    loc.lon >= HUE_ROUTING_BOUNDS.minLon &&
    loc.lon <= HUE_ROUTING_BOUNDS.maxLon
  );
}

// In-memory cache for fetched route segments
const routeCache = new Map();

/**
 * Generates a deterministic cache key from an array of physical locations
 */
export function generateRouteCacheKey(locations) {
  if (!locations || locations.length === 0) return 'empty';
  return locations.map((loc) => `${loc.lat.toFixed(6)},${loc.lon.toFixed(6)}`).join('|');
}

/**
 * Clears the in-memory route cache (useful for testing or memory management)
 */
export function clearRouteCache() {
  routeCache.clear();
}

/**
 * Splits an array of locations into chunks of max size MAX_WAYPOINTS_PER_CHUNK.
 * Overlaps 1 point between adjacent chunks to maintain line continuity —
 * no point is dropped and no chunk boundary is silently straight-lined.
 */
export function chunkLocations(locations, maxChunkSize = MAX_WAYPOINTS_PER_CHUNK) {
  if (!locations || locations.length <= 1) return [];
  if (locations.length <= maxChunkSize) return [locations];

  const chunks = [];
  let startIndex = 0;

  while (startIndex < locations.length - 1) {
    const endIndex = Math.min(startIndex + maxChunkSize, locations.length);
    const chunk = locations.slice(startIndex, endIndex);
    chunks.push(chunk);
    if (endIndex >= locations.length) break;
    startIndex = endIndex - 1; // 1-point overlap for route continuity
  }

  return chunks;
}

/**
 * Fetches a single provider URL with an explicit timeout via AbortController.
 * Falls back to a plain call (no signal) if AbortController is unavailable —
 * never crashes, just loses the timeout guarantee on that environment.
 */
async function fetchWithTimeout(url, fetchImpl, timeoutMs) {
  if (typeof AbortController === 'undefined') {
    return fetchImpl(url);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches road snapping geometry for a single chunk of waypoints, trying
 * each OSRM provider in order with a bounded timeout. Returns isRoad:false
 * with populated error details (never silently) if every provider fails.
 */
export async function fetchChunkRoadRoute(chunk, fetchImpl = fetch, timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS) {
  if (!chunk || chunk.length < 2) {
    return {
      isRoad: false,
      positions: chunk ? chunk.map((c) => [c.lat, c.lon]) : [],
      error: null,
      providerErrors: [],
    };
  }

  const coords = chunk.map((c) => `${c.lon},${c.lat}`).join(';');
  const urlSuffix = `/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const providerErrors = [];

  for (const base of ROUTE_PROVIDERS) {
    const providerUrl = base + urlSuffix;
    try {
      const response = await fetchWithTimeout(providerUrl, fetchImpl, timeoutMs);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
      }
      const data = await response.json();
      if (!data || data.code !== 'Ok' || !data.routes || !data.routes.length) {
        throw new Error((data && data.message) || 'Không có kết quả định tuyến OSRM');
      }

      const rawCoords = data.routes[0].geometry.coordinates; // [[lon, lat], ...]
      const positions = rawCoords.map((coord) => [coord[1], coord[0]]); // Leaflet [lat, lon]

      return {
        isRoad: true,
        positions,
        error: null,
        providerErrors,
      };
    } catch (err) {
      const isTimeout = err && err.name === 'AbortError';
      const message = isTimeout ? `Timeout sau ${Math.round(timeoutMs / 1000)}s` : (err.message || String(err));
      providerErrors.push(`${base}: ${message}`);
    }
  }

  // Both providers failed or timed out — explicit "cannot build road route"
  // state. The caller still receives fallback straight positions so the
  // valid points remain visible, but isRoad:false + error must never be
  // suppressed by the UI (see DeliveryRoutesMap.jsx / Level2RoutesMap.jsx).
  return {
    isRoad: false,
    positions: chunk.map((c) => [c.lat, c.lon]),
    error: providerErrors.join(' | '),
    providerErrors,
  };
}

/**
 * Main entry point: fetches road-network route segments for an array of
 * locations. Handles Huế-bounds exclusion, chunking, caching, provider
 * fallback, and timeouts. Returns which input locations (if any) were
 * excluded from the routing chain so the caller can surface them.
 */
export async function fetchRoadRoute(locations, options = {}) {
  const { fetchImpl = fetch, useCache = true, timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS } = options;

  if (!locations || locations.length === 0) {
    return { segments: [], hasFallback: false, warning: null, excluded: [], totalChunks: 0 };
  }

  const routable = [];
  const excluded = [];
  locations.forEach((loc, index) => {
    if (isWithinHueRoutingBounds(loc)) {
      routable.push(loc);
    } else {
      excluded.push({ ...loc, originalIndex: index });
    }
  });

  if (routable.length < 2) {
    return {
      segments: [],
      hasFallback: false,
      warning: null,
      excluded,
      totalChunks: 0,
    };
  }

  const cacheKey = `${generateRouteCacheKey(routable)}|excl:${excluded.length}|t:${timeoutMs}`;
  if (useCache && routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const chunks = chunkLocations(routable, MAX_WAYPOINTS_PER_CHUNK);
  const segments = [];
  let fallbackCount = 0;
  const errors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkResult = await fetchChunkRoadRoute(chunks[i], fetchImpl, timeoutMs);
    segments.push(chunkResult);
    if (!chunkResult.isRoad) {
      fallbackCount++;
      if (chunkResult.error) errors.push(`Chặng ${i + 1}: ${chunkResult.error}`);
    }
  }

  const hasFallback = fallbackCount > 0;
  let warning = null;
  if (hasFallback) {
    warning = `⚠️ Không thể dựng đường giao thông thực tế cho ${fallbackCount}/${chunks.length} chặng (đã thử cả 2 nhà cung cấp OSRM). Đoạn nối thẳng hiển thị KHÔNG phải tuyến đường thực tế.`;
  }

  const result = {
    segments,
    hasFallback,
    warning,
    excluded,
    totalChunks: chunks.length,
  };

  if (useCache) {
    routeCache.set(cacheKey, result);
  }

  return result;
}

// Backward-compatible alias — existing callers/tests imported this name
// from the former delivery-only module.
export const fetchDeliveryRoadRoute = fetchRoadRoute;

export default {
  generateRouteCacheKey,
  clearRouteCache,
  chunkLocations,
  fetchChunkRoadRoute,
  fetchRoadRoute,
  fetchDeliveryRoadRoute,
  isWithinHueRoutingBounds,
  HUE_ROUTING_BOUNDS,
};
