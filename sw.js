// ==========================================
// MASTER SERVICE WORKER (Network-First Strategy)
// ==========================================

// CRITICAL: Anytime you change index.html, change this version string (e.g., v2.1, v3.0).
// This forces all field phones to instantly delete the old app and download the new one.
const CACHE_VERSION = 'v2.0-rpc-engine'; 
const CACHE_NAME = `paveops-cache-${CACHE_VERSION}`;

// Assets to cache immediately on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/stefanutti-logo.png'
];

// 1. INSTALL EVENT (Pre-load the new assets)
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces the new worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching Core Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE EVENT (The Cache Assassin)
// This hunts down the old, broken versions of the app and deletes them permanently.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Terminating Old Cache ->', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open browser tabs instantly
  );
});

// 3. FETCH EVENT (Network-First Strategy)
// Always try Vercel first. If the Site Agent has no cell signal, fall back to Cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If network fetch is successful, clone it to the cache to keep it fresh
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (offline). Serve the cached version.
        return caches.match(event.request);
      })
  );
});
