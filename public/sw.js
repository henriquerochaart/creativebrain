/* Minimal service worker: makes the Brain installable as a PWA so it appears in the Android share
   sheet. Network-first; the only cached page is an offline fallback.
   Paths are derived from the registration scope, so this works at the domain root and under a
   base path (/brain) without being rebuilt. */
const SHELL = "brain-shell-v2";
const fallbackUrl = () => new URL("share/setup", self.registration.scope).toString();

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.add(fallbackUrl()).catch(() => undefined)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(fallbackUrl()).then((r) => r || new Response("Offline", { status: 503 }))));
});
