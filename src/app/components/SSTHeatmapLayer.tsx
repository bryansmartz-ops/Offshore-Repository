import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface SSTHeatmapLayerProps {
  points: Array<{ lat: number; lon: number; sst: number }>;
  opacity: number;
}

// Extend Leaflet types for heatLayer
declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      minOpacity?: number;
      gradient?: { [key: number]: string };
    }
  ): any;
}

export default function SSTHeatmapLayer({ points, opacity }: SSTHeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Convert SST points to heatmap format: [lat, lon, intensity]
    // Normalize SST to 0-1 scale (range 50°F - 85°F)
    const heatPoints: Array<[number, number, number]> = points.map(p => [
      p.lat,
      p.lon,
      (p.sst - 50) / 35 // Normalize to 0-1 range (50°F=0, 85°F=1)
    ]);

    // Create custom gradient matching our SST color scale EXACTLY
    // Legend: <68°F=Blue, 68-72°F=Green, 72-75°F=Yellow, 75-78°F=Orange, 78°F+=Red
    const gradient = {
      0.0: '#1e3a8a',    // 50°F - Dark Blue (very cold)
      0.257: '#3b82f6',  // 59°F - Blue
      0.514: '#22c55e',  // 68°F - Green (transition point)
      0.629: '#facc15',  // 72°F - Yellow (transition point)
      0.714: '#f97316',  // 75°F - Orange (transition point)
      0.8: '#dc2626',    // 78°F - Red (transition point)
      1.0: '#991b1b'     // 85°F - Dark Red (very hot)
    };

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 30,           // Smaller radius for more accurate color zones
      blur: 15,             // Less blur = more accurate colors, less blending
      maxZoom: 12,
      max: 1.0,
      minOpacity: opacity,  // Use opacity directly (not multiplied)
      gradient: gradient
    });

    heatLayer.addTo(map);

    // Cleanup on unmount
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, opacity]);

  return null; // This component doesn't render DOM elements
}
