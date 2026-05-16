// SST Grid API - finds dynamic fishing hotspots based on real-time temperature breaks

interface SSTHotspot {
  name: string;
  lat: number;
  lon: number;
  sst: number;
  confidence: number;
  reasons: string[];
  type: 'break' | 'structure' | 'combined';
  break?: {
    gradient: number;
    coldSide: number;
    warmSide: number;
    strength: string;
  };
}

interface SSTGridResponse {
  success: boolean;
  data: {
    gridPoints: number;
    breaksFound: number;
    warmZones: number;
    hotspots: SSTHotspot[];
    targetSpecies: string;
    targetTempRange: string;
    timestamp: string;
  };
  error?: string;
}

export async function getSSTGridHotspots(
  targetSpecies: string,
  minLat: number = 36.0,
  maxLat: number = 40.0,
  minLon: number = -75.5,
  maxLon: number = -72.0
): Promise<SSTGridResponse | null> {
  try {
    const url = `/.netlify/functions/sst-grid?minLat=${minLat}&maxLat=${maxLat}&minLon=${minLon}&maxLon=${maxLon}&targetSpecies=${encodeURIComponent(targetSpecies)}`;

    console.log(`Fetching SST grid for ${targetSpecies}...`);

    const response = await fetch(url);
    const data: SSTGridResponse = await response.json();

    if (data.success) {
      console.log(`SST Grid: ${data.data.gridPoints} points scanned, ${data.data.breaksFound} breaks found, ${data.data.hotspots.length} hotspots generated`);
      return data;
    } else {
      console.error('SST grid scan failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch SST grid:', error);
    return null;
  }
}

export type { SSTHotspot, SSTGridResponse };
