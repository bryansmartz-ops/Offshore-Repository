import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Hotspot {
  id: number;
  name: string;
  coordinates: string;
  loranCoordinates?: string;
  distance: number;
  confidence: number;
  lat: number;
  lon: number;
  sst?: number;
}

interface HotspotsMapProps {
  hotspots: Hotspot[];
  selectedPrimary: number | null;
  selectedSecondary: number | null;
  onSelectHotspot?: (index: number) => void;
}

// Ocean City Inlet coordinates
const OCEAN_CITY_INLET: LatLngExpression = [38.328, -75.089];

// Distance rings (in meters - 1 nautical mile = 1852 meters)
const DISTANCE_RINGS = [
  { distance: 25, color: '#3b82f6', label: '25nm' },
  { distance: 50, color: '#8b5cf6', label: '50nm' },
  { distance: 75, color: '#ec4899', label: '75nm' },
  { distance: 100, color: '#ef4444', label: '100nm - Tournament Limit' }
];

// Custom marker icons
const createMarkerIcon = (rank: number, isPrimary: boolean, isSecondary: boolean) => {
  const color = isPrimary ? '#22c55e' : isSecondary ? '#3b82f6' : '#f59e0b';
  const size = isPrimary || isSecondary ? 36 : 28;

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="12" y="16" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${rank}</text>
      </svg>
    `)}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Inlet marker
const inletIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#0ea5e9" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  `)}`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// Helper to parse DMS coordinates to decimal
function parseDMSCoordinates(coordString: string): { lat: number; lon: number } | null {
  const latMatch = coordString.match(/(\d+)°(\d+)'([NS])/);
  const lonMatch = coordString.match(/(\d+)°(\d+)'([EW])/);

  if (!latMatch || !lonMatch) return null;

  const lat = parseInt(latMatch[1]) + parseInt(latMatch[2]) / 60;
  const lon = parseInt(lonMatch[1]) + parseInt(lonMatch[2]) / 60;

  return {
    lat: latMatch[3] === 'S' ? -lat : lat,
    lon: lonMatch[3] === 'W' ? -lon : lon
  };
}

export default function HotspotsMap({ hotspots, selectedPrimary, selectedSecondary, onSelectHotspot }: HotspotsMapProps) {
  // Convert hotspots to include parsed coordinates
  const hotspotsWithCoords = hotspots.map((spot, index) => {
    const coords = parseDMSCoordinates(spot.coordinates);
    return {
      ...spot,
      lat: coords?.lat || 0,
      lon: coords?.lon || 0,
      rank: index + 1
    };
  }).filter(spot => spot.lat !== 0 && spot.lon !== 0);

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-lg">Tactical Map View</h3>
        <p className="text-xs text-slate-400 mt-1">
          Hotspots plotted with distance rings from Ocean City Inlet
        </p>
      </div>

      <div className="h-[600px] relative">
        <MapContainer
          center={OCEAN_CITY_INLET}
          zoom={8}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          {/* Ocean basemap */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Distance rings from Ocean City Inlet */}
          {DISTANCE_RINGS.map((ring) => (
            <Circle
              key={ring.distance}
              center={OCEAN_CITY_INLET}
              radius={ring.distance * 1852} // Convert nm to meters
              pathOptions={{
                color: ring.color,
                fillColor: ring.color,
                fillOpacity: 0.05,
                weight: 2,
                dashArray: '5, 10'
              }}
            />
          ))}

          {/* Ocean City Inlet marker */}
          <Marker position={OCEAN_CITY_INLET} icon={inletIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-blue-600">Ocean City Inlet</p>
                <p className="text-xs text-gray-600">Departure Point</p>
                <p className="text-xs font-mono">38°19'N 75°05'W</p>
              </div>
            </Popup>
          </Marker>

          {/* Hotspot markers */}
          {hotspotsWithCoords.map((spot, index) => {
            const isPrimary = selectedPrimary === index;
            const isSecondary = selectedSecondary === index;

            return (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lon]}
                icon={createMarkerIcon(spot.rank, isPrimary, isSecondary)}
                eventHandlers={{
                  click: () => onSelectHotspot?.(index)
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded font-bold text-xs">
                        #{spot.rank}
                      </span>
                      {isPrimary && (
                        <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                          PRIMARY
                        </span>
                      )}
                      {isSecondary && (
                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                          BACKUP
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 mb-1">{spot.name}</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p className="font-mono">{spot.coordinates}</p>
                      {spot.loranCoordinates && (
                        <p className="font-mono text-gray-500">9960: {spot.loranCoordinates}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                        <div>
                          <p className="text-gray-500">Distance</p>
                          <p className="font-semibold text-gray-900">{spot.distance} nm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Confidence</p>
                          <p className="font-semibold text-green-600">{spot.confidence}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur rounded-lg p-3 text-xs z-[1000]">
          <p className="font-semibold mb-2 text-white">Distance from Inlet</p>
          <div className="space-y-1">
            {DISTANCE_RINGS.map((ring) => (
              <div key={ring.distance} className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5"
                  style={{ backgroundColor: ring.color, opacity: 0.8 }}
                />
                <span className="text-slate-300">{ring.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-slate-300">Primary Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-slate-300">Secondary/Backup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="text-slate-300">Other Hotspots</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
