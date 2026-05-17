import { useServiceWorkerUpdate } from '../../hooks/useServiceWorkerUpdate';
import { RefreshCw } from 'lucide-react';

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-lg z-50">
      <div className="flex items-center gap-2">
        <RefreshCw size={20} className="animate-spin" />
        <span className="font-medium">New version available!</span>
      </div>
      <button
        onClick={applyUpdate}
        className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
      >
        Update Now
      </button>
    </div>
  );
}