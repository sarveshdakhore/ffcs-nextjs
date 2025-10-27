'use client';

import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[Service Worker] Not supported in this browser');
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[Service Worker] Registered successfully:', registration);

        // Check for updates periodically (every 60 seconds)
        setInterval(() => {
          registration.update();
        }, 60000);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[Service Worker] Update found, installing new worker...');

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[Service Worker] New version installed, ready to activate');
                // New service worker is ready, it will send UPDATE_AVAILABLE message
              }
            });
          }
        });

        // Handle controlling service worker change
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          console.log('[Service Worker] Controller changed, reloading page...');
        });

      } catch (error) {
        console.error('[Service Worker] Registration failed:', error);
      }
    };

    registerServiceWorker();

    // Cleanup function
    return () => {
      // No cleanup needed for service worker
    };
  }, []);
}
