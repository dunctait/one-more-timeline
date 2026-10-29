// Network-first service worker: try for the newest game, but never make a returning player wait on
// a slow connection. After a short timeout a cached copy is used; with no cached copy (a first
// visit) the real request is simply allowed to finish.
const CACHE = 'omt-shell-v4';
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function store(event, request, response) {
  if (!response.ok) return;
  const copy = response.clone();
  // Keep the worker alive until the copy is stored, or offline play can fail on the first visit.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
}

async function respond(event) {
  const request = event.request;
  const network = fetch(request);
  const timedOut = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));
  try {
    const first = await Promise.race([network, timedOut]);
    if (first) {
      store(event, request, first);
      return first;
    }
    // Slow network: prefer what we already have, and refresh the cache when the request lands.
    const cached = await caches.match(request);
    if (cached) {
      network.then((response) => store(event, request, response)).catch(() => undefined);
      return cached;
    }
    // Nothing cached (first visit): wait for the real response rather than failing it.
    const late = await network;
    store(event, request, late);
    return late;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Only a page navigation may fall back to the app shell; never hand HTML to a script request.
    if (request.mode === 'navigate') {
      const shell = (await caches.match('./index.html')) || (await caches.match('./'));
      if (shell) return shell;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(event));
});
