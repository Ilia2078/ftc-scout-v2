// GitHub Pages app shell only; offline submissions live in IndexedDB/localStorage.
// Never intercept/cache requests to Google Apps Script.
const CACHE = 'ftc-scout-shell-v7-20261026';
const CORE = [
  './', './index.html', './style.css', './app.js', './api.js',
  './storage.js', './queue.js', './counter-rules.js', './config.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
];
const SCOPE = new URL('./', self.location.href);
const NETWORK_FIRST = new Set(['index.html', 'app.js', 'api.js', 'config.js']);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('ftc-scout-') && key !== CACHE)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', copy)).catch(() => {}));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  const path = url.pathname.slice(SCOPE.pathname.length);
  if (NETWORK_FIRST.has(path)) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {}));
        }
        return response;
      }).catch(() => caches.match(request))
    );
  } else {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {}));
        }
        return response;
      }))
    );
  }
});
