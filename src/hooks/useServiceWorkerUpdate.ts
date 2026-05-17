import { useEffect, useState } from 'react';
import { Workbox } from 'workbox-window';

export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [wb, setWb] = useState<Workbox | null>(null);

  useEffect(() => {
    // Check if service workers are supported
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      const workbox = new Workbox('/sw.js');

      // Listen for update found
      workbox.addEventListener('waiting', () => {
        console.log('Service Worker update available');
        setUpdateAvailable(true);
      });

      // Listen for controlling
      workbox.addEventListener('controlling', () => {
        console.log('Service Worker controlling, reloading page');
        window.location.reload();
      });

      // Register the service worker
      workbox.register().then(() => {
        console.log('Service Worker registered');
      });

      setWb(workbox);

      // Check for updates on visibility change (when user returns to tab)
      const handleVisibilityChange = () => {
        if (!document.hidden && workbox) {
          console.log('Page visible, checking for updates');
          workbox.update();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Check for updates on focus
      const handleFocus = () => {
        if (workbox) {
          console.log('Window focused, checking for updates');
          workbox.update();
        }
      };

      window.addEventListener('focus', handleFocus);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, []);

  const applyUpdate = () => {
    if (wb) {
      // Tell the service worker to skip waiting and become active
      wb.messageSkipWaiting();
    }
  };

  return { updateAvailable, applyUpdate };
}