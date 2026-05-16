import { Waves, TrendingUp, TrendingDown } from 'lucide-react';
import { Tide } from '../../utils/oceanData';

interface TideCardProps {
  tides: Tide[];
}

export default function TideCard({ tides }: TideCardProps) {
  if (!tides || tides.length === 0) {
    return null;
  }

  // Find next tide
  const now = new Date();
  const nextTide = tides[0]; // First tide in the list is the next one

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <Waves className="text-blue-400" size={24} />
        <div>
          <h3 className="font-semibold text-lg">Tide Schedule</h3>
          <p className="text-xs text-slate-400">Ocean City Inlet - Next 24 Hours</p>
        </div>
      </div>

      {/* Next Tide Highlight */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {nextTide.type === 'High' ? (
              <TrendingUp className="text-blue-200" size={20} />
            ) : (
              <TrendingDown className="text-blue-200" size={20} />
            )}
            <div>
              <p className="text-sm text-blue-100">Next Tide</p>
              <p className="font-bold text-lg">{nextTide.type} Tide</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Time</p>
            <p className="font-bold text-lg">{nextTide.time}</p>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-blue-500">
          <p className="text-xs text-blue-100">
            Height: <span className="font-semibold">{nextTide.height.toFixed(1)} ft</span>
          </p>
        </div>
      </div>

      {/* Upcoming Tides */}
      <div className="space-y-2">
        {tides.slice(1, 4).map((tide, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-slate-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              {tide.type === 'High' ? (
                <TrendingUp className="text-green-400" size={18} />
              ) : (
                <TrendingDown className="text-orange-400" size={18} />
              )}
              <div>
                <p className="font-semibold">{tide.type} Tide</p>
                <p className="text-xs text-slate-400">{tide.height.toFixed(1)} ft</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{tide.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fishing Tip */}
      <div className="mt-3 bg-blue-900/30 border border-blue-600 rounded-lg p-3">
        <p className="text-xs text-blue-200">
          💡 <span className="font-semibold">Tip:</span> Best fishing often occurs 1-2 hours before and after high tide when baitfish are most active.
        </p>
      </div>
    </div>
  );
}
