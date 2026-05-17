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
    // Normalize SST to 0-1 scale (assume range 50°F - 85°F)
    const heatPoints: Array<[number, number, number]> = points.map(p => [
      p.lat,
      p.lon,
      (p.sst - 50) / 35 // Normalize to 0-1 range
    ]);

    // Create custom gradient matching our SST color scale
    const gradient = {
      0.0: '#1e40af',  // <65°F - Dark Blue (cold)
      0.43: '#3b82f6', // 65°F - Blue
      0.51: '#22c55e', // 68°F - Green
      0.63: '#facc15', // 72°F - Yellow
      0.71: '#f97316', // 75°F - Orange
      0.8: '#dc2626',  // 78°F - Red
      1.0: '#991b1b'   // >82°F - Dark Red (very hot)
    };

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 50,           // Large radius to fill gaps between sparse points
      blur: 35,             // High blur for smooth RipChart-style transitions
      maxZoom: 12,          // Lower maxZoom for better visibility at fishing scale
      max: 1.0,
      minOpacity: opacity * 0.5, // Adjust for visibility
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
