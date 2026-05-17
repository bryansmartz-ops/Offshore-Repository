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

    // Find actual min/max SST in dataset for accurate normalization
    const sstValues = points.map(p => p.sst).filter(s => s > 0);
    const minSST = Math.min(...sstValues);
    const maxSST = Math.max(...sstValues);

    console.log(`SST Heatmap range: ${minSST.toFixed(1)}°F - ${maxSST.toFixed(1)}°F (${points.length} points)`);
    console.log(`Sample points:`, points.slice(0, 5).map(p => `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}: ${p.sst.toFixed(1)}°F`));

    // Convert SST points to heatmap format: [lat, lon, intensity]
    // Use actual data range for better accuracy
    const dataRange = maxSST - minSST;
    const heatPoints: Array<[number, number, number]> = points.map(p => {
      // Normalize using actual data range
      const normalized = (p.sst - minSST) / dataRange;
      return [p.lat, p.lon, normalized];
    });

    // Create gradient based on absolute temperatures (not normalized range)
    // Map each color stop to position in the ACTUAL data range
    const createGradientStop = (tempF: number) => {
      return (tempF - minSST) / dataRange;
    };

    const gradient: { [key: number]: string } = {};

    // Add stops based on actual temperature range
    if (minSST <= 65) gradient[createGradientStop(65)] = '#3b82f6';  // Blue
    gradient[createGradientStop(68)] = '#22c55e';  // Green
    gradient[createGradientStop(72)] = '#facc15';  // Yellow
    gradient[createGradientStop(75)] = '#f97316';  // Orange
    gradient[createGradientStop(78)] = '#dc2626';  // Red
    if (maxSST >= 82) gradient[createGradientStop(82)] = '#991b1b';  // Dark Red

    console.log('Heatmap gradient stops:', gradient);

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 20,           // Smaller radius for sharper definition
      blur: 12,             // Minimal blur for accurate colors
      maxZoom: 12,
      max: 0.8,             // Lower max to prevent oversaturation
      minOpacity: opacity,
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
