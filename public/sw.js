/* VSLA UG offline service worker.
 *
 * The app is used on cheap Androids with no data bundle, so "offline" has to
 * be true, not hopeful:
 *  - navigations: network-first (a new deploy is picked up when there is
 *    signal) with the cached shell as the offline fallback;
 *  - hashed build assets + fonts: cache-first (they never change under the
 *    same name) and refreshed in the background;
 *  - /api/* is never cached — the ledger truth is the server or localStorage;
 *  - a request that is neither online nor cached gets a real offline page
 *    instead of a silent browser error, because users cannot debug a console.
 */
const CACHE = 'vsla-ug-v2';
const SHELL = ['/app', '/app/', '/manifest.webmanifest', '/icon.svg', '/fonts/material-symbols.woff2'];

const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VSLA UG — offline</title>
<style>body{font-family:system-ui,sans-serif;background:#F6F7F6;color:#141b2b;margin:0;padding:24px}
h1{font-size:20px}p{font-size:15px;line-height:1.5}</style></head>
<body><h1>You are offline</h1>
<p>Open the app again when you have signal. Anything already saved on this phone is safe.</p>
</body></html>`;

const isAsset = (pathname) =>
  pathname.startsWith('/assets/') ||
  pathname.startsWith('/fonts/') ||
  pathname === '/icon.svg' ||
  pathname === '/manifest.webmanifest';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // One bad entry must not abort the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const putInCache = (request, response) => {
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
};

const offlineResponse = () =>
  new Response(OFFLINE_HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

const shellFromCache = () =>
  caches.match('/app').then((hit) => hit || caches.match('/app/')).then((hit) => hit || offlineResponse());

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache the API: the ledger is server + localStorage, not the SW.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.method !== 'GET') return;

  // Page loads: try the network so a fresh deploy wins, fall back offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          putInCache(event.request, res);
          putInCache('/app', res.clone());
          return res;
        })
        .catch(() => shellFromCache())
    );
    return;
  }

  // Hashed assets: serve from cache first, refresh in the background.
  if (isAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((hit) => {
        const fresh = fetch(event.request)
          .then((res) => {
            putInCache(event.request, res);
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      })
    );
    return;
  }

  // Anything else: cache-first with a network refresh, never a silent failure.
  event.respondWith(
    caches.match(event.request).then((hit) => {
      const fresh = fetch(event.request)
        .then((res) => {
          putInCache(event.request, res);
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
