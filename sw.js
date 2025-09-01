// Service Worker بسيط للتخزين المؤقت للأصول الأساسية
const CACHE_NAME = 'bmc-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './assets/css/styles.css',
  './assets/js/app.js',
  './data/units.json',
  './assets/icons/logo-bmc.svg',
  './assets/icons/favicon.ico',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './exam/index.html'
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});
