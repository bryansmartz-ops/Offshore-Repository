/**
 * NOAA Ocean Data Integration
 * Fetches real-time ocean conditions from NOAA APIs
 */

// NOAA National Data Buoy Center (NDBC) - No API key required
const NDBC_BASE_URL = 'https://www.ndbc.noaa.gov/data/realtime2';

// NOAA CO-OPS API - No API key required
const COOPS_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

// NOAA ERDDAP for SST and Chlorophyll - No API key required
const ERDDAP_BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap';

interface BuoyData {
  waveHeight: number; // feet
  wavePeriod: number; // seconds
  windSpeed: number; // knots
  windDirection: number; // degrees
  waterTemp: number; // °F
  airTemp: number; // °F
  timestamp: string;
}

export interface Tide {
  time: string;
  height: number; // feet
  type: 'High' | 'Low';
}

export interface SSTBreak {
  gradient: number; // °F change
  coldSide?: number; // °F on cold side of break
  warmSide?: number; // °F on warm side of break
  strength: 'major' | 'moderate' | 'none';
  description: string;
}

export interface OceanConditions {
  sst: number; // °F
  waveHeight: number | null; // feet (null if unavailable from buoy)
  windSpeed: number; // knots
  windDirection?: string; // compass direction (N, NE, E, SE, S, SW, W, NW, etc.)
  wavePeriod?: number | null; // seconds
  chlorophyll: number; // mg/m³
  currentSpeed: number; // knots
  currentDirection: string;
  tides?: Tide[];
  sstBreak?: SSTBreak | null;
  pressure?: number | null; // hPa (millibars)
  pressureTrend?: 'rising' | 'falling' | 'stable';
}

interface ConfidenceFactors {
  sstScore: number;
  waveScore: number;
  windScore: number;
  chlorophyllScore: number;
  sstBreakBonus: number;
  overallConfidence: number;
}

/**
 * Ocean City, MD ocean data sources:
 * - Wind/Pressure: Buoy 44009 (Delaware Bay - 26 NM SE of Cape May, closest to Ocean City)
 * - Waves: NOAA WaveWatch III model (provides wave height/period at exact fishing coordinates)
 * - SST/Chlorophyll: NOAA ERDDAP satellite data
 */
const OCEAN_CITY_WIND_BUOY = '44009';

/**
 * Fetch latest buoy data from NOAA NDBC
 */
async function fetchBuoyData(buoyId: string): Promise<BuoyData | null> {
  try {
    // NDBC provides real-time data in text format
    const response = await fetch(`${NDBC_BASE_URL}/${buoyId}.txt`, {
      method: 'GET',
      headers: { 'Accept': 'text/plain' }
    });

    if (!response.ok) {
      console.warn(`Buoy ${buoyId} data not available`);
      return null;
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Skip header lines (first 2 lines)
    if (lines.length < 3) return null;

    const dataLine = lines[2].trim().split(/\s+/);

    // Parse latest reading
    // Format: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS TIDE
    return {
      windDirection: parseFloat(dataLine[5]) || 0,
      windSpeed: parseFloat(dataLine[6]) || 0,
      waveHeight: parseFloat(dataLine[8]) || 0,
      wavePeriod: parseFloat(dataLine[9]) || 0,
      waterTemp: parseFloat(dataLine[14]) ? celsiusToFahrenheit(parseFloat(dataLine[14])) : 0,
      airTemp: parseFloat(dataLine[13]) ? celsiusToFahrenheit(parseFloat(dataLine[13])) : 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching buoy ${buoyId}:`, error);
    return null;
  }
}

/**
 * Fetch Sea Surface Temperature from NOAA ERDDAP
 */
async function fetchSST(lat: number, lon: number): Promise<number | null> {
  try {
    // Use NOAA's Multi-scale Ultra-high Resolution SST dataset
    const url = `${ERDDAP_BASE_URL}/griddap/jplMURSST41.json?analysed_sst[(last)][({lat})][({lon})]`
      .replace('{lat}', lat.toFixed(4))
      .replace('{lon}', lon.toFixed(4));

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const sstKelvin = data.table.rows[0][3]; // SST in Kelvin
    const sstCelsius = sstKelvin - 273.15;
    return celsiusToFahrenheit(sstCelsius);
  } catch (error) {
    console.error('Error fetching SST:', error);
    return null;
  }
}

/**
 * Species-specific temperature preferences (°F)
 * Based on optimal feeding and activity temperatures
 */
const SPECIES_TEMP_PREFERENCES: Record<string, { optimal: [number, number]; acceptable: [number, number] }> = {
  'Mahi-Mahi': { optimal: [76, 82], acceptable: [72, 85] },
  'Wahoo': { optimal: [72, 80], acceptable: [68, 84] },
  'Yellowfin Tuna': { optimal: [68, 76], acceptable: [64, 80] },
  'Tuna': { optimal: [68, 76], acceptable: [64, 80] }, // Generic tuna
  'Marlin': { optimal: [74, 82], acceptable: [70, 85] },
  'White Marlin': { optimal: [74, 82], acceptable: [70, 85] },
  'Blue Marlin': { optimal: [76, 84], acceptable: [72, 86] },
  'Sailfish': { optimal: [75, 82], acceptable: [70, 85] },
  'Tilefish': { optimal: [50, 60], acceptable: [45, 65] },
  'Sea Bass': { optimal: [55, 68], acceptable: [50, 72] },
  'Flounder': { optimal: [58, 68], acceptable: [52, 72] },
  'Bluefish': { optimal: [60, 72], acceptable: [55, 76] },
  'Striped Bass': { optimal: [60, 70], acceptable: [55, 75] }
};

/**
 * Calculate confidence score based on real ocean conditions
 */
export function calculateConfidence(
  conditions: Partial<OceanConditions>,
  targetSpecies: string[],
  spotType: 'inshore' | 'midrange' | 'offshore'
): ConfidenceFactors {
  let sstScore = 50;
  let waveScore = 50;
  let windScore = 50;
  let chlorophyllScore = 50;

  // SST scoring (species-specific temperature preferences)
  if (conditions.sst && targetSpecies.length > 0) {
    const speciesScores: number[] = [];

    targetSpecies.forEach(species => {
      const tempPref = SPECIES_TEMP_PREFERENCES[species];

      if (tempPref) {
        const [optimalMin, optimalMax] = tempPref.optimal;
        const [acceptableMin, acceptableMax] = tempPref.acceptable;

        if (conditions.sst! >= optimalMin && conditions.sst! <= optimalMax) {
          // Perfect temperature range for this species
          speciesScores.push(100);
        } else if (conditions.sst! >= acceptableMin && conditions.sst! <= acceptableMax) {
          // Acceptable range - score based on distance from optimal
          const distanceFromOptimal = Math.min(
            Math.abs(conditions.sst! - optimalMin),
            Math.abs(conditions.sst! - optimalMax)
          );
          const score = 80 - (distanceFromOptimal * 3); // Degrade 3 points per degree
          speciesScores.push(Math.max(score, 60));
        } else {
          // Outside acceptable range - too cold or too hot
          const distance = Math.min(
            Math.abs(conditions.sst! - acceptableMin),
            Math.abs(conditions.sst! - acceptableMax)
          );
          const score = 50 - (distance * 5); // Heavy penalty outside range
          speciesScores.push(Math.max(score, 20));
        }
      } else {
        // Unknown species - use moderate default
        speciesScores.push(60);
      }
    });

    // Use the highest species score (best match for any target species)
    sstScore = Math.max(...speciesScores);
  }

  // Wave scoring (fishability)
  if (conditions.waveHeight !== undefined) {
    if (conditions.waveHeight < 2) waveScore = 100;
    else if (conditions.waveHeight < 4) waveScore = 85;
    else if (conditions.waveHeight < 6) waveScore = 60;
    else waveScore = 30; // Rough conditions
  }

  // Wind scoring
  if (conditions.windSpeed !== undefined) {
    if (conditions.windSpeed < 10) windScore = 100;
    else if (conditions.windSpeed < 15) windScore = 85;
    else if (conditions.windSpeed < 20) windScore = 60;
    else windScore = 35; // Too windy
  }

  // Chlorophyll scoring (baitfish indicator)
  if (conditions.chlorophyll !== undefined) {
    if (spotType === 'inshore') {
      // Inshore: higher chlorophyll = more bait
      if (conditions.chlorophyll > 5) chlorophyllScore = 95;
      else if (conditions.chlorophyll > 2) chlorophyllScore = 75;
      else chlorophyllScore = 50;
    } else {
      // Offshore: moderate chlorophyll at edges
      if (conditions.chlorophyll >= 1 && conditions.chlorophyll <= 3) chlorophyllScore = 90;
      else chlorophyllScore = 60;
    }
  }

  // SST BREAK BONUS - This is the killer feature!
  // Temperature breaks attract baitfish and predators
  let sstBreakBonus = 0;
  if (conditions.sstBreak) {
    if (conditions.sstBreak.strength === 'major') {
      // Major break (>2°F): +20 points - PRIME FISHING ZONE
      sstBreakBonus = 20;
    } else if (conditions.sstBreak.strength === 'moderate') {
      // Moderate break (1-2°F): +10 points - Good potential
      sstBreakBonus = 10;
    }
    // No break: +0 points
  }

  // PRESSURE BONUS - Barometric pressure trend affects bite
  let pressureBonus = 0;
  if (conditions.pressureTrend) {
    if (conditions.pressureTrend === 'falling') {
      // Falling pressure = fish feed actively ahead of weather
      pressureBonus = 10;
    } else if (conditions.pressureTrend === 'rising') {
      // Rising pressure = slower bite post-front
      pressureBonus = -5;
    }
    // Stable = 0 (no bonus/penalty)
  }

  // Weighted overall confidence with bonuses
  const baseConfidence = Math.round(
    (sstScore * 0.35) +
    (waveScore * 0.25) +
    (windScore * 0.25) +
    (chlorophyllScore * 0.15)
  );

  const overallConfidence = Math.min(100, Math.max(0, baseConfidence + sstBreakBonus + pressureBonus));

  return {
    sstScore,
    waveScore,
    windScore,
    chlorophyllScore,
    sstBreakBonus,
    overallConfidence
  };
}

/**
 * Fetch ocean conditions for a fishing spot
 * Uses Netlify serverless function to bypass CORS restrictions
 */
export async function getOceanConditions(lat: number, lon: number): Promise<OceanConditions | null> {
  try {
    // Check if we're in production (Netlify) or dev mode
    const isProduction = window.location.hostname !== 'localhost' &&
                        window.location.hostname !== '127.0.0.1' &&
                        !window.location.hostname.includes('figma.com');

    if (!isProduction) {
      // In dev mode, use fallback data immediately
      console.log('Dev mode detected - using simulated ocean data');
      return getFallbackConditions();
    }

    // Call Netlify function (only works in production)
    // Gets wind from buoy 44009 (Delaware Bay) + waves from WaveWatch III model
    const response = await fetch(`/.netlify/functions/ocean-data?buoyId=44009&lat=${lat}&lon=${lon}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn('Ocean data API returned error, using fallback');
      return getFallbackConditions();
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Netlify function not deployed yet, use fallback
      console.warn('Netlify function not available yet, using simulated data');
      return getFallbackConditions();
    }

    const result = await response.json();

    if (result.success) {
      return result.data;
    } else {
      console.warn('Ocean data not available:', result.error);
      return result.data; // Fallback data from function
    }
  } catch (error) {
    console.error('Error fetching ocean conditions:', error);
    return getFallbackConditions();
  }
}

/**
 * Fallback ocean conditions when API is unavailable
 * Simulates typical Ocean City offshore conditions
 */
function getFallbackConditions(): OceanConditions {
  // Simulate realistic varying conditions
  const hour = new Date().getHours();
  const baseSST = 72 + Math.sin(hour / 24 * Math.PI * 2) * 2; // Varies 70-74°F
  const baseWaveHeight = 2 + Math.random() * 1.5; // 2-3.5 ft
  const baseWindSpeed = 10 + Math.random() * 5; // 10-15 kts

  // Generate simulated tide schedule (typical 6-hour cycle)
  const now = new Date();
  const tides: Tide[] = [];
  for (let i = 0; i < 4; i++) {
    const tideTime = new Date(now);
    tideTime.setHours(now.getHours() + (i * 6));
    tides.push({
      time: tideTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      height: 2.5 + Math.sin(i * Math.PI) * 1.5, // Varies 1-4 ft
      type: i % 2 === 0 ? 'High' : 'Low'
    });
  }

  // Simulate chlorophyll varying by time (higher in morning, lower afternoon)
  const baseChlorophyll = 2.0 + Math.sin((hour - 6) / 12 * Math.PI) * 1.5; // Varies 0.5-3.5 mg/m³

  // Simulate SST breaks (25% chance of moderate, 10% chance of major)
  const breakRoll = Math.random();
  let sstBreak: SSTBreak | null = null;

  if (breakRoll < 0.10) {
    // Major break
    const gradient = 2.0 + Math.random() * 1.5; // 2.0-3.5°F
    const warmSide = baseSST + (gradient / 2);
    const coldSide = baseSST - (gradient / 2);
    sstBreak = {
      gradient: Math.round(gradient * 10) / 10,
      coldSide: Math.round(coldSide * 10) / 10,
      warmSide: Math.round(warmSide * 10) / 10,
      strength: 'major',
      description: `${gradient.toFixed(1)}°F break detected - PRIME ZONE`
    };
  } else if (breakRoll < 0.35) {
    // Moderate break
    const gradient = 1.0 + Math.random() * 1.0; // 1.0-2.0°F
    const warmSide = baseSST + (gradient / 2);
    const coldSide = baseSST - (gradient / 2);
    sstBreak = {
      gradient: Math.round(gradient * 10) / 10,
      coldSide: Math.round(coldSide * 10) / 10,
      warmSide: Math.round(warmSide * 10) / 10,
      strength: 'moderate',
      description: `${gradient.toFixed(1)}°F gradient - Good potential`
    };
  }

  // Simulate barometric pressure (normal range 1010-1020 hPa)
  const basePressure = 1013 + Math.sin(hour / 24 * Math.PI * 2) * 5; // Varies 1008-1018 hPa
  let pressureTrend: 'rising' | 'falling' | 'stable';
  if (basePressure > 1015) pressureTrend = 'rising';
  else if (basePressure < 1011) pressureTrend = 'falling';
  else pressureTrend = 'stable';

  // Simulate wind direction (SW is common offshore Ocean City)
  const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const baseWindDir = windDirections[Math.floor(Math.random() * windDirections.length)];

  // Simulate wave period (typical 4-8 seconds)
  const baseWavePeriod = 5 + Math.random() * 3;

  return {
    sst: Math.round(baseSST * 10) / 10,
    waveHeight: Math.round(baseWaveHeight * 10) / 10,
    wavePeriod: Math.round(baseWavePeriod),
    windSpeed: Math.round(baseWindSpeed),
    windDirection: baseWindDir,
    chlorophyll: Math.round(baseChlorophyll * 10) / 10,
    currentSpeed: 1.5,
    currentDirection: 'SW',
    tides,
    sstBreak,
    pressure: Math.round(basePressure * 10) / 10,
    pressureTrend
  };
}

/**
 * Helper: Convert Celsius to Fahrenheit
 */
function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5 + 32) * 10) / 10;
}

/**
 * Parse coordinates from GPS string format (e.g., "38°18'N 75°03'W")
 */
export function parseCoordinates(coordString: string): { lat: number; lon: number } | null {
  try {
    const match = coordString.match(/(\d+)°(\d+)'([NS])\s+(\d+)°(\d+)'([EW])/);
    if (!match) return null;

    const lat = parseInt(match[1]) + parseInt(match[2]) / 60;
    const lon = parseInt(match[4]) + parseInt(match[5]) / 60;

    return {
      lat: match[3] === 'S' ? -lat : lat,
      lon: match[6] === 'W' ? -lon : lon
    };
  } catch {
    return null;
  }
}
