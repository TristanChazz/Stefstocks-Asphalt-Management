// ==========================================
// MASTER SERVICE WORKER: PAVEOPS ENGINE
// ==========================================

// CRITICAL: Anytime you change index.html, change this version string (e.g., v2.3, v2.4).
// This forces all field phones to instantly delete the old app and download the new one.
const CACHE_VERSION = 'v3.0-stefstocks-coastal'; 
const CACHE_NAME = `paveops-cache-${CACHE_VERSION}`;

// Assets to cache immediately on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/client-logo.png' // Ensure this file exists in your directory, or remove this line
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
            console.log('Service Worker: Clearing Old Cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open browser tabs instantly
  );
});

// 3. FETCH EVENT (Hardened Network-First Strategy)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // ---------------------------------------------------------
  // EXCLUSION ZONE: BYPASS SUPABASE API CALLS
  // We never cache database requests. IndexedDB handles offline payloads.
  // ---------------------------------------------------------
  if (requestUrl.hostname.includes('supabase.co')) {
    return; // Exits the service worker and lets the network handle it natively
  }

  // ---------------------------------------------------------
  // ASSET ROUTING: CACHE INTERNAL + EXTERNAL CDNs (Tailwind/Fonts)
  // ---------------------------------------------------------
  if (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Allow 'cors' type so Tailwind CDN and Google Fonts are captured
          if (networkResponse && networkResponse.status === 200 && 
             (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch((err) => {
                console.warn('Cache write failed:', err);
              });
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed (offline). Serve the cached UI, CSS, and Fonts.
          return caches.match(event.request);
        })
    );
  }
});
