import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from 'react-leaflet';
import { LatLngExpression, Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Hotspot {
  id: number;
  name: string;
  coordinates: string;
  loranCoordinates?: string;
  distance: number;
  confidence: number;
  lat?: number;
  lon?: number;
  sst?: number;
  conditions?: {
    sst?: string;
  };
}

interface HotspotsMapProps {
  hotspots: Hotspot[];
  selectedPrimary: number | null;
  selectedSecondary: number | null;
  onSelectHotspot?: (index: number) => void;
}

// Ocean City Inlet coordinates
const OCEAN_CITY_INLET: LatLngExpression = [38.328, -75.089];

// Known fishing structures and canyons (Mid-Atlantic)
const KNOWN_STRUCTURES = [
  { name: "Poor Man's Canyon", lat: 38.45, lon: -73.95, depth: "600-1200ft", type: 'canyon' },
  { name: "Great Gull Bank", lat: 38.75, lon: -73.5, depth: "100-180ft", type: 'bank' },
  { name: "Jackspot", lat: 38.58, lon: -73.75, depth: "240ft", type: 'lump' },
  { name: "Tea Cup", lat: 38.35, lon: -74.25, depth: "180ft", type: 'lump' },
  { name: "Norfolk Canyon", lat: 37.0, lon: -74.5, depth: "600-2000ft", type: 'canyon' },
  { name: "Washington Canyon", lat: 38.15, lon: -73.8, depth: "800-2400ft", type: 'canyon' },
  { name: "Baltimore Canyon", lat: 38.3, lon: -73.7, depth: "600-1800ft", type: 'canyon' },
  { name: "Wilmington Canyon", lat: 38.5, lon: -73.3, depth: "600-1500ft", type: 'canyon' },
  { name: "Poor Man's South", lat: 38.35, lon: -74.0, depth: "500-900ft", type: 'canyon' },
  { name: "The Fingers", lat: 38.6, lon: -73.6, depth: "300-600ft", type: 'ridge' },
];

// Canyon labels - positioned along canyon axes
const CANYON_LABELS = [
  { name: "Norfolk Canyon", lat: 36.95, lon: -74.4 },
  { name: "Washington Canyon", lat: 38.1, lon: -73.75 },
  { name: "Baltimore Canyon", lat: 38.25, lon: -73.65 },
  { name: "Wilmington Canyon", lat: 38.45, lon: -73.25 },
  { name: "Poor Man's Canyon", lat: 38.4, lon: -73.9 },
  { name: "Hudson Canyon", lat: 39.2, lon: -72.8 },
  { name: "Spencer Canyon", lat: 39.6, lon: -72.5 },
];

// Create canyon label icon
const createCanyonLabel = (name: string) => {
  return new DivIcon({
    className: 'canyon-label',
    html: `<div style="
      color: #f97316;
      font-weight: bold;
      font-size: 11px;
      text-shadow:
        -1px -1px 0 rgba(0,0,0,0.8),
        1px -1px 0 rgba(0,0,0,0.8),
        -1px 1px 0 rgba(0,0,0,0.8),
        1px 1px 0 rgba(0,0,0,0.8),
        0 0 4px rgba(0,0,0,0.9);
      white-space: nowrap;
      pointer-events: none;
      text-transform: uppercase;
      letter-spacing: 1px;
    ">${name}</div>`,
    iconSize: [120, 20],
    iconAnchor: [60, 10]
  });
};


// SST color scale
const getSSTColor = (temp: number) => {
  if (temp >= 78) return '#dc2626'; // Hot - Red
  if (temp >= 75) return '#f97316'; // Warm - Orange
  if (temp >= 72) return '#facc15'; // Good - Yellow
  if (temp >= 68) return '#22c55e'; // Cool - Green
  if (temp >= 65) return '#3b82f6'; // Cold - Blue
  return '#1e40af'; // Very Cold - Dark Blue
};

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

// Structure marker (canyons, banks, lumps)
const createStructureIcon = (type: string) => {
  const color = type === 'canyon' ? '#a855f7' : type === 'bank' ? '#06b6d4' : '#eab308';
  const symbol = type === 'canyon' ? 'C' : type === 'bank' ? 'B' : 'L';

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="12" y="16" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${symbol}</text>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

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
  // Layer toggles
  const [showStructures, setShowStructures] = useState(true);
  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [showSSTCircles, setShowSSTCircles] = useState(true);
  const [showSSTLabels, setShowSSTLabels] = useState(true);
  const [showBathymetry, setShowBathymetry] = useState(true);
  const [bathyOpacity, setBathyOpacity] = useState(0.8);



  // Convert hotspots to include parsed coordinates
  const hotspotsWithCoords = hotspots.map((spot, index) => {
    // Use coordinates if lat/lon not directly available
    let lat = spot.lat || 0;
    let lon = spot.lon || 0;

    if ((!lat || !lon) && spot.coordinates) {
      const coords = parseDMSCoordinates(spot.coordinates);
      lat = coords?.lat || 0;
      lon = coords?.lon || 0;
    }

    // Extract SST value - prefer numeric sst, fallback to parsing conditions.sst
    let sstValue = spot.sst;
    if (!sstValue && spot.conditions?.sst) {
      const match = spot.conditions.sst.match(/(\d+\.?\d*)/);
      if (match) {
        sstValue = parseFloat(match[1]);
      }
    }
    sstValue = sstValue || 70; // Default fallback

    return {
      ...spot,
      lat,
      lon,
      sst: sstValue,
      rank: index + 1
    };
  }).filter(spot => spot.lat !== 0 && spot.lon !== 0);

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-lg">Tactical Map View</h3>
        <p className="text-xs text-slate-400 mt-1">
          Hotspots plotted with distance rings from Ocean City Inlet
          {showBathymetry && (
            <span className="ml-2 text-blue-400">• High-res bathymetry active</span>
          )}
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

          {/* High-Resolution Bathymetry from GEBCO/EMODnet */}
          {showBathymetry && (
            <TileLayer
              url="https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png"
              attribution='<a href="https://emodnet.eu/bathymetry">EMODnet Bathymetry</a>'
              opacity={bathyOpacity}
              maxZoom={13}
            />
          )}

          {/* Distance rings from Ocean City Inlet */}
          {showDistanceRings && DISTANCE_RINGS.map((ring) => (
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

          {/* SST color circles around hotspots */}
          {showSSTCircles && hotspotsWithCoords.map((spot) => {
            const sstColor = getSSTColor(spot.sst);
            return (
              <Circle
                key={`sst-${spot.id}`}
                center={[spot.lat, spot.lon]}
                radius={3704} // ~2nm diameter
                pathOptions={{
                  color: sstColor,
                  fillColor: sstColor,
                  fillOpacity: 0.4,
                  weight: 2,
                  opacity: 0.8
                }}
              />
            );
          })}

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
            const sstColor = getSSTColor(spot.sst);

            return (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lon]}
                icon={createMarkerIcon(spot.rank, isPrimary, isSecondary)}
                eventHandlers={{
                  click: () => onSelectHotspot?.(index)
                }}
              >
                {/* Permanent SST label */}
                {showSSTLabels && (
                  <Tooltip
                    permanent
                    direction="top"
                    offset={[0, -20]}
                    className="sst-label"
                  >
                    <div
                      style={{
                        backgroundColor: sstColor,
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {spot.sst.toFixed(1)}°F
                    </div>
                  </Tooltip>
                )}

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
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-gray-500">SST</p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getSSTColor(spot.sst || 70) }}
                          ></div>
                          <p className="font-semibold" style={{ color: getSSTColor(spot.sst || 70) }}>
                            {spot.sst?.toFixed(1)}°F
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Known fishing structures */}
          {showStructures && KNOWN_STRUCTURES.map((structure) => (
            <Marker
              key={structure.name}
              position={[structure.lat, structure.lon]}
              icon={createStructureIcon(structure.type)}
            >
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-bold text-purple-700 mb-1">{structure.name}</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-semibold capitalize">{structure.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Depth:</span>
                      <span className="font-semibold">{structure.depth}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      Known fishing structure - Check for nearby SST breaks
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Canyon name labels */}
          {showBathymetry && CANYON_LABELS.map((canyon) => (
            <Marker
              key={`label-${canyon.name}`}
              position={[canyon.lat, canyon.lon]}
              icon={createCanyonLabel(canyon.name)}
              interactive={false}
            />
          ))}
        </MapContainer>

        {/* Layer Controls */}
        <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur rounded-lg p-3 text-xs z-[1000] space-y-2 max-w-[200px]">
          <p className="font-semibold mb-2 text-white">Map Layers</p>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showDistanceRings}
              onChange={(e) => setShowDistanceRings(e.target.checked)}
              className="rounded"
            />
            <span>Distance Rings</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showStructures}
              onChange={(e) => setShowStructures(e.target.checked)}
              className="rounded"
            />
            <span>Known Structure</span>
          </label>

          <div className="border-t border-slate-700 pt-2 mt-2">
            <p className="font-semibold mb-2 text-white text-xs">Bathymetry</p>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showBathymetry}
                onChange={(e) => setShowBathymetry(e.target.checked)}
                className="rounded"
              />
              <span>High-Res Chart</span>
            </label>
            {showBathymetry && (
              <div className="mt-2 pl-6">
                <label className="text-slate-400 text-xs">
                  Opacity: {Math.round(bathyOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={bathyOpacity * 100}
                  onChange={(e) => setBathyOpacity(parseInt(e.target.value) / 100)}
                  className="w-full mt-1"
                />
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 pt-2 mt-2">
            <p className="font-semibold mb-2 text-white text-xs">SST Display</p>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showSSTCircles}
                onChange={(e) => setShowSSTCircles(e.target.checked)}
                className="rounded"
              />
              <span>SST Circles</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showSSTLabels}
                onChange={(e) => setShowSSTLabels(e.target.checked)}
                className="rounded"
              />
              <span>Temp Labels</span>
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur rounded-lg p-3 text-xs z-[1000] max-w-[200px]">
          <p className="font-semibold mb-2 text-white">Hotspots</p>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-slate-300">Primary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-slate-300">Secondary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="text-slate-300">Others</span>
            </div>
          </div>

          <p className="font-semibold mb-2 text-white border-t border-slate-700 pt-2">Structures</p>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-slate-300">Canyon</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-cyan-500 rounded"></div>
              <span className="text-slate-300">Bank</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-slate-300">Lump/Ridge</span>
            </div>
          </div>

          <p className="font-semibold mb-2 text-white border-t border-slate-700 pt-2">SST Scale</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-red-600"></div>
              <span className="text-slate-300">78°F+ Hot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-orange-500"></div>
              <span className="text-slate-300">75-78°F Warm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-yellow-400"></div>
              <span className="text-slate-300">72-75°F Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-green-500"></div>
              <span className="text-slate-300">68-72°F Cool</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-blue-600"></div>
              <span className="text-slate-300">&lt;68°F Cold</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
