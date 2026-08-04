// Service Worker - Smart TD Monitor
// Cachea únicamente el "app shell" (HTML/CSS/JS/iconos estáticos).
// Los datos en vivo (ntfy.sh SSE y el webhook de MacroDroid) NUNCA se cachean,
// para no servir despachos o estados de zona desactualizados.

const CACHE_NAME = 'smarttd-shell-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Nunca interceptar/cachear tráfico en vivo: ntfy.sh (SSE) ni el webhook de MacroDroid.
    if (
        url.hostname.includes('ntfy.sh') ||
        url.hostname.includes('trigger.macrodroid.com') ||
        event.request.method !== 'GET'
    ) {
        return; // deja pasar la petición directamente a la red
    }

    // Estrategia "cache first, fallback network" solo para el app shell.
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request)
                .then((response) => {
                    // Guarda copia en caché para próximas cargas offline.
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => cached);
        })
    );
});
