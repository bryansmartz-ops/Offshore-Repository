import { useState, useEffect } from 'react';
import { Navigation, Waves, Fish, MapPin, AlertCircle, Menu, Settings, Target } from 'lucide-react';
import Dashboard from './components/Dashboard';
import WeatherView from './components/WeatherView';
import TideView from './components/TideView';
import CatchLog from './components/CatchLog';
import WaypointsView from './components/WaypointsView';
import SettingsView from './components/SettingsView';
import PredictionsView from './components/PredictionsView';
import InstallPWA from './components/InstallPWA';
import AuthModal from './components/AuthModal';
import { authHelpers, api } from '../utils/supabase/client';

const STORAGE_KEY = 'tactical_offshore_preferences';
const CATCHES_STORAGE_KEY = 'tactical_offshore_catches';

const defaultPreferences = {
  vesselSpeed: '25',
  fuelBurnRate: '0',
  fuelCapacity: '0',
  launchLocation: 'Ocean City, MD Inlet',
  preferredSpecies: ['Mahi-Mahi', 'Tuna', 'Wahoo'],
  seaSurfaceTemp: { min: '68', max: '78' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('predictions');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load preferences from localStorage on mount
  const [userPreferences, setUserPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
    return defaultPreferences;
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session } = await authHelpers.getSession();
        if (session?.access_token) {
          setAccessToken(session.access_token);

          // Load user profile from server
          const result = await api.getProfile(session.access_token);
          if (result.profile) {
            setUser({
              id: result.profile.id,
              email: result.profile.email,
              name: result.profile.name || ''
            });

            // Merge cloud preferences with local (cloud takes precedence)
            setUserPreferences({
              vesselSpeed: result.profile.vesselSpeed || defaultPreferences.vesselSpeed,
              fuelBurnRate: result.profile.fuelBurnRate || defaultPreferences.fuelBurnRate,
              fuelCapacity: result.profile.fuelCapacity || defaultPreferences.fuelCapacity,
              launchLocation: result.profile.launchLocation || defaultPreferences.launchLocation,
              preferredSpecies: result.profile.preferredSpecies || defaultPreferences.preferredSpecies,
              seaSurfaceTemp: result.profile.seaSurfaceTemp || defaultPreferences.seaSurfaceTemp
            });

            // Load catch logs from cloud
            const catchesResult = await api.getCatches(session.access_token);
            if (catchesResult.catches) {
              localStorage.setItem(CATCHES_STORAGE_KEY, JSON.stringify(catchesResult.catches));
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    checkAuth();
  }, []);

  // Save preferences to localStorage AND sync to cloud if logged in
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPreferences));

      // Sync to cloud if user is logged in
      if (user && accessToken) {
        setIsSyncing(true);
        api.updateProfile(accessToken, {
          vesselSpeed: userPreferences.vesselSpeed,
          fuelBurnRate: userPreferences.fuelBurnRate,
          fuelCapacity: userPreferences.fuelCapacity,
          launchLocation: userPreferences.launchLocation,
          preferredSpecies: userPreferences.preferredSpecies,
          seaSurfaceTemp: userPreferences.seaSurfaceTemp
        }).then(() => {
          setTimeout(() => setIsSyncing(false), 1000);
        }).catch((error) => {
          console.error('Failed to sync preferences:', error);
          setIsSyncing(false);
        });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [userPreferences, user, accessToken]);

  // Sync catch logs to cloud when they change
  useEffect(() => {
    if (user && accessToken) {
      try {
        const catches = localStorage.getItem(CATCHES_STORAGE_KEY);
        if (catches) {
          setIsSyncing(true);
          api.saveCatches(accessToken, JSON.parse(catches)).then(() => {
            setTimeout(() => setIsSyncing(false), 1000);
          }).catch((error) => {
            console.error('Failed to sync catches:', error);
            setIsSyncing(false);
          });
        }
      } catch (error) {
        console.error('Failed to sync catches:', error);
      }
    }
  }, [user, accessToken]);

  // Auth handlers
  const handleSignIn = async (email: string, password: string) => {
    const { data, error } = await authHelpers.signIn(email, password);
    if (error) throw error;

    if (data.session?.access_token) {
      setAccessToken(data.session.access_token);

      // Load user profile
      const result = await api.getProfile(data.session.access_token);
      if (result.profile) {
        setUser({
          id: result.profile.id,
          email: result.profile.email,
          name: result.profile.name || ''
        });

        // Load cloud preferences
        setUserPreferences({
          vesselSpeed: result.profile.vesselSpeed || defaultPreferences.vesselSpeed,
          fuelBurnRate: result.profile.fuelBurnRate || defaultPreferences.fuelBurnRate,
          fuelCapacity: result.profile.fuelCapacity || defaultPreferences.fuelCapacity,
          launchLocation: result.profile.launchLocation || defaultPreferences.launchLocation,
          preferredSpecies: result.profile.preferredSpecies || defaultPreferences.preferredSpecies,
          seaSurfaceTemp: result.profile.seaSurfaceTemp || defaultPreferences.seaSurfaceTemp
        });
      }
    }
  };

  const handleSignUp = async (email: string, password: string, name: string) => {
    console.log('Starting signup for:', email);
    const result = await api.signup(email, password, name);
    console.log('Signup result:', result);

    if (result.error) {
      console.error('Signup error:', result.error);
      throw new Error(result.error);
    }

    if (!result.success) {
      console.error('Signup failed without error:', result);
      throw new Error('Signup failed - please check server logs');
    }

    console.log('Signup successful, attempting auto sign-in');
    // Auto sign in after signup
    await handleSignIn(email, password);
  };

  const handleSignOut = async () => {
    await authHelpers.signOut();
    setUser(null);
    setAccessToken(null);
    // Keep local preferences but they won't sync anymore
  };

  const tabs = [
    { id: 'predictions', label: 'Predict', icon: Target },
    { id: 'dashboard', label: 'Dashboard', icon: Navigation },
    { id: 'catch', label: 'Catch Log', icon: Fish },
    { id: 'waypoints', label: 'Waypoints', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="size-full bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 p-4 flex items-center justify-between">
        <h1 className="font-semibold text-xl">Tactical Offshore</h1>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-blue-700 rounded-lg"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Emergency Banner */}
      <div className="bg-red-600 px-4 py-2 flex items-center gap-2 text-sm">
        <AlertCircle size={16} />
        <span>Emergency: Hold SOS for 3s</span>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'predictions' && <PredictionsView preferences={userPreferences} />}
        {activeTab === 'dashboard' && <Dashboard preferences={userPreferences} />}
        {activeTab === 'weather' && <WeatherView />}
        {activeTab === 'tides' && <TideView />}
        {activeTab === 'catch' && <CatchLog />}
        {activeTab === 'waypoints' && <WaypointsView />}
        {activeTab === 'settings' && (
          <SettingsView
            preferences={userPreferences}
            onSave={setUserPreferences}
            user={user}
            isSyncing={isSyncing}
            onShowAuth={() => setShowAuthModal(true)}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-800 border-t border-slate-700 flex justify-around p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* PWA Install Prompt */}
      <InstallPWA />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
      )}
    </div>
  );
}
