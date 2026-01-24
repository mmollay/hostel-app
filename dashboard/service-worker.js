/**
 * Service Worker für Hostel Hollenthon PWA
 * Ermöglicht Offline-Funktionalität
 */

const CACHE_NAME = "hostel-hollenthon-v4";
const urlsToCache = [
  "/",
  "/index.html",
  "/admin.html",
  "/app.js",
  "/config.js",
  "/logo-neu.png",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/manifest.json",
];

// Installation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache opened");
      return cache.addAll(urlsToCache);
    }),
  );
});

// Aktivierung
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// Fetch - Network First, dann Cache
self.addEventListener("fetch", (event) => {
  // Nur lokale Requests cachen, keine externen APIs
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;

  if (!isLocal || event.request.method !== "GET") {
    // Externe Requests oder nicht-GET: Direkt durchreichen
    event.respondWith(fetch(event.request));
    return;
  }

  // Lokale GET-Requests: Network First, Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      }),
  );
});
