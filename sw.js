/* Florence & Rome — offline shell.
   Everything is precached on install, so once the app has been opened one
   time on wifi it never needs a network again.

   The page itself is fetched network-first (so a re-upload shows up on the
   very next open, not the one after), with the cached copy as the fallback.
   Everything else is cache-first, because none of it ever changes without
   the cache name changing too. */
const CACHE = "italy-2026-v3";
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

function keepable(url) {
  try {
    const u = new URL(url);
    return u.origin === location.origin
        || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  } catch (_) { return false; }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // The document: network first, cache as the safety net.
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req).then(hit => hit || caches.match("./index.html"))
      )
    );
    return;
  }

  // Everything else: cache first.
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (keepable(req.url) && res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => new Response("", { status: 504, statusText: "offline" }));
    })
  );
});
