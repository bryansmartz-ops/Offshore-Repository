import { Handler } from '@netlify/functions';

const ERDDAP_BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap';

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
    };

    const targetPref = speciesPrefs[targetSpecies] || speciesPrefs['Mahi-Mahi'];

    // Fetch SST grid from NOAA ERDDAP
    // Grid stride: ~0.05 degrees (~3nm spacing) for balance between coverage and speed
    const gridUrl = `${ERDDAP_BASE_URL}/griddap/jplMURSST41.json?analysed_sst[(last)][(${minLat}):0.05:(${maxLat})][(${minLon}):0.05:(${maxLon})]`;

    console.log('Fetching SST grid from ERDDAP...');
    const gridResponse = await fetch(gridUrl);

    if (!gridResponse.ok) {
      throw new Error(`ERDDAP returned ${gridResponse.status}`);
    }

    const gridData = await gridResponse.json();
    const rows = gridData.table.rows; // Each row: [time, lat, lon, sst_celsius]

    console.log(`Received ${rows.length} SST data points`);

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

        // Temperature break detected
        if (gradient >= 2) {
          breaks.push({
            lat: point.lat,
            lon: point.lon,
            coldSide: minTemp,
            warmSide: maxTemp,
            gradient: gradient,
            strength: gradient >= 4 ? 'major' : 'moderate'
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

    // 3. Major breaks without structure (still good)
    const majorBreaksOnly = breaks.filter(b => b.strength === 'major' && b.warmSide >= targetPref.min);
    for (const breakPoint of majorBreaksOnly.slice(0, 5)) {
      if (!hotspots.some(h => Math.abs(h.lat - breakPoint.lat) <= 0.05 && Math.abs(h.lon - breakPoint.lon) <= 0.05)) {
        hotspots.push({
          name: `Open Water Break`,
          lat: breakPoint.lat,
          lon: breakPoint.lon,
          sst: breakPoint.warmSide,
          confidence: 85,
          type: 'break',
          reasons: [
            `MAJOR ${breakPoint.gradient.toFixed(1)}°F temperature break`,
            `${breakPoint.coldSide.toFixed(1)}°F → ${breakPoint.warmSide.toFixed(1)}°F gradient`,
            `Prime feeding zone - predators hunt the break`,
            `Warm side ideal for ${targetSpecies}`
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
