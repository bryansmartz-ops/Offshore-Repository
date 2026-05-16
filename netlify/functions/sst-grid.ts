import { Handler } from '@netlify/functions';

const ERDDAP_BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap';
// Force deploy
// Known structure locations (canyons, lumps, wrecks)
const KNOWN_STRUCTURE = [
  { name: 'Norfolk Canyon Tip', lat: 37.083, lon: -74.75, depth: '100 fathom', type: 'canyon' },
  { name: 'Norfolk Canyon 500', lat: 37.017, lon: -74.617, depth: '500 fathom', type: 'canyon' },
  { name: 'Washington Canyon Tip', lat: 37.483, lon: -74.5, depth: '100 fathom', type: 'canyon' },
  { name: 'Washington Canyon 500', lat: 37.4, lon: -74.417, depth: '500 fathom', type: 'canyon' },
  { name: 'Poorman\'s Canyon', lat: 37.867, lon: -74.1, depth: '100 fathom', type: 'canyon' },
  { name: 'Baltimore Canyon 100', lat: 38.233, lon: -73.833, depth: '100 fathom', type: 'canyon' },
  { name: 'Baltimore Canyon 500', lat: 38.1, lon: -73.817, depth: '500 fathom', type: 'canyon' },
  { name: 'Wilmington Canyon', lat: 38.383, lon: -73.667, depth: '100 fathom', type: 'canyon' },
  { name: 'Spencer Canyon', lat: 38.6, lon: -73.167, depth: '500 fathom', type: 'canyon' },
  { name: 'Tuna Banks', lat: 38.85, lon: -74.367, depth: '60-100 ft', type: 'lump' },
  { name: 'Elephant Trunk', lat: 38.583, lon: -74.067, depth: '600-1200 ft', type: 'lump' },
  { name: 'Rockpile', lat: 37.617, lon: -74.333, depth: '600-1200 ft', type: 'lump' },
  { name: 'Lumpy Bottom', lat: 37.467, lon: -74.867, depth: '600-1200 ft', type: 'lump' },
];

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { minLat = '36.5', maxLat = '39.5', minLon = '-75', maxLon = '-73', targetSpecies = 'Mahi-Mahi' } = event.queryStringParameters || {};

    console.log(`SST Grid scan: lat ${minLat} to ${maxLat}, lon ${minLon} to ${maxLon}, target: ${targetSpecies}`);

    // Species temperature preferences (ideal SST ranges in °F)
    const speciesPrefs: Record<string, { min: number; max: number; optimal: number }> = {
      'Mahi-Mahi': { min: 72, max: 82, optimal: 77 },
      'Yellowfin Tuna': { min: 68, max: 78, optimal: 73 },
      'Bluefin Tuna': { min: 55, max: 72, optimal: 63 },
      'Wahoo': { min: 70, max: 82, optimal: 76 },
      'White Marlin': { min: 72, max: 82, optimal: 77 },
      'Blue Marlin': { min: 74, max: 86, optimal: 80 },
      'Swordfish': { min: 65, max: 75, optimal: 70 },
      'Sailfish': { min: 75, max: 85, optimal: 80 },
      // Generic fallbacks for backwards compatibility
      'Tuna': { min: 60, max: 78, optimal: 70 }, // Blended range for all tunas
      'Marlin': { min: 72, max: 86, optimal: 78 }, // Blended range for all marlins
    };

    let targetPref = speciesPrefs[targetSpecies];

    // If species not found, log warning and use default
    if (!targetPref) {
      console.log(`Warning: Species "${targetSpecies}" not found in preferences, using Mahi-Mahi defaults`);
      targetPref = speciesPrefs['Mahi-Mahi'];
    } else {
      console.log(`Using temperature preferences for ${targetSpecies}: ${targetPref.min}-${targetPref.max}°F (optimal: ${targetPref.optimal}°F)`);
    }

    // Fetch SST grid from NOAA ERDDAP
    // Stride must be integer (number of points to skip), not decimal degrees
    // Native resolution is ~0.01 degrees, so stride=10 gives ~0.1 degree spacing (~6nm)
    const stride = 10;
    const gridUrl = `${ERDDAP_BASE_URL}/griddap/jplMURSST41.json?analysed_sst[(last)][(${minLat}):${stride}:(${maxLat})][(${minLon}):${stride}:(${maxLon})]`;

    console.log('Fetching SST grid from ERDDAP:', gridUrl);

    // Add timeout for ERDDAP (can be slow)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const gridResponse = await fetch(gridUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    console.log('ERDDAP response status:', gridResponse.status);

    if (!gridResponse.ok) {
      const errorText = await gridResponse.text();
      console.error('ERDDAP error response:', errorText);
      throw new Error(`ERDDAP returned ${gridResponse.status}: ${errorText.substring(0, 200)}`);
    }

    const gridData = await gridResponse.json();
    console.log('ERDDAP response received, parsing...');

    const rows = gridData.table?.rows || []; // Each row: [time, lat, lon, sst_celsius]

    console.log(`Received ${rows.length} SST data points from ERDDAP`);

    if (rows.length === 0) {
      console.error('ERDDAP returned 0 data points - grid query may be invalid');
      throw new Error('No SST data available from ERDDAP - check query parameters');
    }

    // Convert grid to searchable format
    interface GridPoint {
      lat: number;
      lon: number;
      sst: number; // in Fahrenheit
    }

    const grid: GridPoint[] = rows.map((row: any[]) => ({
      lat: row[1],
      lon: row[2],
      sst: celsiusToFahrenheit(row[3])
    }));

    console.log(`Converted ${grid.length} grid points to Fahrenheit`);

    // Find temperature breaks (gradients > 2°F over ~3nm)
    const breaks: Array<{
      lat: number;
      lon: number;
      coldSide: number;
      warmSide: number;
      gradient: number;
      strength: 'major' | 'moderate';
    }> = [];

    // Scan grid for breaks
    for (let i = 0; i < grid.length; i++) {
      const point = grid[i];

      // Check neighboring points (within ~0.1 degrees / ~6nm)
      const neighbors = grid.filter(p =>
        Math.abs(p.lat - point.lat) <= 0.1 &&
        Math.abs(p.lon - point.lon) <= 0.1 &&
        p !== point
      );

      if (neighbors.length > 0) {
        const temps = neighbors.map(n => n.sst);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        const gradient = maxTemp - minTemp;

        // Temperature break detected (lowered threshold from 2°F to 1.5°F)
        if (gradient >= 1.5) {
          breaks.push({
            lat: point.lat,
            lon: point.lon,
            coldSide: minTemp,
            warmSide: maxTemp,
            gradient: gradient,
            strength: gradient >= 3 ? 'major' : 'moderate'
          });
        }
      }
    }

    console.log(`Found ${breaks.length} temperature breaks`);

    // Find warm zones in target species range
    const warmZones = grid.filter(p =>
      p.sst >= targetPref.min && p.sst <= targetPref.max
    );

    console.log(`Found ${warmZones.length} points in target temp range (${targetPref.min}-${targetPref.max}°F)`);

    // Log SST range in grid for debugging
    const sstValues = grid.map(p => p.sst);
    const minSST = Math.min(...sstValues);
    const maxSST = Math.max(...sstValues);
    console.log(`SST range in grid: ${minSST.toFixed(1)}°F to ${maxSST.toFixed(1)}°F`);

    // Generate hotspots by combining breaks + warm zones + structure
    const hotspots: Array<{
      name: string;
      lat: number;
      lon: number;
      sst: number;
      confidence: number;
      reasons: string[];
      type: 'break' | 'structure' | 'combined';
      break?: { gradient: number; coldSide: number; warmSide: number; strength: string };
    }> = [];

    // 1. Breaks near structure = PRIME SPOTS
    for (const breakPoint of breaks) {
      const nearbyStructure = KNOWN_STRUCTURE.find(s =>
        Math.abs(s.lat - breakPoint.lat) <= 0.15 && // Within ~9nm
        Math.abs(s.lon - breakPoint.lon) <= 0.15
      );

      if (nearbyStructure) {
        // Check if break is in target temp range
        const inRange = (breakPoint.warmSide >= targetPref.min && breakPoint.warmSide <= targetPref.max) ||
                        (breakPoint.coldSide >= targetPref.min && breakPoint.coldSide <= targetPref.max);

        if (inRange) {
          hotspots.push({
            name: `${nearbyStructure.name} - SST Break`,
            lat: breakPoint.lat,
            lon: breakPoint.lon,
            sst: breakPoint.warmSide,
            confidence: breakPoint.strength === 'major' ? 95 : 88,
            type: 'combined',
            reasons: [
              `${breakPoint.gradient.toFixed(1)}°F temperature break (${breakPoint.coldSide.toFixed(1)}°F → ${breakPoint.warmSide.toFixed(1)}°F)`,
              `Near ${nearbyStructure.name} (${nearbyStructure.depth})`,
              `${breakPoint.strength === 'major' ? 'MAJOR' : 'Moderate'} feeding zone - baitfish concentrate at break`,
              `Optimal for ${targetSpecies}`
            ],
            break: {
              gradient: breakPoint.gradient,
              coldSide: breakPoint.coldSide,
              warmSide: breakPoint.warmSide,
              strength: breakPoint.strength
            }
          });
        }
      }
    }

    // 2. Warm zones near structure (no break, but good temp)
    for (const structure of KNOWN_STRUCTURE) {
      const nearbyWarm = warmZones.find(w =>
        Math.abs(w.lat - structure.lat) <= 0.05 && // Within ~3nm
        Math.abs(w.lon - structure.lon) <= 0.05
      );

      if (nearbyWarm && !hotspots.some(h => h.name.includes(structure.name))) {
        // Calculate temp score (closer to optimal = higher score)
        const tempDiff = Math.abs(nearbyWarm.sst - targetPref.optimal);
        const tempScore = Math.max(70, 90 - (tempDiff * 3));

        hotspots.push({
          name: structure.name,
          lat: nearbyWarm.lat,
          lon: nearbyWarm.lon,
          sst: nearbyWarm.sst,
          confidence: Math.round(tempScore),
          type: 'structure',
          reasons: [
            `SST ${nearbyWarm.sst.toFixed(1)}°F (${Math.abs(nearbyWarm.sst - targetPref.optimal).toFixed(1)}°F from ${targetSpecies} optimal)`,
            `${structure.type === 'canyon' ? 'Canyon' : 'Lump'} structure - ${structure.depth}`,
            `Active feeding zone for pelagics`,
            nearbyWarm.sst >= 75 ? 'Warm water attracts baitfish' : 'Good temperature for target species'
          ]
        });
      }
    }

    // 3. All breaks without structure (major and moderate)
    const allBreaksOnly = breaks.filter(b =>
      (b.warmSide >= targetPref.min - 5 || b.coldSide >= targetPref.min - 5) // Within 5°F of target range
    );
    for (const breakPoint of allBreaksOnly.slice(0, 8)) {
      if (!hotspots.some(h => Math.abs(h.lat - breakPoint.lat) <= 0.05 && Math.abs(h.lon - breakPoint.lon) <= 0.05)) {
        // Find nearest structure for reference
        let nearestStructure = null;
        let minDistance = Infinity;
        for (const s of KNOWN_STRUCTURE) {
          const dist = Math.sqrt(Math.pow(s.lat - breakPoint.lat, 2) + Math.pow(s.lon - breakPoint.lon, 2));
          if (dist < minDistance) {
            minDistance = dist;
            nearestStructure = s;
          }
        }

        const distanceNm = minDistance * 60; // Convert degrees to nautical miles (rough)
        const locationRef = nearestStructure && distanceNm < 30
          ? `near ${nearestStructure.name} (${distanceNm.toFixed(0)}nm)`
          : `at ${formatCoord(breakPoint.lat, 'lat')} ${formatCoord(breakPoint.lon, 'lon')}`;

        hotspots.push({
          name: `${breakPoint.strength === 'major' ? 'Major' : 'Moderate'} Break ${locationRef}`,
          lat: breakPoint.lat,
          lon: breakPoint.lon,
          sst: breakPoint.warmSide,
          confidence: breakPoint.strength === 'major' ? 85 : 78,
          type: 'break',
          reasons: [
            `${breakPoint.gradient.toFixed(1)}°F temperature break (${breakPoint.strength})`,
            `${breakPoint.coldSide.toFixed(1)}°F → ${breakPoint.warmSide.toFixed(1)}°F gradient`,
            `Prime feeding zone - predators hunt the break`,
            nearestStructure ? `${distanceNm.toFixed(0)}nm from ${nearestStructure.name}` : 'Open water location'
          ],
          break: {
            gradient: breakPoint.gradient,
            coldSide: breakPoint.coldSide,
            warmSide: breakPoint.warmSide,
            strength: breakPoint.strength
          }
        });
      }
    }

    // Sort by confidence (breaks + structure rank highest)
    hotspots.sort((a, b) => b.confidence - a.confidence);

    console.log(`Generated ${hotspots.length} total hotspots`);
    console.log(`Returning top ${Math.min(15, hotspots.length)} hotspots`);

    if (hotspots.length > 0) {
      console.log('Top hotspot:', hotspots[0].name, hotspots[0].confidence + '%');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          gridPoints: grid.length,
          breaksFound: breaks.length,
          warmZones: warmZones.length,
          hotspots: hotspots.slice(0, 15), // Top 15
          targetSpecies: targetSpecies,
          targetTempRange: `${targetPref.min}-${targetPref.max}°F (optimal: ${targetPref.optimal}°F)`,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('SST grid scan error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          gridPoints: 0,
          breaksFound: 0,
          warmZones: 0,
          hotspots: [],
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};

function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5 + 32) * 10) / 10;
}

function formatCoord(decimal: number, type: 'lat' | 'lon'): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutes = Math.floor((absolute - degrees) * 60);
  const direction = type === 'lat' ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
  return `${degrees}°${minutes}'${direction}`;
}
