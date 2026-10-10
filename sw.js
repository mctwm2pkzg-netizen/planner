/* Service worker di Planner Weekly.
   Strategia: la pagina (index.html) si prova prima in rete, così gli aggiornamenti
   arrivano appena pubblicati; se non c'è rete si usa la copia in cache.
   Icone e manifest: prima cache, poi rete.
   Per forzare un aggiornamento della cache basta cambiare VERSION. */
const VERSION = "pw-2026-10-11-7";
const CORE = ["./", "./index.html", "./manifest.webmanifest?v=2", "./icon-180.png?v=2", "./icon-192.png?v=2", "./icon-512.png?v=2", "./icon-512-maskable.png?v=2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // font di Google: prima cache, poi rete (così gli stili restano uguali anche offline)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
    }).catch(() => hit)));
    return;
  }
  if (url.origin !== location.origin) return; // es. sync cloud: passa diretto

  const isPage = req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
  if (isPage) {
    e.respondWith(
      // cache:"no-store" evita che il browser riusi una vecchia copia HTTP della pagina
      fetch(req.url, { cache: "no-store", credentials: "same-origin" }).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("./index.html", copy)); }
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
      return res;
    }))
  );
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
