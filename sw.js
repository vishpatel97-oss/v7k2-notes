/* Florence & Rome — offline shell.
   Everything the app needs is precached on install, so once it has been
   opened one time on wifi it never needs a network again. */
const CACHE = "italy-2026-v1";
const CORE = [
  "./", "./index.html", "./italy-2026-pocket.pdf", "./manifest.webmanifest",
  "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        try {
          const u = new URL(req.url);
          const keep = u.origin === location.origin
            || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
          if (keep && res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
        } catch (_) {}
        return res;
      }).catch(() => {
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});
