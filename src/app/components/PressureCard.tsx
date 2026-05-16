import { Gauge, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { OceanConditions } from '../../utils/oceanData';

interface PressureCardProps {
  conditions: OceanConditions | null;
}

export default function PressureCard({ conditions }: PressureCardProps) {
  if (!conditions?.pressure) {
    return null;
  }

  const getTrendInfo = () => {
    switch (conditions.pressureTrend) {
      case 'falling':
        return {
          icon: <TrendingDown size={20} className="text-green-400" />,
          color: 'bg-green-900/30 border-green-600 text-green-400',
          label: 'Falling',
          description: 'Fish are feeding actively ahead of weather change - PRIME TIME!',
          fishing: 'Excellent'
        };
      case 'rising':
        return {
          icon: <TrendingUp size={20} className="text-yellow-400" />,
          color: 'bg-yellow-900/30 border-yellow-600 text-yellow-400',
          label: 'Rising',
          description: 'Post-front conditions - fish may be less active but still feeding',
          fishing: 'Fair to Good'
        };
      default:
        return {
          icon: <Minus size={20} className="text-blue-400" />,
          color: 'bg-blue-900/30 border-blue-600 text-blue-400',
          label: 'Stable',
          description: 'Consistent conditions - steady, predictable bite',
          fishing: 'Good'
        };
    }
  };

  const trendInfo = getTrendInfo();

  // Convert hPa to inHg for US anglers (1 hPa = 0.02953 inHg)
  const pressureInHg = (conditions.pressure * 0.02953).toFixed(2);

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <Gauge className="text-blue-400" size={24} />
        <div>
          <h3 className="font-semibold text-lg">Barometric Pressure</h3>
          <p className="text-xs text-slate-400">Current Trend & Fishing Impact</p>
        </div>
      </div>

      {/* Pressure Reading */}
      <div className="bg-slate-700 rounded-lg p-3 mb-3 text-center">
        <p className="text-xs text-slate-400">Current Pressure</p>
        <p className="text-3xl font-bold text-white mb-1">
          {pressureInHg}
        </p>
        <p className="text-xs text-slate-400">
          inHg ({conditions.pressure.toFixed(1)} hPa)
        </p>
      </div>

      {/* Trend Indicator */}
      <div className={`border rounded-lg p-3 ${trendInfo.color}`}>
        <div className="flex items-center gap-2 mb-2">
          {trendInfo.icon}
          <div className="flex-1">
            <p className="font-semibold">Pressure {trendInfo.label}</p>
            <p className="text-xs opacity-90">Fishing: {trendInfo.fishing}</p>
          </div>
        </div>
        <p className="text-xs opacity-80 leading-relaxed">
          {trendInfo.description}
        </p>
      </div>

      {/* Reference Guide */}
      <div className="mt-3 bg-slate-700/50 rounded-lg p-2">
        <p className="text-xs text-slate-300 font-semibold mb-1">Quick Reference:</p>
        <div className="space-y-1 text-xs text-slate-400">
          <p>• 29.70-30.20 inHg = Normal</p>
          <p>• &lt; 29.70 = Low (often good fishing)</p>
          <p>• &gt; 30.20 = High (slower bite)</p>
        </div>
      </div>
    </div>
  );
}
