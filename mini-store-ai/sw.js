// Mini Store AI 4.0 — офлайн-кэш с проверкой обновлений.
// Файлы приложения берутся из сети с принудительной проверкой (cache:'no-cache'), поэтому Safari не показывает старую версию;
// без интернета используется кэш.
const VERSION = '4.0.0';
const CACHE = 'mini-store-ai-' + VERSION;
const FILES = ['./', './index.html', './style.css', './app.js', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', './manifest.webmanifest',
  ...['iphone-17-pro-max-blue', 'iphone-17-pro-max-orange', 'iphone-15-pro-max', 'iphone-14-pro-max', 'iphone-13-blue', 'iphone-13-pink', 'iphone-xs-max', 'iphone-12', 'iphone-5', 'airpods', 'airpods-pro', 'power-adapter', 'apple-watch-se', 'ipad-air', 'macbook-pro', 'ipad', 'apple-pencil'].map(n => './assets/' + n + '.svg')];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => fetch(f, { cache: 'reload' }).then(r => { if (r.ok) return c.put(f, r); }).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mini-store-ai-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
});
