// Offline support. Bump VERSION whenever you deploy changes so phones pick them up.
const VERSION = 'cc-v0.3.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/styles.css', './css/fonts.css',
  './fonts/inter-latin-wght-normal.woff2', './fonts/space-grotesk-latin-wght-normal.woff2', './fonts/jetbrains-mono-latin-wght-normal.woff2',
  './js/app.js', './js/data.js', './js/store.js', './js/engine.js', './js/targets.js', './js/ui.js', './js/sample.js', './js/warmup.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Network first for the app itself so updates show up; fall back to cache offline.
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
