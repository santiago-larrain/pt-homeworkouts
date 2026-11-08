// Service worker: guarda la app en caché para que funcione sin internet.
// IMPORTANTE: sube CACHE_VERSION cada vez que cambies archivos o imágenes.
const CACHE_VERSION = 'ptw-v1.3.0';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/engine.js', 'js/store.js', 'js/audio.js', 'js/icons.js',
  'js/frames.js', 'js/rig/rig.js', 'js/rig/poses.js', 'js/rig/anim.js',
  'data/catalog.js', 'data/plans.js', 'data/anim.js',
  'img/cover.webp', 'img/muscle-map.webp',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];
// Fotogramas de las animaciones (img/anim/<f|m>/…): la lista la genera project/tools/build_anim.py.
// Las ilustraciones antiguas de img/moves ya no se usan en la app; quedan como referencia.
const FRAME_LIST = 'img/anim/list.json';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(async c => {
    await c.addAll(CORE);
    try { const list = await (await fetch(FRAME_LIST, { cache: 'no-store' })).json(); await c.addAll(list); } catch (err) { /* se guardarán al verlos */ }
  }).then(() => self.skipWaiting()));
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
