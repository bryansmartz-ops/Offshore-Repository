import { useState } from 'react';
import { MapPin, Fish, Clock, TrendingUp, ChevronDown, ChevronUp, Navigation, AlertTriangle, Fuel, Flame } from 'lucide-react';
import { SSTBreak } from '../../utils/oceanData';

interface Hotspot {
  id: number;
  name: string;
  coordinates: string;
  loranCoordinates?: string;
  distance: number;
  travelTime: number;
  confidence: number;
  species: string[];
  reasons: string[];
  conditions: {
    sst: string;
    current: string;
    depth: string;
    chlorophyll: string;
  };
  sstBreak?: SSTBreak | null;
}

interface HotspotCardProps {
  hotspot: Hotspot;
  rank: number;
  vesselSpeed: number;
  preferredSpecies: string[];
  fuelCapacity: number;
  fuelBurnRate: number;
  isPrimary?: boolean;
  isSecondary?: boolean;
  onSetPrimary?: () => void;
  onSetSecondary?: () => void;
}

export default function HotspotCard({ hotspot, rank, vesselSpeed, preferredSpecies, fuelCapacity, fuelBurnRate, isPrimary, isSecondary, onSetPrimary, onSetSecondary }: HotspotCardProps) {
  const [expanded, setExpanded] = useState(false);

  const matchingSpecies = hotspot.species.filter((s) =>
    preferredSpecies.includes(s)
  );

  // Calculate fuel range
  const hasFuelData = fuelCapacity > 0 && fuelBurnRate > 0;
  const roundTripDistance = hotspot.distance * 2;
  const roundTripTime = (roundTripDistance / vesselSpeed); // hours
  const fuelNeeded = roundTripTime * fuelBurnRate;
  const usableFuel = fuelCapacity * 0.7; // 30% reserve
  const isWithinRange = hasFuelData && fuelNeeded <= usableFuel;
  const fuelMargin = usableFuel - fuelNeeded;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 75) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-400';
    if (confidence >= 75) return 'bg-yellow-400';
    return 'bg-orange-400';
  };

  return (
    <div className={`bg-slate-800 rounded-xl overflow-hidden border-2 ${
      isPrimary ? 'border-green-500 shadow-lg shadow-green-500/20' :
      isSecondary ? 'border-blue-500 shadow-lg shadow-blue-500/20' :
      !isWithinRange && hasFuelData ? 'border-red-600' :
      'border-slate-700'
    }`}>
      {/* Selection Status Banner */}
      {(isPrimary || isSecondary) && (
        <div className={`px-4 py-2 flex items-center gap-2 text-sm font-semibold ${
          isPrimary ? 'bg-green-600' : 'bg-blue-600'
        }`}>
          <Navigation size={16} />
          <span>{isPrimary ? '🎯 PRIMARY TARGET' : '🔄 SECONDARY/BACKUP'}</span>
        </div>
      )}
      {/* Fuel Warning Banner */}
      {hasFuelData && !isWithinRange && (
        <div className="bg-red-600 px-4 py-2 flex items-center gap-2 text-sm">
          <AlertTriangle size={16} />
          <div className="flex-1">
            <p className="font-semibold">⚠️ Beyond Fuel Range</p>
            <p className="text-xs text-red-100">
              Need {fuelNeeded.toFixed(1)} gal, have {usableFuel.toFixed(1)} gal usable (short {Math.abs(fuelMargin).toFixed(1)} gal)
            </p>
          </div>
        </div>
      )}

      {/* Fuel OK Indicator */}
      {hasFuelData && isWithinRange && fuelMargin < 50 && (
        <div className="bg-yellow-900/50 border-b border-yellow-600 px-4 py-2 flex items-center gap-2 text-sm">
          <Fuel size={16} className="text-yellow-400" />
          <p className="text-yellow-200 text-xs">
            Fuel margin: {fuelMargin.toFixed(1)} gal remaining (tight but safe)
          </p>
        </div>
      )}

      {/* SST Break Banner - Major fishing indicator! */}
      {hotspot.sstBreak && hotspot.sstBreak.strength !== 'none' && (
        <div className={`px-4 py-2 flex items-center gap-2 text-sm ${
          hotspot.sstBreak.strength === 'major'
            ? 'bg-gradient-to-r from-orange-600 to-red-600'
            : 'bg-gradient-to-r from-yellow-600 to-orange-500'
        }`}>
          <Flame size={18} className="animate-pulse" />
          <div className="flex-1">
            <p className="font-semibold">
              {hotspot.sstBreak.strength === 'major' ? '🔥 MAJOR SST BREAK' : '⚡ SST Break Detected'}
            </p>
            <p className="text-xs opacity-90">
              {hotspot.sstBreak.coldSide && hotspot.sstBreak.warmSide
                ? `${hotspot.sstBreak.coldSide}°F → ${hotspot.sstBreak.warmSide}°F • ${hotspot.sstBreak.description}`
                : hotspot.sstBreak.description
              }
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0">
              #{rank}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{hotspot.name}</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin size={12} />
                  <span>{hotspot.coordinates}</span>
                </div>
                {hotspot.loranCoordinates && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Navigation size={12} />
                    <span>9960: {hotspot.loranCoordinates}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`text-right ${getConfidenceColor(hotspot.confidence)}`}>
            <p className="text-2xl font-bold">{hotspot.confidence}%</p>
            <p className="text-xs">Confidence</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-slate-700 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400">Distance</p>
            <p className="font-semibold">{hotspot.distance} mi</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400">Travel</p>
            <p className="font-semibold">{hotspot.travelTime} min</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400">Depth</p>
            <p className="font-semibold">{hotspot.conditions.depth}</p>
          </div>
        </div>

        {/* Species */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Fish size={14} className="text-blue-400" />
            <span className="text-xs text-slate-400">Target Species</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hotspot.species.map((species) => (
              <span
                key={species}
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  matchingSpecies.includes(species)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {species}
                {matchingSpecies.includes(species) && ' ✓'}
              </span>
            ))}
          </div>
        </div>

        {/* Float Plan Selection Buttons */}
        {(onSetPrimary || onSetSecondary) && !isPrimary && !isSecondary && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {onSetPrimary && (
              <button
                onClick={onSetPrimary}
                className="bg-green-600 hover:bg-green-700 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
              >
                <Navigation size={14} />
                Set as Primary
              </button>
            )}
            {onSetSecondary && (
              <button
                onClick={onSetSecondary}
                className="bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
              >
                <Navigation size={14} />
                Set as Backup
              </button>
            )}
          </div>
        )}

        {/* Clear Selection if already selected */}
        {(isPrimary || isSecondary) && (
          <button
            onClick={isPrimary ? onSetPrimary : onSetSecondary}
            className="w-full bg-slate-600 hover:bg-slate-500 py-2 rounded-lg text-xs font-medium mb-2"
          >
            ✕ Clear Selection
          </button>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          {expanded ? (
            <>
              Hide Details <ChevronUp size={16} />
            </>
          ) : (
            <>
              View Analysis <ChevronDown size={16} />
            </>
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
          {/* AI Analysis Reasons */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" />
              Why This Spot
            </h4>
            <ul className="space-y-1.5">
              {hotspot.reasons.map((reason, idx) => (
                <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Current Conditions */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Current Conditions</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-700 rounded-lg p-2">
                <p className="text-xs text-slate-400">SST</p>
                <p className="font-semibold">{hotspot.conditions.sst}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-2">
                <p className="text-xs text-slate-400">Current</p>
                <p className="font-semibold">{hotspot.conditions.current}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-2">
                <p className="text-xs text-slate-400">Depth</p>
                <p className="font-semibold">{hotspot.conditions.depth}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-2">
                <p className="text-xs text-slate-400">Chlorophyll</p>
                <p className="font-semibold">{hotspot.conditions.chlorophyll}</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
            <Navigation size={18} />
            Navigate to Hotspot
          </button>
        </div>
      )}
    </div>
  );
}
