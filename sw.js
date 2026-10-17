/* Cafe Tabs service worker: opens instantly and works offline.
   Pages load from the saved copy first, then refresh it in the background,
   so a new version of the app shows up the next time you open it. */
const CACHE = "cafetabs-v2";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {}))))
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
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;   // live sync and other sites go straight to the network
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(r, { ignoreSearch: true }) || (r.mode === "navigate" ? await c.match("index.html") : undefined);
      const net = fetch(r).then(res => {
        if (res && res.ok) c.put(r, res.clone());
        return res;
      }).catch(() => undefined);
      return hit || (await net) || new Response("Offline", { status: 503, statusText: "Offline" });
    })
  );
});
