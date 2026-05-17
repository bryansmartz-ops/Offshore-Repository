import { Handler } from '@netlify/functions';
import { contours } from 'd3-contour';

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
    // Mid-Atlantic fishing grounds bathymetry
    const minLat = 36.0;
    const maxLat = 40.0;
    const minLon = -76.0;
    const maxLon = -72.0;
    const stride = 10; // Balance between detail and performance

    console.log(`Fetching bathymetry grid: ${minLat}-${maxLat}, ${minLon}-${maxLon}`);

    // ETOPO Global Relief Model (includes bathymetry)
    const bathyUrl = `${ERDDAP_BASE_URL}/griddap/etopo180.json?altitude[(${minLat}):${stride}:(${maxLat})][(${minLon}):${stride}:(${maxLon})]`;

    const response = await fetch(bathyUrl);

    if (!response.ok) {
      console.error(`ERDDAP bathymetry request failed: ${response.status}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Bathymetry data unavailable',
          data: { contours: [] }
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
          error: 'Invalid bathymetry response',
          data: { contours: [] }
        })
      };
    }

    // Build depth grid
    const rows = data.table.rows;
    console.log(`Received ${rows.length} bathymetry points`);

    // Determine grid dimensions
    const latSet = new Set(rows.map((r: any[]) => r[0]));
    const lonSet = new Set(rows.map((r: any[]) => r[1]));
    const latValues = Array.from(latSet).sort((a, b) => a - b);
    const lonValues = Array.from(lonSet).sort((a, b) => a - b);

    const gridWidth = lonValues.length;
    const gridHeight = latValues.length;

    // Create depth grid (flip vertically for contour generation)
    const depthGrid: number[] = new Array(gridWidth * gridHeight).fill(0);

    rows.forEach((row: any[]) => {
      const lat = row[0];
      const lon = row[1];
      const depth = row[2]; // Altitude/depth in meters (negative = below sea level)

      const latIdx = latValues.indexOf(lat);
      const lonIdx = lonValues.indexOf(lon);

      if (latIdx >= 0 && lonIdx >= 0) {
        // Store as positive depth (meters below sea level)
        depthGrid[latIdx * gridWidth + lonIdx] = Math.abs(depth);
      }
    });

    // Generate contours at key fishing depths (convert feet to meters)
    const depthLevels = [
      { feet: 50, meters: 15, label: '50ft' },
      { feet: 100, meters: 30, label: '100ft' },
      { feet: 200, meters: 61, label: '200ft' },
      { feet: 300, meters: 91, label: '300ft' },
      { feet: 600, meters: 183, label: '600ft' },
      { feet: 900, meters: 274, label: '900ft' },
      { feet: 1200, meters: 366, label: '1200ft' },
      { feet: 1800, meters: 549, label: '1800ft' },
      { feet: 3000, meters: 914, label: '3000ft' }
    ];

    const contourGenerator = contours()
      .size([gridWidth, gridHeight])
      .thresholds(depthLevels.map(d => d.meters));

    const generatedContours = contourGenerator(depthGrid);

    // Convert contours to lat/lon coordinates
    const outputContours = generatedContours.map((contour, idx) => {
      const depthInfo = depthLevels[idx];

      // Convert grid coordinates to lat/lon
      const coordinates = contour.coordinates.map(polygon =>
        polygon.map(ring =>
          ring.map(point => {
            const lonIdx = Math.floor(point[0]);
            const latIdx = Math.floor(point[1]);

            const lon = lonValues[lonIdx] || minLon;
            const lat = latValues[latIdx] || minLat;

            return [lat, lon];
          })
        )
      );

      return {
        depth: depthInfo.feet,
        label: depthInfo.label,
        coordinates: coordinates
      };
    }).filter(c => c.coordinates.length > 0); // Remove empty contours

    console.log(`Generated ${outputContours.length} contour levels`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          contours: outputContours,
          gridInfo: {
            width: gridWidth,
            height: gridHeight,
            bounds: { minLat, maxLat, minLon, maxLon }
          }
        }
      })
    };

  } catch (error) {
    console.error('Bathymetry error:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Server error',
        data: { contours: [] }
      })
    };
  }
};
