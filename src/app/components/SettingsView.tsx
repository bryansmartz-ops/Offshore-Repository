import { useState, useEffect } from 'react';
import { Ship, MapPin, Fish, Thermometer, Save, X, Fuel } from 'lucide-react';
import InstallButton from './InstallButton';
import PWADebugger from './PWADebugger';
import UserAccount from './UserAccount';

interface Preferences {
  vesselSpeed: string;
  fuelBurnRate: string;
  fuelCapacity: string;
  launchLocation: string;
  preferredSpecies: string[];
  seaSurfaceTemp: { min: string; max: string };
}

interface SettingsViewProps {
  preferences: Preferences;
  onSave: (preferences: Preferences) => void;
  user: { email: string; name: string } | null;
  isSyncing: boolean;
  onShowAuth: () => void;
  onSignOut: () => void;
}

export default function SettingsView({ preferences, onSave, user, isSyncing, onShowAuth, onSignOut }: SettingsViewProps) {
  const [formData, setFormData] = useState(preferences);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Detect if app is running in standalone mode (installed as PWA)
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();
  }, []);

  // Auto-save changes for real-time fuel estimates
  useEffect(() => {
    onSave(formData);
  }, [formData.vesselSpeed, formData.fuelBurnRate, formData.fuelCapacity]);

  const popularSpecies = [
    'Mahi-Mahi',
    'Tuna',
    'Wahoo',
    'Sailfish',
    'Marlin',
    'Grouper',
    'Snapper',
    'Kingfish',
    'Swordfish',
    'Amberjack',
  ];

  const handleSave = () => {
    onSave(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const toggleSpecies = (species: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredSpecies: prev.preferredSpecies.includes(species)
        ? prev.preferredSpecies.filter((s) => s !== species)
        : [...prev.preferredSpecies, species],
    }));
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-600 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-green-600 font-bold text-lg">✓</span>
          </div>
          <span className="font-semibold">Settings saved successfully!</span>
        </div>
      )}

      {/* User Account Section */}
      <UserAccount
        user={user}
        isSyncing={isSyncing}
        onSignIn={onShowAuth}
        onSignOut={onSignOut}
      />

      {/* PWA Debug Status - Only show when not installed */}
      {!isStandalone && <PWADebugger />}

      {/* Install PWA - Only show when not installed */}
      {!isStandalone && <InstallButton />}

      {/* Vessel Speed */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Ship className="text-blue-400" size={24} />
          <h2 className="font-semibold text-lg">Vessel Performance</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Average cruising speed (knots)
            </label>
            <input
              type="number"
              value={formData.vesselSpeed}
              onChange={(e) =>
                setFormData({ ...formData, vesselSpeed: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg"
              placeholder="25"
              step="0.5"
            />
            <p className="text-xs text-slate-500 mt-1">
              Used to calculate travel time to waypoints
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Fuel size={16} className="text-orange-400" />
              Fuel burn rate (gallons per hour)
            </label>
            <input
              type="number"
              value={formData.fuelBurnRate}
              onChange={(e) =>
                setFormData({ ...formData, fuelBurnRate: e.target.value })
              }
              className={`w-full bg-slate-700 border rounded-lg px-4 py-3 text-white text-lg ${
                parseFloat(formData.fuelBurnRate) === 0
                  ? 'border-red-500 border-2'
                  : 'border-slate-600'
              }`}
              placeholder="0"
              step="0.1"
              min="0"
            />
            <p className="text-xs text-slate-500 mt-1">
              At cruising speed - used for fuel consumption estimates
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Fuel size={16} className="text-orange-400" />
              Fuel capacity (total gallons)
            </label>
            <input
              type="number"
              value={formData.fuelCapacity}
              onChange={(e) =>
                setFormData({ ...formData, fuelCapacity: e.target.value })
              }
              className={`w-full bg-slate-700 border rounded-lg px-4 py-3 text-white text-lg ${
                parseFloat(formData.fuelCapacity) === 0
                  ? 'border-red-500 border-2'
                  : 'border-slate-600'
              }`}
              placeholder="0"
              step="10"
              min="0"
            />
            <p className="text-xs text-slate-500 mt-1">
              Total fuel capacity - used to calculate max safe range
            </p>
          </div>
        </div>

        {/* Fuel Warning */}
        {(parseFloat(formData.fuelBurnRate) === 0 || parseFloat(formData.fuelCapacity) === 0) && (
          <div className="mt-4 bg-red-900/30 border-2 border-red-600 rounded-lg p-4">
            <p className="text-red-400 font-semibold text-sm mb-2">⚠️ Fuel Data Required</p>
            <p className="text-red-200 text-xs">
              You must set both fuel burn rate AND fuel capacity for accurate trip planning and safety calculations.
              Without this data, range estimates and fuel warnings will not work.
            </p>
          </div>
        )}
      </div>

      {/* Launch Location */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <MapPin className="text-blue-400" size={24} />
          <h2 className="font-semibold text-lg">Launch Location</h2>
        </div>
        <label className="block text-sm text-slate-400 mb-2">
          Home port or marina
        </label>
        <input
          type="text"
          value={formData.launchLocation}
          onChange={(e) =>
            setFormData({ ...formData, launchLocation: e.target.value })
          }
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
          placeholder="e.g., Fort Lauderdale, FL"
        />
        <p className="text-xs text-slate-500 mt-2">
          Your typical departure point for offshore trips
        </p>
      </div>

      {/* Sea Surface Temperature */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Thermometer className="text-blue-400" size={24} />
          <h2 className="font-semibold text-lg">Preferred Sea Surface Temp</h2>
        </div>
        <label className="block text-sm text-slate-400 mb-2">
          Ideal temperature range (°F)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Minimum</label>
            <input
              type="number"
              value={formData.seaSurfaceTemp.min}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  seaSurfaceTemp: {
                    ...formData.seaSurfaceTemp,
                    min: e.target.value,
                  },
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
              placeholder="68"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Maximum</label>
            <input
              type="number"
              value={formData.seaSurfaceTemp.max}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  seaSurfaceTemp: {
                    ...formData.seaSurfaceTemp,
                    max: e.target.value,
                  },
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
              placeholder="78"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Alerts will notify you when conditions match your preferences
        </p>
      </div>

      {/* Preferred Species */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Fish className="text-blue-400" size={24} />
          <h2 className="font-semibold text-lg">Target Species Priority</h2>
        </div>
        <label className="block text-sm text-slate-400 mb-3">
          Select up to 3 species in priority order (1st = highest priority)
        </label>
        <div className="flex flex-wrap gap-2">
          {popularSpecies.map((species) => {
            const priorityIndex = formData.preferredSpecies.indexOf(species);
            const isSelected = priorityIndex !== -1;
            const priorityNumber = isSelected ? priorityIndex + 1 : null;

            return (
              <button
                key={species}
                onClick={() => toggleSpecies(species)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSelected
                    ? priorityNumber === 1
                      ? 'bg-green-600 text-white'
                      : priorityNumber === 2
                      ? 'bg-blue-600 text-white'
                      : priorityNumber === 3
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {isSelected && (
                  <span className="mr-1 font-bold">#{priorityNumber}</span>
                )}
                {species}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          {formData.preferredSpecies.length === 0 && 'Click to select your top 3 target species'}
          {formData.preferredSpecies.length > 0 && (
            <>
              <span className="font-semibold text-green-400">#1 {formData.preferredSpecies[0] || ''}</span>
              {formData.preferredSpecies[1] && (
                <> • <span className="font-semibold text-blue-400">#2 {formData.preferredSpecies[1]}</span></>
              )}
              {formData.preferredSpecies[2] && (
                <> • <span className="font-semibold text-purple-400">#3 {formData.preferredSpecies[2]}</span></>
              )}
            </>
          )}
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-lg"
      >
        <Save size={24} />
        Save Preferences
      </button>

      {/* Reset to Defaults */}
      <button
        onClick={() =>
          setFormData({
            vesselSpeed: '25',
            fuelBurnRate: '2.5',
            launchLocation: '',
            preferredSpecies: [],
            seaSurfaceTemp: { min: '68', max: '78' },
          })
        }
        className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <X size={20} />
        Reset to Defaults
      </button>
    </div>
  );
}
