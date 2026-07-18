// Bump this string on every deploy — it's the only thing that makes the
// "update available" prompt fire. Same content with the same name here means
// clients never hear about the change.
const CACHE_NAME = 'stagebook-v6';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './notice.json',
  './kaaktaal-badge-192.png',
  './kaaktaal-badge-512.png',
  './kaaktaal-apple-touch-icon.png',
  './kaaktaal-favicon.png',
  './kaaktaal-wordmark.png',
  './kaaktaal-crow-mark.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first: the app must keep working with zero connectivity on stage.
// Anything fetched successfully over the network is stashed for next time too.
// Exception: notice.json is network-first (falling back to cache) — it's the
// band-notice banner, which must pick up edits without a full redeploy.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('/notice.json')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// The page asks a waiting worker to take over immediately once the person
// taps "Refresh" on the update banner, instead of waiting for every tab to close.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
