// sw.js — Service worker de Venta Perfumes (PWA).
// Estrategia: network-first con fallback a caché. Solo intercepta GET del
// mismo origen (nunca las llamadas a Supabase), así los datos siempre van
// a la red y la app abre offline con la última versión cacheada.

const CACHE = "venta-perfumes-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase y otros dominios: directo a red

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cachea la copia buena para uso offline
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            // Navegaciones sin caché → devuelve el shell de la app
            (request.mode === "navigate" ? caches.match("/index.html") : undefined)
        )
      )
  );
});
