import { useState } from 'react';
import { Anchor, Clock, Navigation2, AlertTriangle, CheckCircle, Radio, MapPin } from 'lucide-react';

interface FloatPlanProps {
  hotspots: any[];
  vesselSpeed: number;
  launchLocation: string;
  fuelBurnRate?: number;
  fuelCapacity?: number;
}

export default function FloatPlan({ hotspots, vesselSpeed, launchLocation, fuelBurnRate = 0, fuelCapacity = 0 }: FloatPlanProps) {
  const [weatherImpact, setWeatherImpact] = useState<'good' | 'moderate' | 'rough'>('good');
  const [departureTime, setDepartureTime] = useState('06:00');

  // Ocean City, MD Inlet coordinates
  const homePort = {
    name: 'Ocean City Inlet',
    coordinates: '38°19\'48"N 75°05\'24"W',
    lat: 38.33,
    lon: -75.09
  };

  // Use dynamic hotspots from predictions
  const primarySpot = hotspots[0] ? {
    name: hotspots[0].name,
    coordinates: hotspots[0].coordinates,
    distance: hotspots[0].distance,
    depth: hotspots[0].conditions?.depth || 'Variable',
    features: hotspots[0].reasons?.slice(0, 3) || ['Dynamic hotspot', 'Real-time SST data'],
    targetSpecies: hotspots[0].species || []
  } : null;

  const secondarySpot = hotspots[1] ? {
    name: hotspots[1].name,
    coordinates: hotspots[1].coordinates,
    distance: hotspots[1].distance,
    depth: hotspots[1].conditions?.depth || 'Variable',
    features: hotspots[1].reasons?.slice(0, 3) || ['Dynamic hotspot', 'Real-time SST data'],
    targetSpecies: hotspots[1].species || []
  } : null;

  // Speed adjustments based on weather
  const speedMultipliers = {
    good: 1.0,
    moderate: 0.75,
    rough: 0.6
  };

  const effectiveSpeed = vesselSpeed * speedMultipliers[weatherImpact];

  // Helper: Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (coord1: string, coord2: string): number => {
    const parseCoord = (coord: string) => {
      // Parse DMS format like "38°19'N 75°05'W"
      const latMatch = coord.match(/(\d+)°(\d+)'([NS])/);
      const lonMatch = coord.match(/(\d+)°(\d+)'([EW])/);

      if (!latMatch || !lonMatch) return null;

      const lat = parseInt(latMatch[1]) + parseInt(latMatch[2]) / 60;
      const lon = parseInt(lonMatch[1]) + parseInt(lonMatch[2]) / 60;

      return {
        lat: latMatch[3] === 'S' ? -lat : lat,
        lon: lonMatch[3] === 'W' ? -lon : lon
      };
    };

    const c1 = parseCoord(coord1);
    const c2 = parseCoord(coord2);

    if (!c1 || !c2) return 0;

    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = (c2.lat - c1.lat) * (Math.PI / 180);
    const dLon = (c2.lon - c1.lon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(c1.lat * (Math.PI / 180)) * Math.cos(c2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate times
  const primaryTravelTime = primarySpot ? (primarySpot.distance / effectiveSpeed) * 60 : 0; // minutes from inlet
  const secondaryTravelTime = secondarySpot ? (secondarySpot.distance / effectiveSpeed) * 60 : 0; // minutes from inlet

  // Calculate distance FROM PRIMARY TO SECONDARY (not from inlet!)
  const primaryToSecondaryDistance = primarySpot && secondarySpot
    ? calculateDistance(primarySpot.coordinates, secondarySpot.coordinates)
    : 0;
  const primaryToSecondaryTime = (primaryToSecondaryDistance / effectiveSpeed) * 60;

  const calculateTime = (startTime: string, minutesToAdd: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = Math.floor(totalMinutes % 60);
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  };

  // Calculate fuel consumption
  const totalTripTime = primaryTravelTime + 300 + primaryTravelTime; // out + fishing + return (minutes)
  const totalTripHours = totalTripTime / 60;
  const hasFuelData = fuelBurnRate > 0;
  const estimatedFuel = hasFuelData ? (totalTripHours * fuelBurnRate).toFixed(1) : '0';
  const fuelWithReserve = hasFuelData ? (parseFloat(estimatedFuel) * 1.3).toFixed(1) : '0'; // 30% reserve

  const timeline = {
    departure: departureTime,
    decisionPoint: calculateTime(departureTime, primaryTravelTime * 0.5),
    primaryArrival: calculateTime(departureTime, primaryTravelTime),
    fishingTime: calculateTime(departureTime, primaryTravelTime + 180), // 3 hours fishing
    secondaryDecision: calculateTime(departureTime, primaryTravelTime + 120), // 2 hours in
    secondaryArrival: calculateTime(departureTime, primaryTravelTime + primaryToSecondaryTime),
    returnStart: calculateTime(departureTime, primaryTravelTime + 300), // 5 hours total
    returnHome: calculateTime(departureTime, primaryTravelTime + 300 + primaryTravelTime)
  };

  // Don't show float plan if no hotspots available
  if (!primarySpot && !secondarySpot) {
    return (
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <Anchor className="text-blue-400" size={24} />
          <h2 className="font-semibold text-lg">Float Plan</h2>
        </div>
        <p className="text-sm text-slate-400">No fishing spots available. Waiting for SST grid scan...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Anchor className="text-blue-400" size={24} />
          <div>
            <h2 className="font-semibold text-lg">Float Plan</h2>
            <p className="text-xs text-slate-400">Ocean City, MD Offshore - Dynamic Hotspots</p>
          </div>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
          Share Plan
        </button>
      </div>

      {/* Departure Time & Weather Selector */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Departure Time</label>
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Sea Conditions</label>
          <select
            value={weatherImpact}
            onChange={(e) => setWeatherImpact(e.target.value as any)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="good">Good (1-2 ft)</option>
            <option value="moderate">Moderate (3-4 ft)</option>
            <option value="rough">Rough (5-6 ft)</option>
          </select>
        </div>
      </div>

      {/* Speed & Fuel Impact */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Cruise Speed</span>
              <span className="font-semibold">{vesselSpeed} kts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Effective Speed</span>
              <span className={`font-semibold ${weatherImpact === 'good' ? 'text-green-400' : weatherImpact === 'moderate' ? 'text-yellow-400' : 'text-orange-400'}`}>
                {effectiveSpeed.toFixed(1)} kts
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Fuel Burn</span>
              <span className="font-semibold">{hasFuelData ? `${fuelBurnRate} gph` : 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Est. Fuel</span>
              <span className="font-semibold text-orange-400">{hasFuelData ? `${estimatedFuel} gal` : 'N/A'}</span>
            </div>
          </div>
        </div>
        {hasFuelData ? (
          <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-sm">
            <span className="text-slate-400">With 30% Reserve:</span>
            <span className="font-bold text-orange-300">{fuelWithReserve} gal needed</span>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500 text-center">
            Configure fuel burn rate in Settings to see fuel estimates
          </div>
        )}
      </div>

      {/* Home Port */}
      <div className="bg-blue-900/30 border-l-4 border-blue-500 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Radio size={16} className="text-blue-400" />
          <h3 className="font-semibold">Departure Point</h3>
        </div>
        <p className="text-sm font-medium">{homePort.name}</p>
        <p className="text-xs text-slate-400">{homePort.coordinates}</p>
      </div>

      {/* Primary Destination */}
      <div className="bg-green-900/30 border-l-4 border-green-500 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Primary Spot
            </h3>
            <p className="text-sm font-medium mt-1">{primarySpot.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Distance</p>
            <p className="font-bold text-green-400">{primarySpot.distance} mi</p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Coordinates:</span>
            <span className="font-mono">{primarySpot.coordinates}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Depth:</span>
            <span className="font-medium">{primarySpot.depth}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Travel Time:</span>
            <span className="font-medium">{Math.round(primaryTravelTime)} min</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">ETA:</span>
            <span className="font-bold text-green-400">{timeline.primaryArrival}</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2 mb-2">
          <p className="text-xs text-slate-400 mb-1">Features:</p>
          <div className="flex flex-wrap gap-1">
            {primarySpot.features.map((feature) => (
              <span key={feature} className="text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded">
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Target: {primarySpot.targetSpecies.join(', ')}
        </div>
      </div>

      {/* Decision Point */}
      <div className="bg-yellow-900/30 border-l-4 border-yellow-500 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          <h3 className="font-semibold text-yellow-400">Decision Point #1</h3>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Halfway to Primary</span>
            <span className="font-bold text-yellow-400">{timeline.decisionPoint}</span>
          </div>
          <p className="text-xs text-yellow-200 mt-2">
            <strong>Evaluate:</strong> Weather deteriorating? Mechanical issues? Abort to secondary spot or return home.
          </p>
        </div>
      </div>

      {/* Secondary Destination */}
      {secondarySpot && (
        <div className="bg-orange-900/30 border-l-4 border-orange-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Secondary Spot (Backup)
              </h3>
              <p className="text-sm font-medium mt-1">{secondarySpot.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">From Primary</p>
            <p className="font-bold text-orange-400">{primaryToSecondaryDistance.toFixed(1)} nm</p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Coordinates:</span>
            <span className="font-mono">{secondarySpot.coordinates}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Depth:</span>
            <span className="font-medium">{secondarySpot.depth}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">From Primary:</span>
            <span className="font-medium">{primaryToSecondaryDistance.toFixed(1)} nm / {Math.round(primaryToSecondaryTime)} min</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">From Inlet:</span>
            <span className="font-medium text-slate-500">{secondarySpot.distance} nm / {Math.round(secondaryTravelTime)} min</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2 mb-2">
          <p className="text-xs text-slate-400 mb-1">Features:</p>
          <div className="flex flex-wrap gap-1">
            {secondarySpot.features.map((feature) => (
              <span key={feature} className="text-xs bg-orange-600/30 text-orange-300 px-2 py-0.5 rounded">
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Target: {secondarySpot.targetSpecies.join(', ')}
        </div>
      </div>
      )}

      {/* Decision Point #2 */}
      <div className="bg-yellow-900/30 border-l-4 border-yellow-500 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          <h3 className="font-semibold text-yellow-400">Decision Point #2</h3>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">2 Hours at Primary</span>
            <span className="font-bold text-yellow-400">{timeline.secondaryDecision}</span>
          </div>
          <p className="text-xs text-yellow-200 mt-2">
            <strong>Evaluate:</strong> No action at primary? Weather window closing? Move to secondary spot ({Math.round(primaryToSecondaryTime)} min away) or head home.
          </p>
        </div>
      </div>

      {/* Timeline Summary */}
      <div className="bg-slate-900 rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock size={18} className="text-blue-400" />
          Complete Timeline
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle size={14} className="text-green-400" />
            <span className="text-slate-400 w-32">Depart Home:</span>
            <span className="font-semibold">{timeline.departure}</span>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="text-yellow-400" />
            <span className="text-slate-400 w-32">Decision #1:</span>
            <span className="font-semibold">{timeline.decisionPoint}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={14} className="text-green-400" />
            <span className="text-slate-400 w-32">Primary Arrival:</span>
            <span className="font-semibold">{timeline.primaryArrival}</span>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="text-yellow-400" />
            <span className="text-slate-400 w-32">Decision #2:</span>
            <span className="font-semibold">{timeline.secondaryDecision}</span>
          </div>
          <div className="flex items-center gap-3">
            <Navigation2 size={14} className="text-blue-400" />
            <span className="text-slate-400 w-32">Return Start:</span>
            <span className="font-semibold">{timeline.returnStart}</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle size={14} className="text-blue-400" />
            <span className="text-slate-400 w-32">Home ETA:</span>
            <span className="font-semibold">{timeline.returnHome}</span>
          </div>
        </div>
      </div>

      {/* Safety Notes */}
      <div className="bg-red-900/30 border border-red-600 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Radio size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-400 mb-1">Safety Checklist</p>
            <ul className="text-xs text-red-200 space-y-1">
              <li>• File this plan with harbormaster or trusted contact</li>
              <li>• Monitor VHF Ch 16, check in at each decision point</li>
              <li>• Abort if seas exceed forecast by 2+ feet</li>
              <li>• Maintain 30% fuel reserve for return journey</li>
              <li>• Report "no comms" time: {timeline.returnHome} + 2 hours</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
          <Navigation2 size={18} />
          Start Navigation
        </button>
        <button className="bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
          <Radio size={18} />
          Share via VHF
        </button>
      </div>
    </div>
  );
}
