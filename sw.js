// MochiBoo service worker: works offline, updates itself quietly.
const VERSION = 'mochiboo-v1';
const CORE = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'js/app.js', 'js/core.js', 'js/ui.js', 'js/content.js', 'js/cycle.js', 'js/bloop.js', 'js/us.js', 'js/me.js', 'js/ai.js', 'vendor/jsQR.js', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // never cache the relay or AI APIs
  if (/ntfy\.sh|googleapis\.com\/v1|groq\.com|openrouter\.ai/.test(url.href) && !url.href.includes('fonts.googleapis')) return;
  // fonts: cache-first
  if (url.host.includes('fonts.g')) {
    e.respondWith(caches.open(VERSION + '-fonts').then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // app files: network first (fresh updates), fall back to cache offline
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
