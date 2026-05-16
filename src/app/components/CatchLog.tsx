import { useState, useEffect } from 'react';
import { Plus, Fish, MapPin, Clock, Ruler, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'tactical_offshore_catches';

interface Catch {
  id: string;
  species: string;
  weight: string;
  length: string;
  time: string;
  location: string;
  date: string;
}

export default function CatchLog() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    species: '',
    weight: '',
    length: '',
  });

  // Load catches from localStorage
  const [catches, setCatches] = useState<Catch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load catches:', error);
    }
    return [];
  });

  // Save catches to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(catches));
    } catch (error) {
      console.error('Failed to save catches:', error);
    }
  }, [catches]);

  const handleAddCatch = () => {
    if (!formData.species || !formData.weight || !formData.length) {
      alert('Please fill in all fields');
      return;
    }

    const now = new Date();
    const newCatch: Catch = {
      id: Date.now().toString(),
      species: formData.species,
      weight: formData.weight,
      length: formData.length,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      location: 'GPS not available', // TODO: Add geolocation
      date: now.toISOString(),
    };

    setCatches([newCatch, ...catches]);
    setFormData({ species: '', weight: '', length: '' });
    setShowForm(false);
  };

  const handleDeleteCatch = (id: string) => {
    if (confirm('Delete this catch?')) {
      setCatches(catches.filter((c) => c.id !== id));
    }
  };

  // Calculate stats
  const today = new Date().toDateString();
  const todayCatches = catches.filter((c) => new Date(c.date).toDateString() === today);
  const totalWeight = catches.reduce((sum, c) => {
    const weight = parseFloat(c.weight);
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekCatches = catches.filter((c) => new Date(c.date) >= oneWeekAgo);

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-3xl font-bold text-blue-400">{todayCatches.length}</p>
          <p className="text-sm text-slate-400">Today</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-3xl font-bold text-green-400">{totalWeight.toFixed(0)}</p>
          <p className="text-sm text-slate-400">lbs Total</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-3xl font-bold text-purple-400">{weekCatches.length}</p>
          <p className="text-sm text-slate-400">This Week</p>
        </div>
      </div>

      {/* Add Catch Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Log New Catch
      </button>

      {/* Quick Log Form */}
      {showForm && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Species (e.g., Mahi-Mahi)"
            value={formData.species}
            onChange={(e) => setFormData({ ...formData, species: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Weight (lbs)"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400"
            />
            <input
              type="number"
              placeholder="Length (in)"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCatch}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-semibold"
            >
              Save Catch
            </button>
          </div>
        </div>
      )}

      {/* Catch List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">
          {catches.length === 0 ? 'No Catches Yet' : 'Recent Catches'}
        </h2>
        {catches.length === 0 && (
          <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
            <Fish size={48} className="mx-auto mb-3 opacity-50" />
            <p>Start logging your catches!</p>
            <p className="text-sm mt-1">Track weight, length, and location</p>
          </div>
        )}
        {catches.map((catchItem) => (
          <div key={catchItem.id} className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Fish size={24} />
                </div>
                <div>
                  <p className="font-semibold text-lg">{catchItem.species}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock size={14} />
                    <span>{catchItem.time}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteCatch(catchItem.id)}
                className="p-2 hover:bg-red-600 rounded-lg text-red-400 hover:text-white transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Ruler size={16} className="text-slate-400" />
                <span className="text-slate-400">Weight:</span>
                <span className="font-semibold">{catchItem.weight} lbs</span>
              </div>
              <div className="flex items-center gap-2">
                <Ruler size={16} className="text-slate-400" />
                <span className="text-slate-400">Length:</span>
                <span className="font-semibold">{catchItem.length} in</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin size={14} />
                <span>{catchItem.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
