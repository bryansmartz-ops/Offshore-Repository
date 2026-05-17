import { Handler } from '@netlify/functions';

const ERDDAP_BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap';

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
    // Dense grid for heatmap visualization (Mid-Atlantic fishing grounds)
    const minLat = 36.0;
    const maxLat = 40.0;
    const minLon = -75.5;
    const maxLon = -72.0;
    const stride = 5; // Smaller stride = more points for smooth gradients

    console.log(`Fetching dense SST grid for heatmap: ${minLat}-${maxLat}, ${minLon}-${maxLon}, stride=${stride}`);

    const gridUrl = `${ERDDAP_BASE_URL}/griddap/jplMURSST41.json?analysed_sst[(last)][(${minLat}):${stride}:(${maxLat})][(${minLon}):${stride}:(${maxLon})]`;

    const response = await fetch(gridUrl);

    if (!response.ok) {
      console.error(`ERDDAP request failed: ${response.status} ${response.statusText}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'ERDDAP API error',
          data: { points: [] }
        })
      };
    }

    const data = await response.json();

    if (!data.table || !data.table.rows) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid ERDDAP response',
          data: { points: [] }
        })
      };
    }

    // Convert ERDDAP grid to heatmap points
    const points = data.table.rows.map((row: any[]) => {
      const lat = row[1];
      const lon = row[2];
      const sstCelsius = row[3];
      const sstFahrenheit = (sstCelsius * 9/5) + 32;

      return {
        lat: lat,
        lon: lon,
        sst: Math.round(sstFahrenheit * 10) / 10
      };
    }).filter((p: any) => p.sst > 0); // Remove invalid values

    console.log(`Returning ${points.length} SST heatmap points`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          points: points,
          gridInfo: {
            minLat,
            maxLat,
            minLon,
            maxLon,
            stride,
            pointCount: points.length
          }
        }
      })
    };

  } catch (error) {
    console.error('SST heatmap grid error:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Server error',
        data: { points: [] }
      })
    };
  }
};
