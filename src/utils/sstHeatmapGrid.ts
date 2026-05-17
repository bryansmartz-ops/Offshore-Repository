// Fetch dense SST grid for heatmap visualization
// This queries a finer grid than the hotspot scanner for smooth gradients

interface SSTGridPoint {
  lat: number;
  lon: number;
  sst: number;
}

export async function fetchSSTHeatmapGrid(): Promise<SSTGridPoint[]> {
  try {
    const response = await fetch('/.netlify/functions/sst-heatmap-grid');

    if (!response.ok) {
      console.error('SST heatmap grid fetch failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.success && data.data?.points) {
      console.log(`Loaded ${data.data.points.length} SST grid points for heatmap`);
      return data.data.points;
    }

    return [];
  } catch (error) {
    console.error('Error fetching SST heatmap grid:', error);
    return [];
  }
}
