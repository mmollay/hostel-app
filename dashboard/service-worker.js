/**
 * Service Worker für Hostel Hollenthon PWA
 * Ermöglicht Offline-Funktionalität
 */

const CACHE_NAME = "hostel-hollenthon-v13";
const urlsToCache = [
  "/",
  "/index.html",
  "/admin.html",
  "/app.js",
  "/config.js",
  "/i18n.js",
  "/i18n/de.json",
  "/i18n/en.json",
  "/inline-editor.js",
  "/inline-editor.css",
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
  // CRITICAL: Nur GET requests cachen, niemals POST/PUT/DELETE
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Nur lokale Requests cachen, keine externen APIs
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;

  if (!isLocal) {
    // Externe Requests: Direkt durchreichen (kein Cache)
    event.respondWith(fetch(event.request));
    return;
  }

  // Lokale GET-Requests: Network First, Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Nur erfolgreiche Responses cachen
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback auf Cache bei Netzwerkfehler
        return caches.match(event.request);
      }),
  );
});
