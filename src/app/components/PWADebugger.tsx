import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

export default function PWADebugger() {
  const [checks, setChecks] = useState({
    https: false,
    serviceWorker: false,
    manifest: false,
    icons: false,
    standalone: false,
  });
  const [swStatus, setSwStatus] = useState('checking...');
  const [manifestData, setManifestData] = useState<any>(null);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    runChecks();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setInstallPromptAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Install prompt not available yet. Try:\n1. Visit site 2-3 times\n2. Wait 5 minutes between visits\n3. Interact with the page\n4. Use Chrome menu: ⋮ → Install app');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setInstallPromptAvailable(false);
  };

  const runChecks = async () => {
    // Check HTTPS
    const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Check Service Worker
    let swRegistered = false;
    let swActive = false;
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        swRegistered = !!registration;
        swActive = registration?.active?.state === 'activated';

        if (swActive) {
          setSwStatus('✅ Active and running');
        } else if (swRegistered) {
          setSwStatus('⏳ Registered, activating...');
        } else {
          setSwStatus('❌ Not registered');
        }
      } catch (error) {
        setSwStatus('❌ Error: ' + error);
      }
    } else {
      setSwStatus('❌ Not supported');
    }

    // Check Manifest (try both .webmanifest and .json)
    let manifestOk = false;
    try {
      // VitePWA generates .webmanifest file
      let response = await fetch('/manifest.webmanifest');
      if (!response.ok) {
        // Fallback to .json
        response = await fetch('/manifest.json');
      }

      if (response.ok) {
        // Try to parse as JSON regardless of content-type header
        try {
          const data = await response.json();
          // Verify it has required manifest properties
          if (data && (data.name || data.short_name)) {
            setManifestData(data);
            manifestOk = true;
          } else {
            console.error('Manifest parsed but missing required fields');
          }
        } catch (parseError) {
          console.error('Manifest exists but failed to parse as JSON:', parseError);
        }
      }
    } catch (error) {
      console.error('Manifest check failed:', error);
    }

    // Check Icons
    let iconsOk = false;
    try {
      const icon192 = await fetch('/pwa-192x192.png');
      const icon512 = await fetch('/pwa-512x512.png');
      iconsOk = icon192.ok && icon512.ok;
    } catch (error) {
      console.error('Icon check failed:', error);
    }

    setChecks({
      https: isHttps,
      serviceWorker: swActive,
      manifest: manifestOk,
      icons: iconsOk,
      standalone: isStandalone,
    });
  };

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? (
      <CheckCircle className="text-green-400" size={20} />
    ) : (
      <XCircle className="text-red-400" size={20} />
    );
  };

  const allChecksPass = checks.https && checks.serviceWorker && checks.manifest && checks.icons;

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="text-blue-400" size={20} />
          <h3 className="font-semibold">PWA Status</h3>
        </div>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {showDebug ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Quick Status */}
      {!showDebug && (
        <div className={`rounded-lg p-3 ${allChecksPass ? 'bg-green-900/30 border border-green-600' : 'bg-yellow-900/30 border border-yellow-600'}`}>
          {allChecksPass ? (
            <p className="text-green-400 font-semibold">✅ PWA Ready to Install!</p>
          ) : (
            <p className="text-yellow-400 font-semibold">⚠️ PWA Setup Issues Detected</p>
          )}
          <p className="text-sm text-slate-300 mt-1">
            {installPromptAvailable ? 'Install prompt available' : 'Waiting for install prompt...'}
          </p>
          {installPromptAvailable && (
            <button
              onClick={handleInstallClick}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg font-semibold"
            >
              Install App Now
            </button>
          )}
        </div>
      )}

      {/* Detailed Debug */}
      {showDebug && (
        <div className="space-y-2 text-sm">
          <div className="bg-slate-900 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">HTTPS / Secure Context</span>
              <StatusIcon status={checks.https} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Service Worker</span>
              <StatusIcon status={checks.serviceWorker} />
            </div>
            <div className="text-xs text-slate-500 ml-4">{swStatus}</div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Manifest File</span>
              <StatusIcon status={checks.manifest} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Icon Files</span>
              <StatusIcon status={checks.icons} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Install Prompt</span>
              <StatusIcon status={installPromptAvailable} />
            </div>

            {checks.standalone && (
              <div className="mt-2 p-2 bg-green-900/30 rounded">
                <p className="text-green-400 text-xs font-semibold">
                  ✅ Already installed! Running in standalone mode.
                </p>
              </div>
            )}
          </div>

          {/* Manifest Info */}
          {manifestData && (
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="font-semibold mb-2 text-xs">Manifest Details:</p>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Name: {manifestData.name}</div>
                <div>Display: {manifestData.display}</div>
                <div>Icons: {manifestData.icons?.length || 0} defined</div>
              </div>
            </div>
          )}

          {/* Platform Info */}
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="font-semibold mb-2 text-xs">Platform Info:</p>
            <div className="text-xs text-slate-400 space-y-1">
              <div>User Agent: {navigator.userAgent.substring(0, 60)}...</div>
              <div>Protocol: {window.location.protocol}</div>
              <div>Display Mode: {window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}</div>
              <div>SW Ready: {'serviceWorker' in navigator ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Console Check Instructions */}
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="font-semibold mb-2 text-xs">If Install Not Showing:</p>
            <div className="text-xs text-slate-400 space-y-1">
              <div>1. Press F12 to open DevTools</div>
              <div>2. Go to "Application" tab</div>
              <div>3. Click "Manifest" in left sidebar</div>
              <div>4. Look for any errors or warnings</div>
              <div>5. Check "Installability" section</div>
            </div>
          </div>

          {/* Manual Install Instructions */}
          {!installPromptAvailable && allChecksPass && (
            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3">
              <p className="text-blue-400 font-semibold text-xs mb-2">To Install Manually:</p>
              <ul className="text-xs text-blue-200 space-y-1 list-disc list-inside">
                <li>Click Chrome menu (⋮) in top-right corner</li>
                <li>Look for "Install Tactical Offshore..." option</li>
                <li>OR wait for automatic prompt after engaging with site</li>
              </ul>
            </div>
          )}

          {/* Troubleshooting */}
          {!allChecksPass && (
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3">
              <p className="text-yellow-400 font-semibold text-xs mb-2">Troubleshooting Steps:</p>
              <ul className="text-xs text-yellow-200 space-y-1 list-disc list-inside">
                {!checks.https && <li>Must be HTTPS or localhost</li>}
                {!checks.serviceWorker && <li>Hard refresh: Ctrl+Shift+R</li>}
                {!checks.manifest && <li>Check manifest.webmanifest at /manifest.webmanifest</li>}
                {!checks.icons && <li>Check icon files are loading</li>}
              </ul>
            </div>
          )}

          <button
            onClick={runChecks}
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-semibold"
          >
            Re-check Status
          </button>
        </div>
      )}
    </div>
  );
}
