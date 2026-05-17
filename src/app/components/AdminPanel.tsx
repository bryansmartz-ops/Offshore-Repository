import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { APP_VERSION } from '../../config/version';
import { Key, UserX, Shield, CheckCircle, XCircle, Clock, RefreshCw, Activity, AlertTriangle } from 'lucide-react';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8db09b0a`;

interface ActivationCode {
  code: string;
  userName: string;
  isActive: boolean;
  deviceId: string | null;
  createdAt: string;
  firstUsed: string | null;
  lastUsed: string | null;
  revokedAt?: string;
}

interface CodeListResponse {
  success: boolean;
  codes: ActivationCode[];
  total: number;
  active: number;
  revoked: number;
  error?: string;
}

interface HotspotLog {
  id: string;
  timestamp: string;
  targetSpecies: string;
  hotspotsCount: number;
  breaksFound: number;
  gridPoints: number;
  top3Locations: Array<{
    name: string;
    lat: string;
    lon: string;
    confidence: number;
  }>;
  dataHash: string;
}

interface HotspotLogsResponse {
  success: boolean;
  logs: HotspotLog[];
  health: {
    hoursSinceUpdate: string;
    updateOverdue: boolean;
    dataStale: boolean;
    totalLogs: number;
  };
  error?: string;
}

export default function AdminPanel() {
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [minVersion, setMinVersion] = useState(APP_VERSION);
  const [hotspotLogs, setHotspotLogs] = useState<HotspotLog[]>([]);
  const [hotspotHealth, setHotspotHealth] = useState<HotspotLogsResponse['health'] | null>(null);

  const handleLogin = async () => {
    if (!adminPassword.trim()) {
      setError('Please enter admin password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/admin/list-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ adminPassword })
      });

      const data: CodeListResponse = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setCodes(data.codes);
        // Load hotspot logs after successful auth
        loadHotspotLogs();
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    }

    setLoading(false);
  };

  const loadCodes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/admin/list-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ adminPassword })
      });

      const data: CodeListResponse = await response.json();

      if (data.success) {
        setCodes(data.codes);
        setSuccess('Codes refreshed');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to load codes');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    }
  };

  const loadHotspotLogs = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/admin/hotspot-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ adminPassword })
      });

      const data: HotspotLogsResponse = await response.json();

      if (data.success) {
        setHotspotLogs(data.logs);
        setHotspotHealth(data.health);
      } else {
        console.error('Failed to load hotspot logs:', data.error);
      }
    } catch (err) {
      console.error('Failed to fetch hotspot logs:', err);
    }

    setLoading(false);
  };

  const createCode = async () => {
    if (!newUserName.trim()) {
      setError('Please enter a user name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/admin/create-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          adminPassword,
          userName: newUserName
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Created code: ${data.code}`);
        setNewUserName('');
        await loadCodes();
      } else {
        setError(data.error || 'Failed to create code');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    }

    setLoading(false);
  };

  const revokeCode = async (code: string) => {
    if (!confirm(`Revoke access for ${code}?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/admin/revoke-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          adminPassword,
          activationCode: code
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Revoked ${code}`);
        await loadCodes();
      } else {
        setError(data.error || 'Failed to revoke code');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    }

    setLoading(false);
  };

  const setMinimumVersion = async () => {
    if (!minVersion.match(/^\d+\.\d+\.\d+$/)) {
      setError('Invalid version format (use x.x.x)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/admin/set-min-version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          adminPassword,
          minVersion
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Minimum version set to ${minVersion}`);
      } else {
        setError(data.error || 'Failed to set minimum version');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    }

    setLoading(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-orange-500" size={32} />
            <h2 className="text-2xl font-bold">Admin Access</h2>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="text-green-500" size={32} />
            <div>
              <h2 className="text-2xl font-bold">Activation Code Manager</h2>
              <p className="text-slate-400 text-sm">Manage app access and versions</p>
            </div>
          </div>
          <button
            onClick={loadCodes}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-400">{codes.length}</div>
            <div className="text-slate-400 text-sm">Total Codes</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">
              {codes.filter(c => c.isActive).length}
            </div>
            <div className="text-slate-400 text-sm">Active</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">
              {codes.filter(c => !c.isActive).length}
            </div>
            <div className="text-slate-400 text-sm">Revoked</div>
          </div>
        </div>

        {/* Create Code */}
        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Key size={18} />
            Create New Activation Code
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createCode()}
              placeholder="User name (e.g., John's Phone)"
              className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={createCode}
              disabled={loading || !newUserName.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Create
            </button>
          </div>
        </div>

        {/* Minimum Version */}
        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <RefreshCw size={18} />
            Minimum App Version (Force Update)
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value)}
              placeholder="0.0.1"
              className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              onClick={setMinimumVersion}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Set Version
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Users below this version will be blocked until they update
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 text-green-200 px-4 py-2 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        {/* Hotspot Update Monitoring */}
        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity size={18} />
              Hotspot Update Monitor
            </h3>
            <button
              onClick={loadHotspotLogs}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded text-sm transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {hotspotHealth && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`rounded-lg p-3 ${
                hotspotHealth.updateOverdue ? 'bg-red-900/50' : 'bg-green-900/50'
              }`}>
                <div className="text-sm text-slate-300 mb-1">Last Update</div>
                <div className="text-xl font-bold">
                  {hotspotHealth.hoursSinceUpdate}h ago
                </div>
                {hotspotHealth.updateOverdue && (
                  <div className="text-xs text-red-300 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Overdue!
                  </div>
                )}
              </div>
              <div className="bg-slate-600 rounded-lg p-3">
                <div className="text-sm text-slate-300 mb-1">Total Logs</div>
                <div className="text-xl font-bold">{hotspotHealth.totalLogs}</div>
              </div>
              <div className={`rounded-lg p-3 ${
                hotspotHealth.dataStale ? 'bg-yellow-900/50' : 'bg-slate-600'
              }`}>
                <div className="text-sm text-slate-300 mb-1">Data Status</div>
                <div className="text-xl font-bold">
                  {hotspotHealth.dataStale ? 'Stale' : 'Fresh'}
                </div>
                {hotspotHealth.dataStale && (
                  <div className="text-xs text-yellow-300 mt-1">
                    Same as previous
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {hotspotLogs.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No hotspot update logs yet
              </div>
            ) : (
              hotspotLogs.map((log, idx) => {
                const isLatest = idx === 0;
                const isDuplicate = idx > 0 && log.dataHash === hotspotLogs[idx - 1]?.dataHash;

                return (
                  <div
                    key={log.id}
                    className={`bg-slate-600 rounded-lg p-3 ${
                      isLatest ? 'border-2 border-green-500' : ''
                    } ${isDuplicate ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-blue-400" />
                          <span className="text-sm font-mono">
                            {new Date(log.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {isLatest && (
                            <span className="bg-green-600 text-xs px-2 py-0.5 rounded">
                              Latest
                            </span>
                          )}
                          {isDuplicate && (
                            <span className="bg-yellow-600 text-xs px-2 py-0.5 rounded">
                              No Change
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Target: {log.targetSpecies}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400">
                          {log.hotspotsCount}
                        </div>
                        <div className="text-xs text-slate-400">hotspots</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-slate-400">Grid:</span>{' '}
                        <span className="font-semibold">{log.gridPoints}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Breaks:</span>{' '}
                        <span className="font-semibold">{log.breaksFound}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Hash:</span>{' '}
                        <span className="font-mono">{log.dataHash.substring(0, 6)}</span>
                      </div>
                    </div>

                    {log.top3Locations.length > 0 && (
                      <div className="text-xs">
                        <div className="text-slate-400 mb-1">Top 3 Locations:</div>
                        <div className="space-y-0.5">
                          {log.top3Locations.map((loc, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-blue-400">#{i + 1}</span>
                              <span className="flex-1 truncate">{loc.name}</span>
                              <span className="text-green-400">{loc.confidence}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Codes List */}
        <div className="space-y-2">
          <h3 className="font-semibold mb-3">Activation Codes</h3>
          {codes.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              No activation codes yet. Create one above.
            </div>
          ) : (
            codes.map((code) => (
              <div
                key={code.code}
                className="bg-slate-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-lg">{code.code}</span>
                    {code.isActive ? (
                      <CheckCircle size={18} className="text-green-400" />
                    ) : (
                      <XCircle size={18} className="text-red-400" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                    <div>
                      <span className="text-slate-400">User:</span> {code.userName}
                    </div>
                    <div>
                      <span className="text-slate-400">Created:</span> {formatDate(code.createdAt)}
                    </div>
                    <div>
                      <span className="text-slate-400">First Used:</span> {formatDate(code.firstUsed)}
                    </div>
                    <div>
                      <span className="text-slate-400">Last Used:</span> {formatDate(code.lastUsed)}
                    </div>
                    {code.deviceId && (
                      <div className="col-span-2">
                        <span className="text-slate-400">Device:</span>{' '}
                        <span className="font-mono text-xs">{code.deviceId.substring(0, 16)}...</span>
                      </div>
                    )}
                  </div>
                </div>
                {code.isActive && (
                  <button
                    onClick={() => revokeCode(code.code)}
                    disabled={loading}
                    className="ml-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <UserX size={16} />
                    Revoke
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
