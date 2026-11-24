// Service worker: guarda la app en caché para que funcione sin internet.
// IMPORTANTE: sube CACHE_VERSION cada vez que cambies archivos o imágenes.
const CACHE_VERSION = 'ptw-v1.14.0';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/engine.js', 'js/store.js', 'js/audio.js', 'js/icons.js', 'js/calories.js', 'js/progress.js',
  'js/frames.js', 'js/musclemap.js', 'js/health.js', 'js/rig/rig.js', 'js/rig/poses.js', 'js/rig/anim.js',
  'data/catalog.js', 'data/moves2.js', 'data/plans.js', 'data/plans2.js', 'data/anim.js', 'data/arrows.js', 'data/muscles.js',
  'img/cover.webp', 'img/muscle-map.webp',
  'img/equipment/ninguno.webp', 'img/equipment/mat.webp', 'img/equipment/mancuernas.webp', 'img/equipment/kettlebell.webp', 'img/equipment/banda.webp',
  'img/equipment/mini-banda.webp', 'img/equipment/aro.webp', 'img/equipment/silla.webp', 'img/equipment/puerta.webp',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];
// Fotogramas de las animaciones (img/anim/<f|m>/<id>-<k>.webp): 602 imágenes (~10 MB). No se guardan todas al instalar:
//  · al instalar: el núcleo + la miniatura (primera posición) de TODOS los movimientos, de las dos figuras (se calcula con list.json y data/anim.js);
//  · cuando la app abre, avisa con un mensaje {type:'warm', urls} qué más conviene tener (todos los fotogramas de los movimientos de
//    los planes de la usuaria y la segunda posición de cada movimiento, para su figura);
//  · todo lo demás se guarda la primera vez que se ve (caché primero, abajo).
const FRAME_LIST = 'img/anim/list.json';

// data/anim.js es un módulo ES; aquí se lee como texto (los service workers clásicos no pueden importarlo).
async function readAnim() {
  const src = await (await fetch('data/anim.js', { cache: 'no-store' })).text();
  return new Function(src.replace(/export\s+const\s+ANIM\s*=/, 'return '))();
}
async function thumbnailUrls() {
  const [list, ANIM] = await Promise.all([fetch(FRAME_LIST, { cache: 'no-store' }).then(r => r.json()), readAnim()]);
  const have = new Set(list);
  const out = [];
  for (const id of Object.keys(ANIM)) {
    const first = ANIM[id].pos ? ANIM[id].pos[0] : 0;
    for (const model of ['f', 'm']) { const u = `img/anim/${model}/${id}-${first + 1}.webp`; if (have.has(u)) out.push(u); }
  }
  return out;
}
async function warm(cache, urls) {
  const todo = [];
  for (const u of urls) if (!(await cache.match(u))) todo.push(u);
  for (let i = 0; i < todo.length; i += 6) await Promise.all(todo.slice(i, i + 6).map(u => cache.add(u).catch(() => {})));
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(async c => {
    await c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))); // 'reload': nunca desde la caché HTTP (GitHub Pages cachea 10 min)
    try { await c.addAll(await thumbnailUrls()); } catch (err) { /* se guardarán al verlos */ }
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  const d = e.data;
  if (d && d.type === 'warm' && Array.isArray(d.urls)) e.waitUntil(caches.open(CACHE_VERSION).then(c => warm(c, d.urls.filter(u => typeof u === 'string' && u.startsWith('img/anim/')))));
});
// Páginas (index.html y «./»): primero la red (siempre la versión nueva), con la caché solo sin conexión.
// Lo demás: primero caché (rápido y offline) y se revalida en segundo plano sin pasar por la caché HTTP.
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (isPage) {
    e.respondWith(caches.open(CACHE_VERSION).then(async cache => {
      try {
        const r = await fetch(req.url, { cache: 'no-store' });
        if (r.ok) { cache.put('index.html', r.clone()); cache.put('./', r.clone()); }
        return r;
      } catch (err) {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('index.html')) || Response.error();
      }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE_VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
