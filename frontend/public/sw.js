// Service Worker v2 — SI-GESIT Kemenag Barito Utara
// Strategi: Stale-While-Revalidate untuk static assets, Network-First untuk navigasi halaman, Bypass untuk /api/ dan /admin/

const CACHE_NAME = 'sigesit-kemenag-v2';

const CRITICAL_ASSETS = [
  '/',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/kemenag.svg',
  '/pengaduan-v2.webp',
  '/manifest.json',
  '/site.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Hanya proses request HTTP GET
  if (event.request.method !== 'GET') return;

  // 2. Bypass ketat untuk API backend, admin portal, analytics, dan Turnstile
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/pusdatin') ||
    url.pathname.startsWith('/admin') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('google-analytics') ||
    url.hostname.includes('googletagmanager') ||
    url.hostname.includes('supabase')
  ) {
    return;
  }

  // 3. Strategi Network-First untuk Navigasi Halaman HTML (agar update konten selalu terbaru)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 4. Strategi Stale-While-Revalidate untuk Aset Statis (CSS, JS, Fonts, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
