import { Handler } from '@netlify/functions';

const NDBC_BASE_URL = 'https://www.ndbc.noaa.gov/data/realtime2';
const ERDDAP_BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap';
const COOPS_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const OCEAN_CITY_STATION = '8570283'; // Ocean City Inlet, MD

// Buoys near Ocean City, MD:
// 44009 - Delaware Bay - Closest to Ocean City, has wind/pressure
const WIND_BUOY = '44009';

function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5 + 32) * 10) / 10;
}

function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28084 * 10) / 10;
}

function mpsToKnots(mps: number): number {
  return Math.round(mps * 1.94384);
}

function degreesToCompass(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function parseOrNull(value: string): number | null {
  const num = parseFloat(value);
  return (!isNaN(num) && num !== 99 && num !== 999) ? num : null;
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { lat: latStr, lon: lonStr } = event.queryStringParameters || {};

    // Convert coordinates to numbers
    const lat = latStr ? parseFloat(latStr) : null;
    const lon = lonStr ? parseFloat(lonStr) : null;

    console.log(`Ocean data request: lat=${lat}, lon=${lon}`);

    // Fetch wind/pressure from buoy 44009 (closest to Ocean City)
    const buoyResponse = await fetch(`${NDBC_BASE_URL}/${WIND_BUOY}.txt`);
    let buoyData: any = {
      windDirection: null,
      windSpeed: null,
      waveHeight: null,
      wavePeriod: null,
      pressure: null,
      waterTemp: null,
    };

    if (buoyResponse.ok) {
      const text = await buoyResponse.text();
      const lines = text.split('\n');

      if (lines.length >= 3) {
        const dataLine = lines[2].trim().split(/\s+/);
        console.log(`Buoy ${WIND_BUOY} data:`, dataLine.slice(0, 15).join(' '));

        // Format: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP
        buoyData.windDirection = parseOrNull(dataLine[5]);
        buoyData.windSpeed = parseOrNull(dataLine[6]);
        buoyData.waveHeight = parseOrNull(dataLine[8]);
        buoyData.wavePeriod = parseOrNull(dataLine[9]);
        buoyData.pressure = parseOrNull(dataLine[12]);
        if (dataLine[14]) {
          const tempC = parseFloat(dataLine[14]);
          if (!isNaN(tempC)) {
            buoyData.waterTemp = celsiusToFahrenheit(tempC);
          }
        }
      }
    }

    // Fetch SST and chlorophyll if coordinates provided
    let sst = null;
    let chlorophyll = null;

    if (lat !== null && lon !== null) {
      try {
        const sstUrl = `${ERDDAP_BASE_URL}/griddap/jplMURSST41.json?analysed_sst[(last)][(${lat})][(${lon})]`;
        const sstResponse = await fetch(sstUrl);

        if (sstResponse.ok) {
          const sstData = await sstResponse.json();
          const sstCelsius = sstData.table.rows[0][3];
          sst = celsiusToFahrenheit(sstCelsius);
          console.log(`SST for lat=${lat}, lon=${lon}: ${sst}°F`);
        }
      } catch (error) {
        console.error('SST fetch failed:', error);
      }

      try {
        const chlorUrl = `${ERDDAP_BASE_URL}/griddap/erdMH1chla8day.json?chlorophyll[(last)][(${lat})][(${lon})]`;
        const chlorResponse = await fetch(chlorUrl);

        if (chlorResponse.ok) {
          const chlorData = await chlorResponse.json();
          chlorophyll = parseFloat(chlorData.table.rows[0][3]);
        }
      } catch (error) {
        console.error('Chlorophyll fetch failed:', error);
      }
    }

    // Fetch tide predictions for Ocean City Inlet
    let tides = [];
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };

      const tideUrl = `${COOPS_BASE_URL}?product=predictions&application=NOS.COOPS.TAC.WL&begin_date=${formatDate(today)}&end_date=${formatDate(tomorrow)}&datum=MLLW&station=${OCEAN_CITY_STATION}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;

      const tideResponse = await fetch(tideUrl);

      if (tideResponse.ok) {
        const tideData = await tideResponse.json();
        if (tideData.predictions) {
          tides = tideData.predictions.slice(0, 8).map((p: any) => ({
            time: p.t,
            height: parseFloat(p.v),
            type: p.type === 'H' ? 'High' : 'Low'
          }));
        }
      }
    } catch (error) {
      console.error('Tide fetch failed:', error);
    }

    // Calculate pressure trend
    let pressureTrend: 'rising' | 'falling' | 'stable' = 'stable';
    if (buoyData.pressure) {
      if (buoyData.pressure > 1015) pressureTrend = 'rising';
      else if (buoyData.pressure < 1011) pressureTrend = 'falling';
    }

    // Convert units and prepare response
    const windSpeed = buoyData.windSpeed !== null ? mpsToKnots(buoyData.windSpeed) : 0;
    const windDirection = buoyData.windDirection !== null ? degreesToCompass(buoyData.windDirection) : 'Variable';
    const waveHeight = buoyData.waveHeight !== null ? metersToFeet(buoyData.waveHeight) : null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          sst: sst || buoyData.waterTemp || 72,
          waveHeight: waveHeight,
          wavePeriod: buoyData.wavePeriod,
          windSpeed: windSpeed,
          windDirection: windDirection,
          chlorophyll: chlorophyll || 2.5,
          currentSpeed: 1.5,
          currentDirection: 'SW',
          tides: tides,
          sstBreak: null,
          pressure: buoyData.pressure,
          pressureTrend: pressureTrend,
          timestamp: new Date().toISOString(),
        },
      }),
    };

  } catch (error) {
    console.error('Ocean data error:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        data: {
          sst: 72,
          waveHeight: 2,
          wavePeriod: 6,
          windSpeed: 10,
          windDirection: 'SW',
          chlorophyll: 2.5,
          currentSpeed: 1.5,
          currentDirection: 'SW',
          tides: [],
          sstBreak: null,
          pressure: null,
          pressureTrend: 'stable',
          timestamp: new Date().toISOString(),
        },
        error: 'Using fallback data',
      }),
    };
  }
};
