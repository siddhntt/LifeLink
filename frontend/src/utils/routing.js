/**
 * Fetch actual driving route geometry from OSRM (free, no API key needed).
 * Returns an array of [lat, lng] points suitable for Leaflet Polyline.
 *
 * @param {{ latitude: number, longitude: number }} from
 * @param {{ latitude: number, longitude: number }} to
 * @returns {Promise<[number, number][]>} route coordinates
 */

const routeCache = new Map();
const CACHE_TTL = 60_000; // 1 minute
const MIN_MOVE_KM = 0.05; // 50 metres — don't refetch if donor barely moved

let lastFetchedFrom = null;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchDrivingRoute(from, to) {
  if (!from || !to) return null;

  // Skip if the donor hasn't moved enough since last fetch
  if (lastFetchedFrom) {
    const moved = haversineKm(
      lastFetchedFrom.latitude,
      lastFetchedFrom.longitude,
      from.latitude,
      from.longitude
    );
    if (moved < MIN_MOVE_KM) {
      // Return cached route if available
      const cacheKey = `${lastFetchedFrom.latitude.toFixed(4)},${lastFetchedFrom.longitude.toFixed(4)}-${to.latitude.toFixed(4)},${to.longitude.toFixed(4)}`;
      const cached = routeCache.get(cacheKey);
      if (cached && Date.now() - cached.time < CACHE_TTL) return cached.route;
    }
  }

  const cacheKey = `${from.latitude.toFixed(4)},${from.longitude.toFixed(4)}-${to.latitude.toFixed(4)},${to.longitude.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.route;

  try {
    // OSRM expects lng,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;

    // GeoJSON returns [lng, lat] — flip to [lat, lng] for Leaflet
    const coords = data.routes[0].geometry.coordinates;
    const route = coords.map(([lng, lat]) => [lat, lng]);

    routeCache.set(cacheKey, { route, time: Date.now() });
    lastFetchedFrom = { latitude: from.latitude, longitude: from.longitude };

    // Keep cache small
    if (routeCache.size > 20) {
      const oldest = routeCache.keys().next().value;
      routeCache.delete(oldest);
    }

    return route;
  } catch (err) {
    console.warn('[Routing] OSRM fetch failed, falling back to straight line:', err.message);
    return null;
  }
}

/**
 * Returns a straight-line fallback as [[lat1,lng1],[lat2,lng2]].
 */
export function straightLine(from, to) {
  if (!from || !to) return [];
  return [
    [from.latitude, from.longitude],
    [to.latitude, to.longitude],
  ];
}
