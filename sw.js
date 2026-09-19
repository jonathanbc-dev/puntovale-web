/* Cache mínimo para uso sin internet una vez cargada la app. */
const CACHE = "puntovale-web-v1";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icono.svg",
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
];

self.addEventListener("install", evento => {
  evento.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys().then(claves =>
      Promise.all(claves.filter(c => c !== CACHE).map(c => caches.delete(c))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", evento => {
  evento.respondWith(
    caches.match(evento.request).then(cached => cached || fetch(evento.request))
  );
});
