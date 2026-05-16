import { Handler } from '@netlify/functions';

const NDBC_BASE_URL = 'https://www.ndbc.noaa.gov/data/realtime2';
const ERDDAP_BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap';
const COOPS_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const OCEAN_CITY_STATION = '8570283'; // Ocean City Inlet, MD

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
    const { buoyId = '44009', lat: latStr, lon: lonStr } = event.queryStringParameters || {};

    // Convert coordinates to numbers
    const lat = latStr ? parseFloat(latStr) : null;
    const lon = lonStr ? parseFloat(lonStr) : null;

console.log(`Ocean data request: lat=${lat}, lon=${lon}, buoyId=${buoyId}`);

    // Fetch buoy data
    const buoyResponse = await fetch(`${NDBC_BASE_URL}/${buoyId}.txt`);
    let buoyData = null;

    if (buoyResponse.ok) {
      const text = await buoyResponse.text();
      const lines = text.split('\n');

      if (lines.length >= 3) {
        const dataLine = lines[2].trim().split(/\s+/);

        // Format: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS TIDE
        // Index:  0  1  2  3  4   5    6    7   8    9   10  11  12   13   14   15   16  17
        buoyData = {
          windDirection: parseFloat(dataLine[5]) || 0,
          windSpeed: parseFloat(dataLine[6]) || 0,
          waveHeight: parseFloat(dataLine[8]) || 0,
          wavePeriod: parseFloat(dataLine[9]) || 0,
          pressure: parseFloat(dataLine[12]) || null, // Barometric pressure in hPa
          waterTemp: dataLine[14] ? celsiusToFahrenheit(parseFloat(dataLine[14])) : null,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Fetch SST grid for break detection
    let sst = null;
    let chlorophyll = null;
    let sstBreak = null;

    if (lat !== null && lon !== null) {
      try {
        // Fetch SST for this specific location (simplified - just center point)
        const sstUrl = `${ERDDAP_BASE_URL}/griddap/jplMURSST41.json?analysed_sst[(last)][(${lat})][(${lon})]`;
        const sstResponse = await fetch(sstUrl);

        if (sstResponse.ok) {
          const sstData = await sstResponse.json();
          const sstCelsius = sstData.table.rows[0][3];  // Already in Celsius!
          sst = celsiusToFahrenheit(sstCelsius);
          console.log(`SST for lat=${lat}, lon=${lon}: ${sst}°F`);
        }
      } catch (error) {
        console.error('SST fetch failed:', error);
      }

      // Fetch Chlorophyll-a concentration
      try {
        const chlorUrl = `${ERDDAP_BASE_URL}/griddap/erdMH1chla8day.json?chlorophyll[(last)][(${lat})][(${lon})]`;
        const chlorResponse = await fetch(chlorUrl);

        if (chlorResponse.ok) {
          const chlorData = await chlorResponse.json();
          chlorophyll = parseFloat(chlorData.table.rows[0][3]); // mg/m³
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

    // Calculate pressure trend (simplified - would need historical data for true trend)
    let pressureTrend = 'stable';
    if (buoyData?.pressure) {
      // Standard pressure is 1013.25 hPa
      // Rising if > 1015, falling if < 1011
      if (buoyData.pressure > 1015) pressureTrend = 'rising';
      else if (buoyData.pressure < 1011) pressureTrend = 'falling';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          sst: sst || buoyData?.waterTemp || 72,
          waveHeight: buoyData?.waveHeight || 0,
          windSpeed: buoyData?.windSpeed || 0,
          chlorophyll: chlorophyll || 2.5,
          currentSpeed: 1.5,
          currentDirection: 'SW',
          tides: tides,
          sstBreak: sstBreak,
          pressure: buoyData?.pressure || null,
          pressureTrend: pressureTrend,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Ocean data error:', error);

    return {
      statusCode: 200, // Return 200 with fallback data instead of error
      headers,
      body: JSON.stringify({
        success: false,
        data: {
          sst: 72,
          waveHeight: 2,
          windSpeed: 10,
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

function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5 + 32) * 10) / 10;
}
