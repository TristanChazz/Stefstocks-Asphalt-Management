const CACHE_NAME = 'ss-coastal-paveops-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './libs/jsqr.min.js',
  './libs/zxing.min.js',
  './assets/stefanutti-logo.png'
];

// Install and Cache Core Assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate & Clean Up Old Caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First Strategy for Cloud Auth & Logging Data
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Bypass application caching completely for live database/auth traffic
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline network state. Database operation unreachable." }), 
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Handle standard static PWA shell asset loading
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
