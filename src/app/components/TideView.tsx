import { TrendingUp, TrendingDown } from 'lucide-react';

export default function TideView() {
  const tideData = [
    { time: '6:23 AM', type: 'Low', height: '0.8 ft', status: 'past' },
    { time: '12:15 PM', type: 'High', height: '4.2 ft', status: 'past' },
    { time: '6:45 PM', type: 'Low', height: '1.1 ft', status: 'upcoming' },
    { time: '12:52 AM', type: 'High', height: '4.5 ft', status: 'future' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Current Tide Status */}
      <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Current Tide</h2>
          <TrendingUp size={28} />
        </div>
        <p className="text-5xl font-bold mb-2">3.2 ft</p>
        <p className="text-lg mb-1">Rising</p>
        <p className="text-sm text-cyan-100">Next high tide at 6:45 PM (1.5 hrs)</p>
      </div>

      {/* Tide Chart Visual */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4">24 Hour Tide Chart</h3>
        <div className="relative h-32 bg-slate-900 rounded-lg p-2">
          <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
            <path
              d="M 0 80 Q 50 20, 100 20 T 200 20 Q 250 80, 300 80 T 400 80"
              fill="none"
              stroke="rgb(34, 211, 238)"
              strokeWidth="2"
            />
            <path
              d="M 0 80 Q 50 20, 100 20 T 200 20 Q 250 80, 300 80 T 400 80 L 400 100 L 0 100 Z"
              fill="url(#gradient)"
              opacity="0.3"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="140" cy="40" r="4" fill="rgb(34, 211, 238)" />
          </svg>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* Tide Schedule */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Tide Schedule</h3>
        <div className="space-y-3">
          {tideData.map((tide, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg ${
                tide.status === 'upcoming'
                  ? 'bg-blue-600'
                  : tide.status === 'past'
                  ? 'bg-slate-700'
                  : 'bg-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                {tide.type === 'High' ? (
                  <TrendingUp className="text-cyan-400" size={20} />
                ) : (
                  <TrendingDown className="text-orange-400" size={20} />
                )}
                <div>
                  <p className="font-semibold">{tide.type} Tide</p>
                  <p className="text-sm text-slate-300">{tide.time}</p>
                </div>
              </div>
              <p className="font-semibold text-lg">{tide.height}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fishing Conditions */}
      <div className="bg-green-600 rounded-xl p-4">
        <h3 className="font-semibold mb-2">Fishing Conditions</h3>
        <p className="text-sm mb-2">Current tide phase is favorable for fishing</p>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 flex-1 bg-green-800 rounded-full overflow-hidden">
            <div className="h-full w-4/5 bg-green-300 rounded-full"></div>
          </div>
          <span className="font-semibold">Good</span>
        </div>
      </div>
    </div>
  );
}
