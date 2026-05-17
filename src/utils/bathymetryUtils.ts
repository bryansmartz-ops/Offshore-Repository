// Fetch high-fidelity bathymetry contours from NOAA ETOPO

export interface BathymetryContour {
  depth: number; // Depth in feet
  label: string; // e.g., "600ft"
  coordinates: number[][][]; // GeoJSON MultiPolygon format
}

export interface BathymetryData {
  contours: BathymetryContour[];
  gridInfo: {
    width: number;
    height: number;
    bounds: {
      minLat: number;
      maxLat: number;
      minLon: number;
      maxLon: number;
    };
  };
}

export async function fetchBathymetry(): Promise<BathymetryData | null> {
  try {
    console.log('Fetching high-fidelity bathymetry data...');

    const response = await fetch('/.netlify/functions/bathymetry');

    if (!response.ok) {
      console.error('Bathymetry fetch failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.success && data.data) {
      console.log(`Loaded ${data.data.contours.length} bathymetry contour levels`);
      return data.data;
    }

    return null;
  } catch (error) {
    console.error('Error fetching bathymetry:', error);
    return null;
  }
}

// Get color for depth contour - simple gray scale
export function getDepthColor(depthFeet: number): string {
  // Single brown/tan color like nautical charts
  return '#8b7355';
}

// Get line weight for depth contour
export function getDepthWeight(depthFeet: number): number {
  // Major structural boundaries - thickest
  if (depthFeet === 100 || depthFeet === 600 || depthFeet === 1200 || depthFeet === 3000) return 4;

  // Secondary major contours (every 300ft)
  if (depthFeet === 300 || depthFeet === 900 || depthFeet === 1500 || depthFeet === 1800) return 3;

  // Detail contours (50ft intervals)
  return 2;
}
