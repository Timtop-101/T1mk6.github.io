// Офлайн-кэш сайта. Стратегия: сначала из кэша, в фоне обновляем (stale-while-revalidate).
// При изменении файлов сайта поднимите номер в CACHE, чтобы старый кэш удалился.
var CACHE = 'arduino-control-v1';
var FILES = [
  'index.html', 'uno.html', 'motor.html', 'start.html', 'update.html', 'about.html',
  'nav.js', 'demo-serial.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-180.png',
  'schemes/A000066-full-pinout.pdf',
  'arduino_control/arduino_control.ino',
  'arduino_control/Arduino_Motor_Bridge_DHT11_TEST_FIX.ino'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll падает целиком, если один файл не найден, поэтому кладём по одному
      return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      // ?demo=1 и якоря не должны ломать офлайн: ищем без параметров
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var key = req.url.split('?')[0] === req.url ? req : new Request(req.url.split('?')[0]);
            cache.put(key, res.clone()).catch(function () {});
          }
          return res;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
