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

// Get color for depth contour
export function getDepthColor(depthFeet: number): string {
  if (depthFeet <= 100) return '#60a5fa';   // Light blue - Shallow
  if (depthFeet <= 300) return '#3b82f6';   // Blue - Shelf
  if (depthFeet <= 600) return '#f59e0b';   // Orange - Shelf edge
  if (depthFeet <= 1200) return '#dc2626';  // Red - Canyon
  if (depthFeet <= 1800) return '#991b1b';  // Dark red - Deep canyon
  return '#7f1d1d';                         // Very dark red - Abyssal
}

// Get line weight for depth contour
export function getDepthWeight(depthFeet: number): number {
  // Thicker lines for major depth changes
  if (depthFeet === 100 || depthFeet === 600 || depthFeet === 1200) return 3;
  return 2;
}
