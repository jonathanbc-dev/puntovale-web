/* Cache con estrategia:
   - Páginas HTML: primero red (versión nueva), cache solo si no hay internet.
   - Archivos estáticos (css/js/iconos): primero cache (rápido), se actualizan solos.
   Cambiar el nombre de CACHE obliga a descartar cachés viejos. */
const CACHE = "puntovale-web-v4";
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
  evento.waitUntil(
    caches.open(CACHE).then(c =>
      /* Uno por uno: si un archivo falla, no impide cachear los demás */
      Promise.allSettled(ARCHIVOS.map(a => c.add(a)))
    )
  );
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
  const peticion = evento.request;

  /* Navegación (HTML): red primero, cache como respaldo sin internet */
  if (peticion.mode === "navigate") {
    evento.respondWith(
      fetch(peticion)
        .then(respuesta => {
          const copia = respuesta.clone();
          caches.open(CACHE).then(c => c.put(peticion, copia));
          return respuesta;
        })
        .catch(() => caches.match(peticion).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  /* Estáticos: cache primero */
  evento.respondWith(
    caches.match(peticion).then(cached => cached || fetch(peticion))
  );
});
