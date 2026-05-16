import { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode or installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInStandaloneMode = (window.navigator as any).standalone === true;

    if (isStandalone || isInStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual instructions if prompt not available
      showManualInstructions();
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstalled(true);
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const showManualInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let message = 'To install this app:\n\n';

    if (isIOS) {
      message += '1. Tap the Share button (square with arrow)\n';
      message += '2. Scroll down and tap "Add to Home Screen"\n';
      message += '3. Tap "Add" in the top right';
    } else if (isAndroid) {
      message += '1. Tap the menu button (⋮) in the top right\n';
      message += '2. Tap "Install app" or "Add to Home screen"\n';
      message += '3. Tap "Install"';
    } else {
      message += '1. Click the install icon in the address bar\n';
      message += '2. Or use your browser\'s menu to install this app';
    }

    alert(message);
  };

  if (isInstalled) {
    return (
      <div className="bg-green-900/30 border border-green-600 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-green-400" />
          <div>
            <p className="font-semibold text-green-400">App Installed!</p>
            <p className="text-sm text-green-300">
              You're running the installed version
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <Smartphone className="text-blue-400" size={24} />
        <div>
          <h3 className="font-semibold">Install App</h3>
          <p className="text-sm text-slate-400">Add to home screen for offline use</p>
        </div>
      </div>

      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
      >
        {isInstalling ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Installing...
          </>
        ) : (
          <>
            <Download size={20} />
            {deferredPrompt ? 'Install Now' : 'Install Instructions'}
          </>
        )}
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400 text-center">
        <div>
          <div className="mb-1">✓</div>
          <div>Works Offline</div>
        </div>
        <div>
          <div className="mb-1">✓</div>
          <div>GPS Access</div>
        </div>
        <div>
          <div className="mb-1">✓</div>
          <div>Fast Loading</div>
        </div>
      </div>

      {!deferredPrompt && (
        <p className="text-xs text-slate-500 mt-3 text-center">
          Note: Install prompt may take a few moments to appear
        </p>
      )}
    </div>
  );
}
