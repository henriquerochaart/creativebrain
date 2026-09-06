/* Minimal service worker: makes the Brain installable as a PWA so it appears in the Android share sheet.
   Network-first; nothing is cached except the app shell fallback for offline opens. */
const SHELL = "brain-shell-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/share/setup"]).catch(() => undefined))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match("/share/setup").then((r) => r || new Response("Offline", { status: 503 }))));
});
