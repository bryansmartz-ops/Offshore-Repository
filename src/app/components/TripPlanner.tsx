import { useState } from 'react';
import { Route, Clock, Fuel, MapPin } from 'lucide-react';

interface Hotspot {
  id: number;
  name: string;
  coordinates: string;
  distance: number;
  travelTime: number;
  confidence: number;
  species: string[];
}

interface TripPlannerProps {
  hotspots: Hotspot[];
  vesselSpeed: number;
  fuelBurnRate: number;
  launchLocation: string;
}

export default function TripPlanner({ hotspots, vesselSpeed, fuelBurnRate, launchLocation }: TripPlannerProps) {
  const [selectedSpots, setSelectedSpots] = useState<number[]>([]);

  const toggleSpot = (id: number) => {
    setSelectedSpots((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedHotspots = hotspots.filter((h) => selectedSpots.includes(h.id));
  const totalDistance = selectedHotspots.reduce((sum, h) => sum + h.distance, 0);
  const totalTime = selectedHotspots.reduce((sum, h) => sum + h.travelTime, 0);

  // Calculate fuel based on time, not distance (more accurate)
  const totalHours = (totalTime * 2) / 60; // Round trip in hours
  const estimatedFuel = (totalHours * fuelBurnRate).toFixed(1);
  const fuelWithReserve = (parseFloat(estimatedFuel) * 1.3).toFixed(1); // 30% reserve

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Route className="text-blue-400" size={24} />
        <h2 className="font-semibold text-lg">Trip Planner</h2>
      </div>

      {/* Spot Selection */}
      <div className="space-y-2 mb-4">
        <p className="text-sm text-slate-400 mb-2">Select spots to visit</p>
        {hotspots.map((hotspot) => (
          <label
            key={hotspot.id}
            className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600"
          >
            <input
              type="checkbox"
              checked={selectedSpots.includes(hotspot.id)}
              onChange={() => toggleSpot(hotspot.id)}
              className="w-5 h-5 accent-blue-600"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">{hotspot.name}</p>
              <p className="text-xs text-slate-400">
                {hotspot.distance} mi • {hotspot.travelTime} min
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-400">
              {hotspot.confidence}%
            </span>
          </label>
        ))}
      </div>

      {/* Trip Summary */}
      {selectedSpots.length > 0 && (
        <div className="border-t border-slate-700 pt-4 space-y-3">
          <h3 className="font-semibold text-sm">Trip Summary</h3>

          {launchLocation && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-slate-400" />
              <span className="text-slate-400">From:</span>
              <span className="font-medium">{launchLocation}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Distance</p>
              <p className="text-lg font-bold text-blue-400">{totalDistance.toFixed(1)} mi</p>
              <p className="text-xs text-slate-500">One way</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <Clock size={16} className="mx-auto mb-1 text-slate-400" />
              <p className="text-lg font-bold text-green-400">{Math.round(totalTime)} min</p>
              <p className="text-xs text-slate-500">Travel time</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <Fuel size={16} className="mx-auto mb-1 text-slate-400" />
              <p className="text-lg font-bold text-orange-400">{estimatedFuel} gal</p>
              <p className="text-xs text-slate-500">+{fuelWithReserve} w/reserve</p>
            </div>
          </div>

          {/* Optimized Route */}
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3">
            <p className="text-sm font-semibold mb-2">Suggested Route</p>
            <ol className="space-y-1">
              {selectedHotspots
                .sort((a, b) => a.distance - b.distance)
                .map((spot, idx) => (
                  <li key={spot.id} className="text-sm flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span>{spot.name}</span>
                    <span className="text-xs text-slate-400">
                      ({spot.distance} mi)
                    </span>
                  </li>
                ))}
            </ol>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold">
            Start Navigation
          </button>
        </div>
      )}

      {selectedSpots.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          Select one or more hotspots to plan your trip
        </p>
      )}
    </div>
  );
}
