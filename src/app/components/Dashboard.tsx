import { Compass, Wind, Thermometer, Droplets, Eye, Anchor } from 'lucide-react';

interface Preferences {
  vesselSpeed: string;
  fuelBurnRate: string;
  launchLocation: string;
  preferredSpecies: string[];
  seaSurfaceTemp: { min: string; max: string };
}

interface DashboardProps {
  preferences: Preferences;
}

export default function Dashboard({ preferences }: DashboardProps) {
  const waterTemp = 72;
  const isInPreferredRange =
    preferences.seaSurfaceTemp.min &&
    preferences.seaSurfaceTemp.max &&
    waterTemp >= parseInt(preferences.seaSurfaceTemp.min) &&
    waterTemp <= parseInt(preferences.seaSurfaceTemp.max);

  const conditions = [
    { label: 'Wind Speed', value: '12 kts', icon: Wind, color: 'text-blue-400' },
    {
      label: 'Water Temp',
      value: `${waterTemp}°F${isInPreferredRange ? ' ✓' : ''}`,
      icon: Thermometer,
      color: isInPreferredRange ? 'text-green-400' : 'text-orange-400'
    },
    { label: 'Wave Height', value: '3-5 ft', icon: Droplets, color: 'text-cyan-400' },
    { label: 'Visibility', value: '10 mi', icon: Eye, color: 'text-purple-400' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Current Location */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Compass className="text-blue-400" size={24} />
          <div>
            <p className="text-sm text-slate-400">Current Position</p>
            <p className="font-semibold">26°24'N 80°03'W</p>
            {preferences.launchLocation && (
              <p className="text-xs text-slate-500 mt-1">
                From {preferences.launchLocation}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-medium">
            Mark Spot
          </button>
          <button className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-medium">
            Share Location
          </button>
        </div>
        {preferences.vesselSpeed && (
          <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-slate-400">
            Vessel speed: <span className="text-white font-semibold">{preferences.vesselSpeed} kts</span>
          </div>
        )}
      </div>

      {/* Marine Conditions */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Marine Conditions</h2>
        <div className="grid grid-cols-2 gap-3">
          {conditions.map((condition) => {
            const Icon = condition.icon;
            return (
              <div key={condition.label} className="bg-slate-800 rounded-xl p-4">
                <Icon className={condition.color} size={20} />
                <p className="text-2xl font-semibold mt-2">{condition.value}</p>
                <p className="text-sm text-slate-400">{condition.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Tide */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Next High Tide</h3>
          <Anchor size={20} />
        </div>
        <p className="text-3xl font-bold">2:45 PM</p>
        <p className="text-sm text-blue-200">in 1 hour 23 minutes</p>
      </div>

      {/* Today's Catches */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Today's Catches</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span>Mahi-Mahi</span>
            <span className="text-blue-400 font-semibold">2 fish</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span>Tuna</span>
            <span className="text-blue-400 font-semibold">1 fish</span>
          </div>
          <button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-medium">
            Log New Catch
          </button>
        </div>
      </div>
    </div>
  );
}
