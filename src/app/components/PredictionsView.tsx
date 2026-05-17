import { useState, useEffect } from 'react';
import { TrendingUp, MapPin, Fish, Zap, Clock, Navigation2, AlertTriangle, Flame, Map } from 'lucide-react';
import DataSourceCard from './DataSourceCard';
import HotspotCard from './HotspotCard';
import FloatPlan from './FloatPlan';
import TideCard from './TideCard';
import MoonSolunarCard from './MoonSolunarCard';
import PressureCard from './PressureCard';
import HotspotsMap from './HotspotsMap';
import { getOceanConditions, parseCoordinates } from '../../utils/oceanData';
import { getSolunarPeriods } from '../../utils/solunar';
import { getSSTGridHotspots, type SSTHotspot } from '../../utils/sstGrid';
import { latLonToLoran, formatLoran } from '../../utils/loran';

interface Preferences {
  vesselSpeed: string;
  fuelBurnRate: string;
  fuelCapacity: string;
  launchLocation: string;
  preferredSpecies: string[];
  seaSurfaceTemp: { min: string; max: string };
}

interface PredictionsViewProps {
  preferences: Preferences;
}

export default function PredictionsView({ preferences }: PredictionsViewProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [oceanConditions, setOceanConditions] = useState<any>(null);
  const [inletConditions, setInletConditions] = useState<any>(null);
  const [dataFreshness, setDataFreshness] = useState<string>('Loading...');
  const [dynamicHotspots, setDynamicHotspots] = useState<SSTHotspot[]>([]);
  const [gridStats, setGridStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // User-selected primary and secondary spots for Float Plan
  const [selectedPrimary, setSelectedPrimary] = useState<number | null>(null); // hotspot index
  const [selectedSecondary, setSelectedSecondary] = useState<number | null>(null); // hotspot index

  // Map view toggle
  const [showMap, setShowMap] = useState(false);

  // Calculate solunar data (moon phase and feeding periods)
  const solunarData = getSolunarPeriods(new Date(), 38.328, -75.089); // Ocean City coordinates

  // Fetch general ocean data on mount
  useEffect(() => {
    fetchGeneralOceanData();
  }, []);

  const fetchGeneralOceanData = async () => {
    try {
      // Fetch conditions for Ocean City Inlet (departure point)
      const inletCoords = parseCoordinates('38°19\'N 75°05\'W');
      if (inletCoords) {
        const inletCond = await getOceanConditions(inletCoords.lat, inletCoords.lon);
        if (inletCond) {
          setInletConditions(inletCond);
        }
      }

      // Fetch conditions for offshore fishing grounds
      const offshoreCoords = parseCoordinates('37°52\'N 74°06\'W');
      if (offshoreCoords) {
        const conditions = await getOceanConditions(offshoreCoords.lat, offshoreCoords.lon);
        if (conditions) {
          setOceanConditions(conditions);
          setDataFreshness(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        } else {
          setOceanConditions(null);
          setDataFreshness('Offline mode');
        }
      }
    } catch (error) {
      console.error('Failed to fetch ocean data:', error);
      setOceanConditions(null);
      setInletConditions(null);
      setDataFreshness('Offline mode');
    }
  };

  // Fetch SST grid hotspots when species preference changes
  useEffect(() => {
    const fetchHotspots = async () => {
      setLoading(true);
      setAnalyzing(true);

      // Use first preferred species for grid scan
      const targetSpecies = preferences.preferredSpecies[0] || 'Mahi-Mahi';

      console.log(`🔥 Scanning SST grid for ${targetSpecies} hotspots...`);

      const result = await getSSTGridHotspots(targetSpecies);

      if (result && result.success) {
        setDynamicHotspots(result.data.hotspots);
        setGridStats({
          gridPoints: result.data.gridPoints,
          breaksFound: result.data.breaksFound,
          warmZones: result.data.warmZones,
          targetTempRange: result.data.targetTempRange
        });
        console.log(`✅ Found ${result.data.hotspots.length} dynamic hotspots`);
      } else {
        console.error('❌ SST grid scan failed');
        setDynamicHotspots([]);
      }

      setLoading(false);
      setAnalyzing(false);
    };

    fetchHotspots();
  }, [preferences.preferredSpecies.join(',')]);

  const vesselSpeed = parseInt(preferences.vesselSpeed) || 25;
  const fuelCapacity = parseFloat(preferences.fuelCapacity) || 0;
  const fuelBurnRate = parseFloat(preferences.fuelBurnRate) || 0;

  // Calculate max safe range based on fuel
  const hasFuelData = fuelCapacity > 0 && fuelBurnRate > 0;
  const usableFuel = fuelCapacity * 0.7; // 30% reserve
  const maxFuelHours = hasFuelData ? usableFuel / fuelBurnRate : 0;
  const maxFuelRange = hasFuelData ? (maxFuelHours * vesselSpeed) / 2 : 0; // divide by 2 for round trip
  const maxRange = hasFuelData ? maxFuelRange.toFixed(0) : (vesselSpeed * 3).toFixed(0);

  // Ocean City inlet coordinates
  const oceanCityLat = 38.328;
  const oceanCityLon = -75.089;

  // Calculate distance from Ocean City to each hotspot
  const hotspotsWithDistance = dynamicHotspots.map(spot => {
    const distance = calculateDistance(oceanCityLat, oceanCityLon, spot.lat, spot.lon);
    const travelTime = Math.round((distance / vesselSpeed) * 60);

    return {
      ...spot,
      distance: Math.round(distance),
      travelTime,
      coordinates: `${formatCoordinate(spot.lat, 'lat')} ${formatCoordinate(spot.lon, 'lon')}`
    };
  });

  // Filter by distance (100nm max from Ocean City Inlet - tournament limit)
  const MAX_DISTANCE_NM = 100;
  const hotspotsWithinDistance = hotspotsWithDistance.filter(spot => spot.distance <= MAX_DISTANCE_NM);

  // Filter by fuel range if specified
  const hotspotsInRange = hasFuelData
    ? hotspotsWithinDistance.filter(spot => {
        const roundTripDistance = spot.distance * 2;
        const roundTripTime = roundTripDistance / vesselSpeed;
        const fuelNeeded = roundTripTime * fuelBurnRate;
        return fuelNeeded <= usableFuel;
      })
    : hotspotsWithinDistance;

  // Track how many were filtered out by distance
  const distanceFiltered = hotspotsWithDistance.length - hotspotsWithinDistance.length;

  // Auto-select top 2 spots on initial load
  useEffect(() => {
    if (hotspotsInRange.length > 0 && selectedPrimary === null) {
      setSelectedPrimary(0); // Top spot
      if (hotspotsInRange.length > 1) {
        setSelectedSecondary(1); // Second spot
      }
    }
  }, [hotspotsInRange.length]);

  // Handler to set/clear primary/secondary selections
  const handleSetPrimary = (index: number) => {
    if (selectedPrimary === index) {
      // Clicking same primary clears it
      setSelectedPrimary(null);
    } else {
      setSelectedPrimary(index);
      // If this was the secondary, clear secondary
      if (selectedSecondary === index) {
        setSelectedSecondary(null);
      }
    }
  };

  const handleSetSecondary = (index: number) => {
    if (selectedSecondary === index) {
      // Clicking same secondary clears it
      setSelectedSecondary(null);
    } else {
      setSelectedSecondary(index);
      // If this was the primary, clear primary
      if (selectedPrimary === index) {
        setSelectedPrimary(null);
      }
    }
  };

  // Real NOAA data sources with live status
  const dataSourceStatus = [
    {
      name: 'NOAA SST Grid Scanner',
      status: gridStats ? 'active' : 'loading',
      lastUpdate: dataFreshness,
      quality: gridStats ? 98 : 0
    },
    {
      name: 'Temperature Break Detection',
      status: gridStats && gridStats.breaksFound > 0 ? 'active' : 'standby',
      lastUpdate: dataFreshness,
      quality: gridStats && gridStats.breaksFound > 0 ? 95 : 0
    },
    {
      name: 'NOAA Wave & Wind Data',
      status: oceanConditions?.waveHeight !== undefined ? 'active' : 'standby',
      lastUpdate: dataFreshness,
      quality: oceanConditions?.waveHeight !== undefined ? 92 : 0
    },
    {
      name: 'Tide & Current Data',
      status: oceanConditions?.tides ? 'active' : 'standby',
      lastUpdate: dataFreshness,
      quality: oceanConditions?.tides ? 90 : 0
    },
  ];

  // Convert hotspots to display format
  const displayHotspots = hotspotsInRange.slice(0, 10).map((spot, index) => {
    const loranCoords = latLonToLoran(spot.lat, spot.lon);
    return {
      id: index,
      name: spot.name,
      coordinates: spot.coordinates,
      loranCoordinates: formatLoran(loranCoords),
      distance: spot.distance,
      travelTime: spot.travelTime,
      confidence: spot.confidence,
      species: preferences.preferredSpecies, // All hotspots match target species
      reasons: spot.reasons,
      sst: spot.sst, // Include numeric SST for map overlay
      lat: spot.lat, // Include coords for map
      lon: spot.lon,
      conditions: {
        sst: `${spot.sst}°F`,
        current: oceanConditions?.currentSpeed ? `${oceanConditions.currentSpeed} kts ${oceanConditions.currentDirection}` : '1.5 kts SW',
        depth: 'Variable',
        chlorophyll: oceanConditions?.chlorophyll ? `${oceanConditions.chlorophyll.toFixed(1)} mg/m³` : 'Medium'
      },
      sstBreak: spot.break ? {
        gradient: spot.break.gradient,
        coldSide: spot.break.coldSide,
        warmSide: spot.break.warmSide,
        strength: spot.break.strength,
        description: `${spot.break.gradient.toFixed(1)}°F ${spot.break.strength} break`
      } : null
    };
  });

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 p-6 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">AI Fishing Predictions</h2>
            <p className="text-sm text-slate-300">Real-time SST grid analysis • Temperature break detection</p>
          </div>
        </div>

        {gridStats && (
          <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-slate-400">Grid Points</p>
                <p className="font-bold text-blue-400">{gridStats.gridPoints}</p>
              </div>
              <div>
                <p className="text-slate-400">Breaks Found</p>
                <p className="font-bold text-orange-400">{gridStats.breaksFound}</p>
              </div>
              <div>
                <p className="text-slate-400">Within 100nm</p>
                <p className="font-bold text-green-400">{hotspotsWithinDistance.length}</p>
              </div>
            </div>
            {gridStats.targetTempRange && (
              <p className="text-xs text-slate-400 text-center mt-2">
                Target: {preferences.preferredSpecies[0]} • {gridStats.targetTempRange} • ≤100nm limit
              </p>
            )}
          </div>
        )}

        {/* Analyzing Animation */}
        {analyzing && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
            <span>Scanning SST grid for temperature breaks...</span>
          </div>
        )}
      </div>

      {/* Data Sources */}
      <div className="px-4 mb-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" />
          Live Data Sources
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {dataSourceStatus.map((source) => (
            <DataSourceCard key={source.name} {...source} />
          ))}
        </div>
      </div>

      {/* Tactical Map - Prominent Position */}
      {displayHotspots.length > 0 && (
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg"
          >
            <Map size={24} />
            {showMap ? 'Hide Tactical Map' : '🗺️ Tactical Map - All Hotspots'}
          </button>

          {showMap && (
            <div className="mt-4">
              <HotspotsMap
                hotspots={displayHotspots}
                selectedPrimary={selectedPrimary}
                selectedSecondary={selectedSecondary}
                onSelectHotspot={(index) => {
                  if (selectedPrimary === index) {
                    handleSetPrimary(index);
                  } else if (selectedSecondary === index) {
                    handleSetSecondary(index);
                  } else {
                    handleSetPrimary(index);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Top Hotspots */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            Top {displayHotspots.length} Dynamic Hotspots
          </h3>
          <div className="text-right text-xs text-slate-400">
            <div>≤100nm from inlet</div>
            {hasFuelData && <div>Fuel range: {maxRange}nm</div>}
          </div>
        </div>

        {/* Distance filter notice */}
        {distanceFiltered > 0 && (
          <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-2 mb-3 text-xs text-blue-300">
            ℹ️ {distanceFiltered} hotspot{distanceFiltered > 1 ? 's' : ''} beyond 100nm tournament limit (not shown)
          </div>
        )}

        {loading ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-3"></div>
            <p className="text-slate-400">Scanning ocean for temperature breaks...</p>
          </div>
        ) : displayHotspots.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <AlertTriangle size={32} className="text-yellow-500 mx-auto mb-2" />
            <p className="text-slate-400">No hotspots found in current conditions</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your target species or check back later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayHotspots.map((hotspot, index) => (
              <HotspotCard
                key={hotspot.id}
                hotspot={hotspot}
                rank={index + 1}
                vesselSpeed={vesselSpeed}
                preferredSpecies={preferences.preferredSpecies}
                fuelCapacity={fuelCapacity}
                fuelBurnRate={fuelBurnRate}
                isPrimary={selectedPrimary === index}
                isSecondary={selectedSecondary === index}
                onSetPrimary={() => handleSetPrimary(index)}
                onSetSecondary={() => handleSetSecondary(index)}
                onViewOnMap={(selectedPrimary === index || selectedSecondary === index) ? () => setShowMap(true) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Environmental Cards */}
      <div className="px-4 space-y-3">
        <MoonSolunarCard solunarData={solunarData} />
        {oceanConditions?.tides && <TideCard tides={oceanConditions.tides} />}
        {oceanConditions?.pressure && (
          <PressureCard
            pressure={oceanConditions.pressure}
            trend={oceanConditions.pressureTrend}
          />
        )}
        <FloatPlan
          hotspots={[
            selectedPrimary !== null ? displayHotspots[selectedPrimary] : null,
            selectedSecondary !== null ? displayHotspots[selectedSecondary] : null
          ].filter(Boolean)}
          vesselSpeed={vesselSpeed}
          launchLocation={preferences.launchLocation}
          fuelBurnRate={fuelBurnRate}
          fuelCapacity={fuelCapacity}
          inletConditions={inletConditions}
          oceanConditions={oceanConditions}
          solunarData={solunarData}
        />
      </div>
    </div>
  );
}

// Helper: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Helper: Format decimal coordinates to DMS format
function formatCoordinate(decimal: number, type: 'lat' | 'lon'): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const direction = type === 'lat'
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  return `${degrees}°${minutes.toString().padStart(2, '0')}'${direction}`;
}
