import { CheckCircle, Clock } from 'lucide-react';

interface DataSourceCardProps {
  name: string;
  status: string;
  lastUpdate: string;
  quality: number;
}

export default function DataSourceCard({ name, status, lastUpdate, quality }: DataSourceCardProps) {
  return (
    <div className="bg-slate-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{name}</h3>
        {status === 'active' && (
          <CheckCircle size={16} className="text-green-400" />
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
        <Clock size={12} />
        <span>{lastUpdate}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              quality >= 90
                ? 'bg-green-400'
                : quality >= 75
                ? 'bg-yellow-400'
                : 'bg-orange-400'
            }`}
            style={{ width: `${quality}%` }}
          ></div>
        </div>
        <span className="text-xs font-semibold text-slate-300">{quality}%</span>
      </div>
    </div>
  );
}
