// Offline cache. Bump VERSION whenever you change any file: phones then show the "new version" banner.
const VERSION = "planner-v10";
const FILES = ["./", "index.html", "style.css", "app.js", "tools.js", "games-core.js", "game-fps.js", "game-runner.js", "game-space.js", "game-parkour.js", "vault.js", "three.module.js", "three.core.js", "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => e.waitUntil(
  caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
));
// The page tells us when the person taps "Update".
self.addEventListener("message", (e) => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});