import { Cloud, Wind, Droplets, Sun, Moon, CloudRain } from 'lucide-react';

export default function WeatherView() {
  const forecast = [
    { time: '12 PM', temp: 82, icon: Sun, wind: 10, condition: 'Sunny' },
    { time: '3 PM', temp: 84, icon: Sun, wind: 12, condition: 'Clear' },
    { time: '6 PM', temp: 80, icon: Cloud, wind: 15, condition: 'Partly Cloudy' },
    { time: '9 PM', temp: 76, icon: Moon, wind: 8, condition: 'Clear' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Current Weather */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-center">
        <Sun size={64} className="mx-auto mb-4" />
        <p className="text-6xl font-bold mb-2">82°F</p>
        <p className="text-xl mb-4">Sunny</p>
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Wind size={16} />
            <span>12 kts NE</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets size={16} />
            <span>65%</span>
          </div>
        </div>
      </div>

      {/* Hourly Forecast */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Hourly Forecast</h2>
        <div className="grid grid-cols-4 gap-3">
          {forecast.map((hour) => {
            const Icon = hour.icon;
            return (
              <div key={hour.time} className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-sm text-slate-400 mb-2">{hour.time}</p>
                <Icon size={28} className="mx-auto mb-2 text-blue-400" />
                <p className="font-semibold">{hour.temp}°</p>
                <p className="text-xs text-slate-400 mt-1">{hour.wind} kts</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Marine Warnings */}
      <div className="bg-yellow-600 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CloudRain size={24} className="flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">Small Craft Advisory</h3>
            <p className="text-sm">Winds 15-20 kts expected tonight. Seas 4-6 ft.</p>
            <p className="text-xs mt-2 opacity-80">Valid until 6:00 AM tomorrow</p>
          </div>
        </div>
      </div>

      {/* Extended Details */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Marine Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">Barometric Pressure</span>
            <span className="font-semibold">30.12 in</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">UV Index</span>
            <span className="font-semibold">8 (Very High)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Sunrise / Sunset</span>
            <span className="font-semibold">6:32 AM / 7:48 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Moon Phase</span>
            <span className="font-semibold">Waxing Gibbous (78%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
