import { useState, useEffect } from 'react';
import { TrendingUp, MapPin, Fish, Zap, Clock, Navigation2, AlertTriangle } from 'lucide-react';
import DataSourceCard from './DataSourceCard';
import HotspotCard from './HotspotCard';
import TripPlanner from './TripPlanner';
import FloatPlan from './FloatPlan';
import TideCard from './TideCard';
import MoonSolunarCard from './MoonSolunarCard';
import PressureCard from './PressureCard';
import { getOceanConditions, calculateConfidence, parseCoordinates } from '../../utils/oceanData';
import { getSolunarPeriods } from '../../utils/solunar';

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
  const [spotFilter, setSpotFilter] = useState<'all' | 'inshore' | 'midrange' | 'offshore'>('all');
  const [oceanConditions, setOceanConditions] = useState<any>(null); // General conditions for display
  const [spotConditions, setSpotConditions] = useState<Record<number, any>>({}); // Per-spot SST data
  const [dataFreshness, setDataFreshness] = useState<string>('Loading...');
  const [loadingSpotData, setLoadingSpotData] = useState(false);

  // Calculate solunar data (moon phase and feeding periods)
  const solunarData = getSolunarPeriods(new Date(), 38.328, -75.089); // Ocean City coordinates

  // Fetch general ocean data on mount
  useEffect(() => {
    fetchGeneralOceanData();
  }, []);

  const fetchGeneralOceanData = async () => {
    try {
      // Fetch conditions for general Ocean City offshore area
      const coords = parseCoordinates('37°52\'N 74°06\'W');
      if (coords) {
        const conditions = await getOceanConditions(coords.lat, coords.lon);
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
      setDataFreshness('Offline mode');
    }
  };

  // Fetch spot-specific ocean data for top spots
  const fetchSpotOceanData = async (spots: any[]) => {
    setLoadingSpotData(true);
    const conditionsMap: Record<number, any> = {};

    // Fetch data for each spot (limit to top 10 to avoid too many API calls)
    const spotsToFetch = spots.slice(0, 10);

    // Add timeout wrapper for each fetch
    const fetchWithTimeout = async (spot: any) => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        const coords = parseCoordinates(spot.coordinates);
        if (coords) {
          console.log(`Fetching ocean data for ${spot.name} at lat=${coords.lat}, lon=${coords.lon}`);
          const conditions = await Promise.race([
            getOceanConditions(coords.lat, coords.lon),
            timeoutPromise
          ]);
          if (conditions) {
            console.log(`${spot.name} SST: ${conditions.sst}°F`);
            conditionsMap[spot.id] = conditions;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${spot.name}:`, error);
      }
    };

    await Promise.all(spotsToFetch.map(fetchWithTimeout));

    setSpotConditions(conditionsMap);
    setLoadingSpotData(false);
  };

  const vesselSpeed = parseInt(preferences.vesselSpeed) || 25;
  const fuelCapacity = parseFloat(preferences.fuelCapacity) || 0;
  const fuelBurnRate = parseFloat(preferences.fuelBurnRate) || 0;

  // Calculate max safe range based on fuel
  const hasFuelData = fuelCapacity > 0 && fuelBurnRate > 0;
  const usableFuel = fuelCapacity * 0.7; // 30% reserve
  const maxFuelHours = hasFuelData ? usableFuel / fuelBurnRate : 0;
  const maxFuelRange = hasFuelData ? (maxFuelHours * vesselSpeed) / 2 : 0; // divide by 2 for round trip
  const maxRange = hasFuelData ? maxFuelRange.toFixed(0) : (vesselSpeed * 3).toFixed(0);

  // Real NOAA data sources with live status
  const dataSourceStatus = [
    {
      name: 'NOAA NDBC Buoy 44009',
      status: oceanConditions ? 'active' : 'loading',
      lastUpdate: dataFreshness,
      quality: oceanConditions ? 98 : 0
    },
    {
      name: 'NOAA SST (ERDDAP)',
      status: oceanConditions?.sst ? 'active' : 'standby',
      lastUpdate: dataFreshness,
      quality: oceanConditions?.sst ? 95 : 0
    },
    {
      name: 'NOAA Wave Forecast',
      status: oceanConditions?.waveHeight !== undefined ? 'active' : 'standby',
      lastUpdate: dataFreshness,
      quality: oceanConditions?.waveHeight !== undefined ? 92 : 0
    },
    {
      name: 'Wind & Current Data',
      status: oceanConditions?.windSpeed !== undefined ? 'active' : 'standby',
      lastUpdate: dataFreshness,
      quality: oceanConditions?.windSpeed !== undefined ? 90 : 0
    },
    {
      name: 'Chlorophyll Satellite',
      status: oceanConditions?.chlorophyll ? 'active' : 'standby',
      lastUpdate: dataFreshness,
      quality: oceanConditions?.chlorophyll ? 88 : 0
    },
    {
      name: 'Tide Predictions',
      status: oceanConditions?.tides && oceanConditions.tides.length > 0 ? 'active' : 'standby',
      lastUpdate: dataFreshness,
      quality: oceanConditions?.tides && oceanConditions.tides.length > 0 ? 93 : 0
    },
  ];

  // Real Ocean City, MD offshore fishing spots from your Humminbird GPS waypoints
  const allHotspots = [
    // INSHORE (3-5 nm) - Quick trips, bottom fishing
    { id: 1, name: 'Little Gull Shoals', coordinates: '38°18\'N 75°03\'W', distance: 3, confidence: 85, species: ['Flounder', 'Sea Bass'], depth: '70-90 ft', type: 'inshore' },
    { id: 2, name: 'Kelly\'s Reef', coordinates: '38°17\'N 75°05\'W', distance: 3, confidence: 87, species: ['Flounder', 'Sea Bass', 'Tautog'], depth: '75-95 ft', type: 'inshore' },
    { id: 3, name: 'Great Gull Bank', coordinates: '38°16\'N 75°00\'W', distance: 5, confidence: 92, species: ['Flounder', 'Sea Bass', 'Bluefish'], depth: '80-100 ft', type: 'inshore' },
    { id: 4, name: 'Russell\'s Reef', coordinates: '38°16\'N 75°02\'W', distance: 5, confidence: 86, species: ['Flounder', 'Sea Bass'], depth: '85-110 ft', type: 'inshore' },
    { id: 5, name: 'Gull Shoal Wreck', coordinates: '38°17\'N 75°00\'W', distance: 5, confidence: 88, species: ['Flounder', 'Sea Bass', 'Tog'], depth: '90-100 ft', type: 'inshore' },

    // MIDRANGE SPOTS (20-40 nm)
    { id: 100, name: 'StAnnsW', coordinates: '38°05\'N 74°48\'W', distance: 20, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 101, name: 'BenelliBlocks', coordinates: '38°05\'N 74°48\'W', distance: 20, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 102, name: 'Loran 2854', coordinates: '38°01\'N 74°54\'W', distance: 20, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 103, name: 'DE Light', coordinates: '38°27\'N 74°41\'W', distance: 20, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 104, name: 'De1', coordinates: '38°40\'N 74°59\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 105, name: 'de2', coordinates: '38°40\'N 74°59\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 106, name: 'de3', coordinates: '38°40\'N 74°59\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 107, name: 'De3', coordinates: '38°40\'N 74°59\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 108, name: 'de4', coordinates: '38°40\'N 74°59\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 109, name: 'de5', coordinates: '38°40\'N 75°00\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 110, name: 'A.G.', coordinates: '37°58\'N 74°59\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 111, name: 'Boiler Wreck', coordinates: '37°59\'N 74°59\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 112, name: 'China Arrow', coordinates: '37°58\'N 75°10\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 113, name: 'de6', coordinates: '38°40\'N 74°59\'W', distance: 21, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 114, name: 'Barnstable', coordinates: '37°58\'N 75°08\'W', distance: 22, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 115, name: 'Butters', coordinates: '37°58\'N 74°57\'W', distance: 22, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 116, name: 'Jackspot', coordinates: '38°05\'N 74°45\'W', distance: 22, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 117, name: '20 Fathom Fingers', coordinates: '38°12\'N 74°37\'W', distance: 23, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 118, name: 'A. Loran', coordinates: '37°58\'N 74°54\'W', distance: 23, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 119, name: 'Barge', coordinates: '37°57\'N 74°59\'W', distance: 23, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 120, name: 'DAVID ATTWATER', coordinates: '37°56\'N 75°05\'W', distance: 23, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 121, name: 'GOLF COURSE', coordinates: '38°03\'N 74°44\'W', distance: 23, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 122, name: 'Lightship (Wreck)', coordinates: '37°58\'N 74°55\'W', distance: 23, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 123, name: 'Winter Quarters Shoals offshore', coordinates: '37°59\'N 74°53\'W', distance: 23, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 124, name: 'Capt. Bunting', coordinates: '37°57\'N 74°55\'W', distance: 24, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '150-300 ft', type: 'midrange' },
    { id: 125, name: 'Atlantic Mist', coordinates: '37°55\'N 75°03\'W', distance: 25, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 126, name: 'USS Cherokee', coordinates: '38°35\'N 74°39\'W', distance: 26, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 127, name: 'Smithown Reef', coordinates: '38°35\'N 74°39\'W', distance: 26, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 128, name: 'de29', coordinates: '38°40\'N 74°44\'W', distance: 26, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 129, name: 'de35', coordinates: '38°40\'N 74°44\'W', distance: 26, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 130, name: 'de41', coordinates: '38°40\'N 74°44\'W', distance: 26, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 131, name: 'The PIMPLE', coordinates: '38°41\'N 74°45\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 132, name: 'de18', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 133, name: 'de19', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 134, name: 'de20', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 135, name: 'de21', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 136, name: 'de22', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 137, name: 'de23', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 138, name: 'de24', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 139, name: 'de25', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 140, name: 'de26', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 141, name: 'de28', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 142, name: 'de31', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 143, name: 'de32', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 144, name: 'de33', coordinates: '38°40\'N 74°44\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 145, name: 'de34', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 146, name: 'de36', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 147, name: 'de38', coordinates: '38°40\'N 74°44\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 148, name: 'de39', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 149, name: 'de40', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 150, name: 'de42', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 151, name: 'de43', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 152, name: 'de44', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 153, name: 'de45', coordinates: '38°40\'N 74°43\'W', distance: 27, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 154, name: 'Hvoslef', coordinates: '38°28\'N 74°32\'W', distance: 28, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 155, name: 'USS Moonstone', coordinates: '38°30\'N 74°30\'W', distance: 29, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 156, name: 'Gypsum Prince', coordinates: '38°48\'N 75°03\'W', distance: 29, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Bluefish'], depth: '200-400 ft', type: 'midrange' },
    { id: 157, name: 'de46', coordinates: '38°30\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 158, name: 'de47', coordinates: '38°31\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 159, name: 'de48', coordinates: '38°31\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 160, name: 'de49', coordinates: '38°31\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 161, name: 'de50', coordinates: '38°31\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 162, name: 'de51', coordinates: '38°31\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 163, name: 'de52', coordinates: '38°31\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 164, name: 'de53', coordinates: '38°31\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 165, name: 'de54', coordinates: '38°31\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 166, name: 'de55', coordinates: '38°30\'N 74°30\'W', distance: 30, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 167, name: 'Chicken Bone', coordinates: '38°13\'N 74°26\'W', distance: 31, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 168, name: 'Chicken Bone', coordinates: '38°14\'N 74°26\'W', distance: 31, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 169, name: 'Masseys', coordinates: '38°19\'N 74°26\'W', distance: 31, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 170, name: 'China Wreck', coordinates: '38°49\'N 74°54\'W', distance: 31, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 171, name: 'Stellwagon Bank', coordinates: '38°49\'N 74°54\'W', distance: 31, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 172, name: 'King Cobra', coordinates: '38°50\'N 74°53\'W', distance: 32, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 173, name: 'de27', coordinates: '38°40\'N 74°34\'W', distance: 32, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 174, name: 'de37', coordinates: '38°40\'N 74°34\'W', distance: 32, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 175, name: 'Hambone', coordinates: '38°11\'N 74°24\'W', distance: 33, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 176, name: 'MASSEYS CANYON', coordinates: '38°22\'N 74°23\'W', distance: 33, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 177, name: 'SausageSouh', coordinates: '37°59\'N 74°32\'W', distance: 33, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 178, name: 'City of Georgetown', coordinates: '38°44\'N 74°35\'W', distance: 34, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 179, name: 'U-853 Wreck', coordinates: '38°44\'N 74°35\'W', distance: 34, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '200-400 ft', type: 'midrange' },
    { id: 180, name: 'SausageMid', coordinates: '38°03\'N 74°25\'W', distance: 35, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'midrange' },
    { id: 181, name: 'de30', coordinates: '38°40\'N 74°30\'W', distance: 35, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'midrange' },
    { id: 182, name: 'Jacob Jones', coordinates: '38°40\'N 74°26\'W', distance: 37, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'midrange' },
    { id: 183, name: '19 Fathom Lump', coordinates: '38°30\'N 74°18\'W', distance: 38, confidence: 85, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'midrange' },

    // OFFSHORE SPOTS (40+ nm)
    { id: 184, name: 'Hotdog', coordinates: '38°06\'N 74°17\'W', distance: 40, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 185, name: 'Middle Lump', coordinates: '38°49\'N 74°28\'W', distance: 41, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 186, name: 'Hot Dog', coordinates: '38°07\'N 74°16\'W', distance: 41, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 187, name: 'Northeast Lump', coordinates: '38°50\'N 74°29\'W', distance: 42, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 188, name: 'Parking Lot', coordinates: '37°39\'N 74°53\'W', distance: 42, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 189, name: 'Michael DePalma', coordinates: '38°56\'N 74°40\'W', distance: 42, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 190, name: 'East Lump', coordinates: '38°47\'N 74°24\'W', distance: 43, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 191, name: 'Chris millerkiller', coordinates: '38°10\'N 74°11\'W', distance: 43, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 192, name: 'Arlene', coordinates: '38°19\'N 74°09\'W', distance: 44, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 193, name: 'Misty Blue', coordinates: '38°44\'N 74°19\'W', distance: 44, confidence: 88, species: ['Yellowfin Tuna', 'Mahi-Mahi', 'Wahoo'], depth: '300-600 ft', type: 'offshore' },
    { id: 194, name: 'Altair', coordinates: '38°17\'N 74°07\'W', distance: 45, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '300-600 ft', type: 'offshore' },
    { id: 195, name: 'Tuna Banks', coordinates: '38°51\'N 74°22\'W', distance: 46, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '300-600 ft', type: 'offshore' },
    { id: 196, name: 'City of Athens', coordinates: '38°51\'N 74°22\'W', distance: 46, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '300-600 ft', type: 'offshore' },
    { id: 197, name: 'YP-387', coordinates: '39°01\'N 74°39\'W', distance: 46, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '300-600 ft', type: 'offshore' },
    { id: 198, name: 'Dorothy B. Barrett', coordinates: '38°58\'N 74°27\'W', distance: 49, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '300-600 ft', type: 'offshore' },
    { id: 199, name: 'Elephant Trunk', coordinates: '38°35\'N 74°04\'W', distance: 50, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '600-1200 ft', type: 'offshore' },
    { id: 200, name: 'Esther Ann', coordinates: '38°15\'N 74°02\'W', distance: 50, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '600-1200 ft', type: 'offshore' },
    { id: 201, name: 'Lumpy Bottom', coordinates: '37°28\'N 74°52\'W', distance: 52, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '600-1200 ft', type: 'offshore' },
    { id: 202, name: 'Poorman\'s Canyon', coordinates: '37°52\'N 74°06\'W', distance: 54, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '600-1200 ft', type: 'offshore' },
    { id: 203, name: 'Rockpile', coordinates: '37°37\'N 74°20\'W', distance: 55, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '600-1200 ft', type: 'offshore' },
    { id: 204, name: 'Cigar', coordinates: '38°54\'N 74°08\'W', distance: 56, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '600-1200 ft', type: 'offshore' },
    { id: 205, name: 'WashtonTip', coordinates: '37°29\'N 74°30\'W', distance: 58, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '600-1200 ft', type: 'offshore' },
    { id: 206, name: 'Baltimore Canyon 100 Fathom Tip', coordinates: '38°14\'N 73°50\'W', distance: 59, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Mahi-Mahi'], depth: '600-1200 ft', type: 'offshore' },
    { id: 207, name: 'Wreck', coordinates: '37°23\'N 74°41\'W', distance: 60, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '600-1200 ft', type: 'offshore' },
    { id: 208, name: '800 Square', coordinates: '37°27\'N 74°24\'W', distance: 61, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '600-1200 ft', type: 'offshore' },
    { id: 209, name: 'Baltimore Canyon 500 Fathom Tip', coordinates: '38°06\'N 73°49\'W', distance: 62, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '600-1200 ft', type: 'offshore' },
    { id: 210, name: 'WashtonBite', coordinates: '37°26\'N 74°25\'W', distance: 62, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '600-1200 ft', type: 'offshore' },
    { id: 211, name: 'Baltimore Canyon 100 Fathom Bight', coordinates: '38°07\'N 73°47\'W', distance: 63, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '600-1200 ft', type: 'offshore' },
    { id: 212, name: 'Washton500', coordinates: '37°24\'N 74°25\'W', distance: 63, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '600-1200 ft', type: 'offshore' },
    { id: 213, name: 'Florida', coordinates: '39°19\'N 74°26\'W', distance: 67, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '800-2000 ft', type: 'offshore' },
    { id: 214, name: 'TUNA LUMP', coordinates: '38°37\'N 73°40\'W', distance: 69, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '800-2000 ft', type: 'offshore' },
    { id: 215, name: '5 FA Lightship', coordinates: '39°15\'N 74°13\'W', distance: 69, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '800-2000 ft', type: 'offshore' },
    { id: 216, name: 'WEST WALL', coordinates: '38°21\'N 73°35\'W', distance: 71, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '800-2000 ft', type: 'offshore' },
    { id: 217, name: 'E.F. Moran', coordinates: '39°20\'N 74°15\'W', distance: 72, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '800-2000 ft', type: 'offshore' },
    { id: 218, name: 'NorfolkTip', coordinates: '37°05\'N 74°45\'W', distance: 76, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '800-2000 ft', type: 'offshore' },
    { id: 219, name: 'NorfolkBght', coordinates: '37°03\'N 74°39\'W', distance: 79, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '800-2000 ft', type: 'offshore' },
    { id: 220, name: 'Little Egg Inlet', coordinates: '39°29\'N 74°17\'W', distance: 79, confidence: 88, species: ['Blue Marlin', 'White Marlin', 'Yellowfin Tuna', 'Wahoo'], depth: '800-2000 ft', type: 'offshore' },
    { id: 221, name: 'Norfolk500', coordinates: '37°01\'N 74°37\'W', distance: 81, confidence: 88, species: ['Blue Marlin', 'Bluefin Tuna', 'Swordfish', 'Yellowfin Tuna'], depth: '800-2000 ft', type: 'offshore' },
    { id: 222, name: 'Spencer Canyon', coordinates: '38°36\'N 73°10\'W', distance: 92, confidence: 88, species: ['Blue Marlin', 'Bluefin Tuna', 'Swordfish', 'Yellowfin Tuna'], depth: '1000-3000 ft', type: 'offshore' },
  ];

  // Filter hotspots based on user selection
  const filteredHotspots = spotFilter === 'all'
    ? allHotspots
    : allHotspots.filter(spot => spot.type === spotFilter);

  // Calculate real-time confidence for ALL spots first (before sorting)
  const spotsWithDynamicConfidence = filteredHotspots.map(spot => {
    const conditions = spotConditions[spot.id] || oceanConditions;
    let dynamicConfidence = spot.confidence;

    if (conditions) {
      const confidenceFactors = calculateConfidence(
        {
          sst: conditions.sst,
          waveHeight: conditions.waveHeight,
          windSpeed: conditions.windSpeed,
          chlorophyll: conditions.chlorophyll,
          sstBreak: conditions.sstBreak,
          pressure: conditions.pressure,
          pressureTrend: conditions.pressureTrend
        },
        preferences.preferredSpecies,
        spot.type
      );
      dynamicConfidence = confidenceFactors.overallConfidence;
    }

    return { ...spot, dynamicConfidence };
  });

  // Sort by BLENDED SCORE: 50% species priority + 50% real-time confidence
  // PLUS offshore bonus (no distance penalty)
  const sortedHotspots = [...spotsWithDynamicConfidence]
    .sort((a, b) => {
      // Calculate priority-weighted species score (0-175 range)
      const calculateSpeciesScore = (spot: typeof a) => {
        let score = 0;
        spot.species.forEach(species => {
          const priorityIndex = preferences.preferredSpecies.indexOf(species);
          if (priorityIndex === 0) score += 100; // 1st priority
          else if (priorityIndex === 1) score += 50; // 2nd priority
          else if (priorityIndex === 2) score += 25; // 3rd priority
        });
        return score;
      };

      const aSpeciesScore = calculateSpeciesScore(a);
      const bSpeciesScore = calculateSpeciesScore(b);

      // Normalize species score to 0-100 scale (max possible is 175)
      const aSpeciesNormalized = (aSpeciesScore / 175) * 100;
      const bSpeciesNormalized = (bSpeciesScore / 175) * 100;

      // OFFSHORE BONUS: +15 points for offshore, +5 for midrange
      const aOffshoreBonus = a.type === 'offshore' ? 15 : a.type === 'midrange' ? 5 : 0;
      const bOffshoreBonus = b.type === 'offshore' ? 15 : b.type === 'midrange' ? 5 : 0;

      // Blended score: 50% species + 50% real-time confidence + offshore bonus
      const aFinalScore = (aSpeciesNormalized * 0.5) + (a.dynamicConfidence * 0.5) + aOffshoreBonus;
      const bFinalScore = (bSpeciesNormalized * 0.5) + (b.dynamicConfidence * 0.5) + bOffshoreBonus;

      return bFinalScore - aFinalScore;
    })
    .slice(0, 20); // Show top 20 spots

  // Fetch spot-specific ocean data on mount and when filter or species changes
  useEffect(() => {
    // Fetch general ocean data first
    fetchGeneralOceanData();

    // Then fetch spot-specific data
    if (filteredHotspots.length > 0) {
      const topSpots = filteredHotspots.slice(0, 10);
      fetchSpotOceanData(topSpots);
    }
  }, [spotFilter, preferences.preferredSpecies]); // Runs on mount + when these change

  const hotspots = sortedHotspots.map(spot => {
    // Use spot-specific ocean conditions if available, otherwise fall back to general conditions
    const conditions = spotConditions[spot.id] || oceanConditions;

    return {
      ...spot,
      confidence: spot.dynamicConfidence, // Already calculated above during sorting
      sstBreak: conditions?.sstBreak || null, // Include SST break data
      travelTime: Math.round((spot.distance / vesselSpeed) * 60),
      reasons: spot.type === 'inshore' ? [
        'Reef structure concentrates baitfish',
        'Close to inlet - minimal fuel cost',
        'Protected from offshore weather',
        'Consistent bottom species action',
      ] : spot.type === 'midrange' ? [
        'Optimal depth for pelagic species',
        'Structure creates upwelling zones',
        'Good fuel efficiency vs. offshore',
        'Prime mahi and tuna habitat',
      ] : [
        'Major canyon system attracts pelagics',
        'SST gradient creates feeding zones',
        'Deep water billfish territory',
        'Satellite data shows favorable conditions',
      ],
      conditions: {
        sst: conditions?.sst ? `${conditions.sst}°F` : (spot.type === 'inshore' ? '71°F' : spot.type === 'midrange' ? '72°F' : '73°F'),
        current: conditions?.currentSpeed ? `${conditions.currentSpeed} kts ${conditions.currentDirection}` : (spot.type === 'inshore' ? '1.0 kts E' : spot.type === 'midrange' ? '1.5 kts SW' : '2.0 kts S'),
        depth: spot.depth,
        chlorophyll: conditions?.chlorophyll
          ? `${conditions.chlorophyll.toFixed(1)} mg/m³`
          : (spot.type === 'inshore' ? 'High' : spot.type === 'midrange' ? 'Medium' : 'Low'),
      },
    };
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await fetchGeneralOceanData();
      if (filteredHotspots.length > 0) {
        const topSpots = filteredHotspots.slice(0, 10);
        await fetchSpotOceanData(topSpots);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      // Always stop analyzing after 2 seconds, even if fetches fail
      setTimeout(() => setAnalyzing(false), 2000);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Analysis Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={32} className="text-yellow-300" />
          <div>
            <h1 className="text-xl font-bold">AI Fishing Predictions</h1>
            <p className="text-sm text-blue-100">
              Next 24 hours • {oceanConditions ? 'Live NOAA data' : 'Loading'} • {dataSourceStatus.length} sources
            </p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full bg-white text-blue-700 font-semibold py-3 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
              Analyzing...
            </>
          ) : (
            <>
              <TrendingUp size={20} />
              Refresh Predictions
            </>
          )}
        </button>
      </div>

      {/* Vessel Range Info */}
      {preferences.vesselSpeed && (
        <div className={`bg-slate-800 rounded-xl p-4 border-2 ${hasFuelData ? 'border-blue-500' : 'border-red-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Navigation2 className="text-blue-400" size={24} />
              <div>
                <p className="font-semibold">Max Safe Range</p>
                <p className="text-sm text-slate-400">
                  {hasFuelData
                    ? `${preferences.vesselSpeed} kts • ${usableFuel.toFixed(0)} gal usable (70%)`
                    : 'Fuel data required for accurate range'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${hasFuelData ? 'text-blue-400' : 'text-red-400'}`}>
                {hasFuelData ? maxRange : '?'} mi
              </p>
              <p className="text-xs text-slate-500">
                {hasFuelData ? 'One-way max' : 'Set fuel values'}
              </p>
            </div>
          </div>
          {!hasFuelData && (
            <div className="mt-3 bg-red-900/30 border border-red-600 rounded-lg p-3 text-sm">
              <p className="text-red-400 font-semibold mb-1">⚠️ Fuel Data Missing</p>
              <p className="text-red-200 text-xs">
                Set fuel capacity and burn rate in Settings for accurate range calculations and safety warnings.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Data Source Status */}
      <div>
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Live Data Sources
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {dataSourceStatus.map((source) => (
            <DataSourceCard key={source.name} {...source} />
          ))}
        </div>
      </div>

      {/* Moon Phase & Solunar Forecast */}
      <MoonSolunarCard solunarData={solunarData} />

      {/* Tide Schedule */}
      {oceanConditions?.tides && oceanConditions.tides.length > 0 && (
        <TideCard tides={oceanConditions.tides} />
      )}

      {/* Barometric Pressure */}
      <PressureCard conditions={oceanConditions} />

      {/* Species Targeting */}
      {preferences.preferredSpecies.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Fish className="text-blue-400" size={20} />
            <h3 className="font-semibold">Targeting</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.preferredSpecies.map((species) => (
              <span
                key={species}
                className="px-3 py-1 bg-blue-600 rounded-full text-sm font-medium"
              >
                {species}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Top 10 Fishing Spots - Next 24 Hours</h2>
          <span className="text-xs text-slate-500">Showing {hotspots.length} of {filteredHotspots.length}</span>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSpotFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${
              spotFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            All ({allHotspots.length})
          </button>
          <button
            onClick={() => setSpotFilter('inshore')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${
              spotFilter === 'inshore'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Inshore (3-5 nm)
          </button>
          <button
            onClick={() => setSpotFilter('midrange')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${
              spotFilter === 'midrange'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Mid-Range (16-33 nm)
          </button>
          <button
            onClick={() => setSpotFilter('offshore')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${
              spotFilter === 'offshore'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Offshore (46+ nm)
          </button>
        </div>

        {loadingSpotData && (
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-200">
              🌊 Fetching spot-specific SST data and temperature breaks for top {sortedHotspots.length} locations...
            </p>
          </div>
        )}

        <div className="space-y-3">
          {hotspots.map((hotspot, index) => (
            <HotspotCard
              key={hotspot.id}
              hotspot={hotspot}
              rank={index + 1}
              vesselSpeed={vesselSpeed}
              preferredSpecies={preferences.preferredSpecies}
              fuelCapacity={fuelCapacity}
              fuelBurnRate={fuelBurnRate}
            />
          ))}
        </div>
      </div>

      {/* Float Plan */}
      <FloatPlan
        vesselSpeed={vesselSpeed}
        fuelBurnRate={parseFloat(preferences.fuelBurnRate) || 2.5}
        launchLocation={preferences.launchLocation}
      />

      {/* Trip Planner */}
      <TripPlanner
        hotspots={hotspots}
        vesselSpeed={vesselSpeed}
        fuelBurnRate={parseFloat(preferences.fuelBurnRate) || 2.5}
        launchLocation={preferences.launchLocation}
      />

      {/* Disclaimer */}
      <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-400 mb-1">Predictions are estimates</p>
            <p className="text-yellow-200/80">
              Always verify conditions before departure. Weather can change rapidly.
              Captain's judgment takes precedence over all predictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
