/**
 * deliveryRoutingService.js
 * 
 * Road Network Routing Engine for Delivery Routes Map (NETWORK-MANAGEMENT-001)
 * 
 * Primary OSRM Service: https://router.project-osrm.org/route/v1/driving/
 * Secondary Fallback Service: https://routing.openstreetmap.de/routed-car/route/v1/driving/
 * (Reused from existing reference architecture in Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html)
 */

const MAX_WAYPOINTS_PER_CHUNK = 25; // Safe waypoint limit for OSRM URL request length

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
 * Overlaps 1 point between adjacent chunks to maintain line continuity.
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
 * Fetches road snapping geometry for a single chunk of waypoints from OSRM providers
 */
export async function fetchChunkRoadRoute(chunk, fetchImpl = fetch) {
  if (!chunk || chunk.length < 2) {
    return {
      isRoad: false,
      positions: chunk ? chunk.map((c) => [c.lat, c.lon]) : [],
      error: null,
    };
  }

  const coords = chunk.map((c) => `${c.lon},${c.lat}`).join(';');
  const urlSuffix = `/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const providers = [
    `https://router.project-osrm.org${urlSuffix}`,
    `https://routing.openstreetmap.de/routed-car${urlSuffix}`,
  ];

  let lastError = null;

  for (const providerUrl of providers) {
    try {
      const response = await fetchImpl(providerUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
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
      };
    } catch (err) {
      lastError = err;
    }
  }

  // Fallback to straight line connection for this failed chunk
  return {
    isRoad: false,
    positions: chunk.map((c) => [c.lat, c.lon]),
    error: lastError ? (lastError.message || String(lastError)) : 'Định tuyến thất bại',
  };
}

/**
 * Main entry point: Fetches road-network route segments for an array of grouped locations.
 * Handles chunking, caching, fallback, and errors cleanly.
 */
export async function fetchDeliveryRoadRoute(locations, options = {}) {
  const { fetchImpl = fetch, useCache = true } = options;

  if (!locations || locations.length < 2) {
    return {
      segments: [],
      hasFallback: false,
      warning: null,
    };
  }

  const cacheKey = generateRouteCacheKey(locations);
  if (useCache && routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const chunks = chunkLocations(locations, MAX_WAYPOINTS_PER_CHUNK);
  const segments = [];
  let fallbackCount = 0;
  const errors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkResult = await fetchChunkRoadRoute(chunks[i], fetchImpl);
    segments.push(chunkResult);
    if (!chunkResult.isRoad) {
      fallbackCount++;
      if (chunkResult.error) errors.push(`Chặng ${i + 1}: ${chunkResult.error}`);
    }
  }

  const hasFallback = fallbackCount > 0;
  let warning = null;
  if (hasFallback) {
    warning = `⚠️ Có ${fallbackCount}/${chunks.length} chặng không thể định tuyến qua OSRM, hiển thị đường nối thẳng dự phòng.`;
  }

  const result = {
    segments,
    hasFallback,
    warning,
    totalChunks: chunks.length,
  };

  if (useCache) {
    routeCache.set(cacheKey, result);
  }

  return result;
}

export default {
  generateRouteCacheKey,
  clearRouteCache,
  chunkLocations,
  fetchChunkRoadRoute,
  fetchDeliveryRoadRoute,
};
