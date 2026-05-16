// Loran-C TD (Time Difference) Conversion
// Chain 9960 - Northeast U.S. (covers Mid-Atlantic fishing areas)

interface LoranCoordinates {
  chain: string;
  td1: string; // Primary pair (usually 9960-Y)
  td2: string; // Secondary pair (usually 9960-W or 9960-X)
}

// Loran-C Chain 9960 Station Locations
const LORAN_STATIONS = {
  master: { lat: 42.6667, lon: -76.8167, name: 'Seneca, NY' },        // Master (M)
  W: { lat: 39.8542, lon: -87.4861, name: 'Dana, IN' },               // Secondary W
  X: { lat: 46.8917, lon: -68.0111, name: 'Caribou, ME' },            // Secondary X
  Y: { lat: 41.2583, lon: -69.9750, name: 'Nantucket, MA' },          // Secondary Y
  Z: { lat: 34.0458, lon: -77.9056, name: 'Carolina Beach, NC' }      // Secondary Z
};

const SPEED_OF_LIGHT = 299792.458; // km/s
const MICROSECONDS_PER_KM = 1000 / SPEED_OF_LIGHT; // ~3.336 μs/km

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert Latitude/Longitude to Loran-C Time Difference (TD)
 *
 * @param lat - Latitude in decimal degrees
 * @param lon - Longitude in decimal degrees (negative for West)
 * @returns Loran TD coordinates for chain 9960
 */
export function latLonToLoran(lat: number, lon: number): LoranCoordinates {
  // Calculate distances from receiver position to each station
  const distToMaster = calculateDistance(lat, lon, LORAN_STATIONS.master.lat, LORAN_STATIONS.master.lon);
  const distToW = calculateDistance(lat, lon, LORAN_STATIONS.W.lat, LORAN_STATIONS.W.lon);
  const distToX = calculateDistance(lat, lon, LORAN_STATIONS.X.lat, LORAN_STATIONS.X.lon);
  const distToY = calculateDistance(lat, lon, LORAN_STATIONS.Y.lat, LORAN_STATIONS.Y.lon);
  const distToZ = calculateDistance(lat, lon, LORAN_STATIONS.Z.lat, LORAN_STATIONS.Z.lon);

  // Calculate Time Differences (TD) in microseconds
  // TD = (distance to secondary - distance to master) / speed of light
  const TD_W = ((distToW - distToMaster) * MICROSECONDS_PER_KM);
  const TD_X = ((distToX - distToMaster) * MICROSECONDS_PER_KM);
  const TD_Y = ((distToY - distToMaster) * MICROSECONDS_PER_KM);
  const TD_Z = ((distToZ - distToMaster) * MICROSECONDS_PER_KM);

  // Convert to Loran format (add baseline offset and format)
  // Chain 9960 baselines (approximate):
  // 9960-W baseline: ~11500 μs
  // 9960-X baseline: ~12500 μs
  // 9960-Y baseline: ~13500 μs
  // 9960-Z baseline: ~25500 μs

  const loran_W = (11500 + TD_W).toFixed(1);
  const loran_X = (12500 + TD_X).toFixed(1);
  const loran_Y = (13500 + TD_Y).toFixed(1);
  const loran_Z = (25500 + TD_Z).toFixed(1);

  // For Mid-Atlantic fishing (Ocean City, MD area), most common pairs are:
  // Primary: 9960-Y (Nantucket)
  // Secondary: 9960-W (Dana) or 9960-X (Caribou)

  // Determine best secondary based on latitude
  const useX = lat > 40; // North of 40°N, use X (Caribou); otherwise use W (Dana)

  return {
    chain: '9960',
    td1: loran_Y,  // Primary (Y - Nantucket)
    td2: useX ? loran_X : loran_W  // Secondary (X or W depending on latitude)
  };
}

/**
 * Format Loran coordinates for display
 *
 * @param loran - Loran coordinates object
 * @returns Formatted string like "26854.5/43996.2"
 */
export function formatLoran(loran: LoranCoordinates): string {
  return `${loran.td1}/${loran.td2}`;
}

/**
 * Format Loran coordinates with chain identifier
 *
 * @param loran - Loran coordinates object
 * @returns Formatted string like "9960: 26854.5/43996.2"
 */
export function formatLoranWithChain(loran: LoranCoordinates): string {
  return `${loran.chain}: ${loran.td1}/${loran.td2}`;
}
