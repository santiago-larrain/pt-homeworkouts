// Service worker: guarda la app en caché para que funcione sin internet.
// IMPORTANTE: sube CACHE_VERSION cada vez que cambies archivos o imágenes.
const CACHE_VERSION = 'ptw-v1.0.0';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/engine.js', 'js/store.js', 'js/audio.js', 'js/icons.js',
  'data/catalog.js', 'data/plans.js',
  'img/cover.webp', 'img/muscle-map.webp',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];
const MOVE_IDS = ['cat-cow', 'shoulder-circles', 'good-morning', 'glute-bridge-iso', 'goblet-squat', 'b-stance-rdl', 'monster-walk',
  'face-pull', 'floor-press', 'band-external-rotation', 'dead-bug', 'ring-adductor-lift', 'ring-legs-side',
  'doorway-pec', 'child-pose-lateral', 'kneeling-hip-flexor', 'figure-4'];
const ASSETS = CORE.concat(MOVE_IDS.flatMap(id => [`img/moves/${id}-1.webp`, `img/moves/${id}-2.webp`]));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero caché (rápido y offline); en segundo plano actualiza desde la red.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE_VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
