const CACHE = "medsb-shell-v2";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(clients.claim()); });
// Network-first for navigations & API, cache fallback for app shell/static assets.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't cache Supabase/tiles
  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(svg|png|ico|css|js|woff2?)$/)) {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { c.put(req, r.clone()); return r; })));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; })
      .catch(async () => (await caches.match(req)) || (await caches.match("/forms")) || (await caches.match("/")) || Response.error()));
  }
});
