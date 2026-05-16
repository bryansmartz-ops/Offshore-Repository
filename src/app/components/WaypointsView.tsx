import { MapPin, Navigation, Trash2, Star } from 'lucide-react';

export default function WaypointsView() {
  const waypoints = [
    {
      name: 'The Ledge',
      coordinates: '26°24\'N 80°03\'W',
      distance: '2.3 mi',
      bearing: 'NE',
      notes: 'Great for Mahi',
      favorite: true,
    },
    {
      name: 'Reef 47',
      coordinates: '26°18\'N 80°06\'W',
      distance: '8.7 mi',
      bearing: 'SE',
      notes: 'Grouper hotspot',
      favorite: true,
    },
    {
      name: 'Deep Drop Zone',
      coordinates: '26°12\'N 80°10\'W',
      distance: '15.2 mi',
      bearing: 'S',
      notes: 'Swordfish area',
      favorite: false,
    },
    {
      name: 'Wreck Site',
      coordinates: '26°28\'N 80°02\'W',
      distance: '4.1 mi',
      bearing: 'N',
      notes: 'Structure fishing',
      favorite: false,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <MapPin size={20} />
          Mark Current
        </button>
        <button className="bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <Navigation size={20} />
          Navigate
        </button>
      </div>

      {/* Current Position */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Navigation size={20} className="text-blue-400" />
          <h3 className="font-semibold">Current Position</h3>
        </div>
        <p className="text-2xl font-bold mb-1">26°24'12"N 80°03'45"W</p>
        <div className="flex gap-4 text-sm text-slate-400">
          <span>Speed: 15 kts</span>
          <span>Heading: 285°</span>
        </div>
      </div>

      {/* Saved Waypoints */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Saved Waypoints</h2>
          <button className="text-blue-400 text-sm">+ Add New</button>
        </div>
        <div className="space-y-3">
          {waypoints.map((waypoint, index) => (
            <div key={index} className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{waypoint.name}</h3>
                    {waypoint.favorite && (
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{waypoint.coordinates}</p>
                  <p className="text-sm text-slate-300">{waypoint.notes}</p>
                </div>
                <button className="text-slate-400 hover:text-red-400 p-1">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-400">
                    Distance: <span className="text-white font-semibold">{waypoint.distance}</span>
                  </span>
                  <span className="text-slate-400">
                    Bearing: <span className="text-white font-semibold">{waypoint.bearing}</span>
                  </span>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg text-sm font-medium">
                  Navigate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Import/Export */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Manage Waypoints</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm">
            Import GPX
          </button>
          <button className="bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm">
            Export All
          </button>
        </div>
      </div>
    </div>
  );
}
