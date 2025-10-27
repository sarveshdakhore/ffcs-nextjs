#!/usr/bin/env node

/**
 * Generate service worker with unique build version
 * This runs before each build to create a new cache version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get build version from git commit hash or timestamp
function getBuildVersion() {
  try {
    // Try to get git commit hash (short)
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    return gitHash;
  } catch (error) {
    // Fallback to timestamp if git is not available
    return Date.now().toString();
  }
}

const buildVersion = getBuildVersion();
const timestamp = Date.now();

console.log(`[Generate SW] Build version: ${buildVersion}`);
console.log(`[Generate SW] Timestamp: ${timestamp}`);

// Service worker template
const swContent = `// Service Worker for FFCS App
// Auto-generated on: ${new Date().toISOString()}
// Build version: ${buildVersion}
// IMPORTANT: This does NOT affect localStorage or localforage data - those persist through reload

const CACHE_NAME = 'ffcs-cache-${buildVersion}-${timestamp}';
const BUILD_VERSION = '${buildVersion}';
const urlsToCache = [
  '/',
  '/manifest.webmanifest'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', BUILD_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(urlsToCache);
    }).then(() => {
      // Skip waiting to activate new service worker immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', BUILD_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('ffcs-cache-')) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that a new version is available
      console.log('[Service Worker] Notifying clients of update');
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            message: 'A new version is available!',
            version: BUILD_VERSION
          });
        });
      });
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;

// Write to public/sw.js
const outputPath = path.join(__dirname, '..', 'public', 'sw.js');
fs.writeFileSync(outputPath, swContent, 'utf-8');

console.log(`[Generate SW] Generated: ${outputPath}`);
console.log(`[Generate SW] Cache name: ffcs-cache-${buildVersion}-${timestamp}`);
