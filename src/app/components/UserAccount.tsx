import { User, LogOut, LogIn, Cloud, CloudOff } from 'lucide-react';

interface UserAccountProps {
  user: { email: string; name: string } | null;
  isSyncing: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export default function UserAccount({ user, isSyncing, onSignIn, onSignOut }: UserAccountProps) {
  if (!user) {
    // Not signed in
    return (
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <User className="text-slate-400" size={24} />
          <div>
            <h2 className="font-semibold text-lg">Account</h2>
            <p className="text-xs text-slate-400">Sign in to sync across devices</p>
          </div>
        </div>

        <button
          onClick={onSignIn}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <LogIn size={20} />
          Sign In
        </button>

        <div className="mt-3 bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-300 mb-2 font-semibold">Benefits of signing in:</p>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Sync settings across all devices</li>
            <li>• Cloud backup of catch logs</li>
            <li>• Never lose your preferences</li>
          </ul>
        </div>
      </div>
    );
  }

  // Signed in
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <User size={20} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">{user.name || 'User'}</h2>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
      </div>

      {/* Sync status */}
      <div className={`rounded-lg p-3 mb-3 ${isSyncing ? 'bg-blue-900/30 border border-blue-600' : 'bg-green-900/30 border border-green-600'}`}>
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <>
              <Cloud className="text-blue-400 animate-pulse" size={16} />
              <p className="text-sm text-blue-200">Syncing to cloud...</p>
            </>
          ) : (
            <>
              <Cloud className="text-green-400" size={16} />
              <p className="text-sm text-green-200">All data synced</p>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onSignOut}
        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut size={20} />
        Sign Out
      </button>
    </div>
  );
}
