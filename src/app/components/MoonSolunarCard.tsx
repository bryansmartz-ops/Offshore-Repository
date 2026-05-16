import { Moon, TrendingUp, Clock } from 'lucide-react';
import { SolunarData, getUpcomingPeriods, isInAnyPeriod, formatPeriodTime, formatPeriodTimeWithDate } from '../../utils/solunar';

interface MoonSolunarCardProps {
  solunarData: SolunarData;
}

export default function MoonSolunarCard({ solunarData }: MoonSolunarCardProps) {
  // Get next 4 upcoming periods (may include tomorrow/next day)
  const upcomingPeriods = getUpcomingPeriods();
  const currentPeriod = isInAnyPeriod(upcomingPeriods);
  const nextPeriod = upcomingPeriods.find(p => !currentPeriod || p.start !== currentPeriod.start);

  // Get quality color
  const getQualityColor = (quality: string) => {
    if (quality === 'excellent') return 'text-green-400';
    if (quality === 'good') return 'text-blue-400';
    if (quality === 'fair') return 'text-yellow-400';
    return 'text-slate-400';
  };

  const qualityColor = getQualityColor(solunarData.moonData.fishingQuality);

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <Moon className={qualityColor} size={24} />
        <div>
          <h3 className="font-semibold text-lg">Solunar Forecast</h3>
          <p className="text-xs text-slate-400">Moon Phase & Feeding Periods</p>
        </div>
      </div>

      {/* Moon Phase Info */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-slate-300">Current Phase</p>
            <p className="font-bold text-lg">{solunarData.moonData.phaseName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">Illumination</p>
            <p className="font-bold text-lg">{solunarData.moonData.illumination}%</p>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-500">
          <p className={`text-sm font-semibold ${qualityColor}`}>
            {solunarData.moonData.fishingQuality.toUpperCase()} Fishing Conditions
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {solunarData.moonData.description}
          </p>
        </div>
      </div>

      {/* Current/Next Feeding Period */}
      {currentPeriod ? (
        <div className="bg-green-900/30 border border-green-600 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="text-green-400" size={16} />
            <p className="text-sm font-semibold text-green-400">
              🎣 ACTIVE {currentPeriod.type.toUpperCase()} FEEDING PERIOD
            </p>
          </div>
          <p className="text-xs text-green-200">
            Until {formatPeriodTime(currentPeriod.end)} • Quality: {currentPeriod.quality}%
          </p>
        </div>
      ) : nextPeriod ? (
        <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="text-blue-400" size={16} />
            <p className="text-sm font-semibold text-blue-400">
              Next {nextPeriod.type === 'major' ? 'MAJOR' : 'Minor'} Period
            </p>
          </div>
          <p className="text-xs text-blue-200">
            {formatPeriodTime(nextPeriod.start)} - {formatPeriodTime(nextPeriod.end)} • Quality: {nextPeriod.quality}%
          </p>
        </div>
      ) : null}

      {/* Upcoming Feeding Periods (Next 4) */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 font-semibold">Next 4 Feeding Periods:</p>
        {upcomingPeriods.map((period, index) => {
          const isActive = currentPeriod?.start.getTime() === period.start.getTime();
          const now = new Date();
          const isPast = period.end < now;

          return (
            <div
              key={index}
              className={`flex items-center justify-between rounded-lg p-2 ${
                isActive
                  ? 'bg-green-600 text-white'
                  : isPast
                  ? 'bg-slate-700/30 opacity-50'
                  : period.type === 'major'
                  ? 'bg-slate-700'
                  : 'bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${
                  isActive ? 'text-white' : period.type === 'major' ? 'text-yellow-400' : 'text-slate-400'
                }`}>
                  {period.type === 'major' ? '●●' : '●'}
                </span>
                <span className="text-sm">
                  {period.type === 'major' ? 'Major' : 'Minor'}
                </span>
              </div>
              <span className="text-sm">
                {formatPeriodTimeWithDate(period.start)} - {formatPeriodTime(period.end)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="mt-3 bg-purple-900/30 border border-purple-600 rounded-lg p-2">
        <p className="text-xs text-purple-200">
          💡 Major periods = 2 hour windows, Minor periods = 1 hour windows
        </p>
      </div>
    </div>
  );
}
