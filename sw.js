/* Школа щитовика — офлайн-режим. VERSION и ASSETS обновляет tools/build.py */
const VERSION = '6e52aed5c1';
const CACHE = 'shk-' + VERSION;
const ASSETS = ["./", "index.html", "manifest.webmanifest", "js/ai.js", "js/app.js", "js/c-soft.js", "js/c00.js", "js/c01.js", "js/c02.js", "js/c03.js", "js/c04.js", "js/c05.js", "js/c06a.js", "js/c06b.js", "js/c07.js", "js/c08.js", "js/c09.js", "js/c10.js", "js/c11.js", "js/c12.js", "js/c13.js", "js/c14.js", "js/c15.js", "js/cards.js", "js/control.js", "js/core.js", "js/course-1.js", "js/course-2.js", "js/course-3.js", "js/course-4.js", "js/data-devices.js", "js/data-formulas.js", "js/data-glossary.js", "js/data-norms.js", "js/data-tables.js", "js/ed-core.js", "js/ed-draw.js", "js/ed-lib.js", "js/editor.js", "js/engine.js", "js/exams-data.js", "js/exams.js", "js/field-abbr.js", "js/field-rules.js", "js/field-stages.js", "js/field.js", "js/games.js", "js/gear-data.js", "js/gear.js", "js/photos.js", "js/program.js", "js/projects.js", "js/render-panel.js", "js/rpg.js", "js/svg.js", "js/sync.js", "js/tts.js", "img/1.webp", "img/2.webp", "img/3.webp", "img/4.webp", "img/5.webp", "fonts/ps2p-cyr.woff2", "fonts/ps2p-lat.woff2", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/favicon.svg", "razbory/index.json"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('shk-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // разборы — всегда сначала сеть, чтобы новые ответы Claude приходили сразу
  if (url.pathname.endsWith('/razbory/index.json')) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, copy)); }
      return r;
    }).catch(() => caches.match(url.pathname)));
    return;
  }
  // страница — из кэша текущей версии (обновление приходит новой версией sw.js)
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then((r) => r || fetch(req)).catch(() => fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && r.type === 'basic') { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
