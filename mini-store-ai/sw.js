// Офлайн-кэш Mini Store: сначала кэш, обновление в фоне.
const CACHE = 'mini-store-ai-v3';
const FILES = ['./', './index.html', './style.css', './app.js', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mini-store-ai-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => {
    const net = fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; }).catch(() => hit || caches.match('./index.html'));
    return hit || net;
  }));
});
