// Clariora - Offline Service Worker
// BUILD_ID is rewritten by tools/build_web_dist.py on every build.
const BUILD_ID = 'dev';
const CACHE_NAME = 'comptia-a-plus-' + BUILD_ID;
const MANIFEST_URL = './precache-manifest.json';

// Fallback list used only if precache-manifest.json cannot be fetched
// (e.g. running sw.js straight from the repo without a build step).
const FALLBACK_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './favicon.png',
  './icon.png',
  './css/brand-black-gold.css',
  './exam_data.js',
  './objectives_data.js',
  './study_library.js',
];

const NAV_CACHE_KEY = './index.html';
// Large data scripts that should behave like the app shell (cache-first).
const DATA_SCRIPTS = ['exam_data.js', 'study_library.js'];
// Same-origin static responses larger than this are served but never
// written into the cache (keeps the runtime cache small and predictable).
const MAX_CACHEABLE_BYTES = 3 * 1024 * 1024;

async function getPrecacheUrls() {
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest fetch failed');
    const entries = await res.json();
    return entries.map((e) => e.url);
  } catch (err) {
    console.warn('[sw] precache-manifest.json unavailable, using fallback list:', err);
    return FALLBACK_ASSETS;
  }
}

// True only when this worker replaces one that already controlled the page.
// A first install must never show "A new version is ready".
let replacesPreviousWorker = false;

self.addEventListener('install', (event) => {
  replacesPreviousWorker = !!(self.registration && self.registration.active);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const urls = await getPrecacheUrls();
      await Promise.all(
        urls.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[sw] precache miss for', url, err);
          })
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();

      // Tell already-open pages only when this is a real update, not a first install.
      if (replacesPreviousWorker) {
        const clientsList = await self.clients.matchAll({ type: 'window' });
        for (const client of clientsList) {
          client.postMessage({ type: 'pwa:update-available', buildId: BUILD_ID });
        }
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isDataScript(pathname) {
  return DATA_SCRIPTS.some((name) => pathname.endsWith('/' + name) || pathname.endsWith(name));
}

// Cache key strips ?v= (and any other query string) so a versioned request
// like js/boot-intro.js?v=4.2.9 still hits the precached entry stored at
// "./js/boot-intro.js" by tools/build_web_dist.py.
function cacheKeyFor(request) {
  const url = new URL(request.url);
  return './' + url.pathname.replace(/^\//, '');
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const key = cacheKeyFor(request);
  const cached = await cache.match(key, { ignoreSearch: true });
  if (cached) return cached;
  const network = await fetch(request);
  if (network && network.status === 200) {
    const len = Number(network.headers.get('content-length') || 0);
    if (!len || len <= MAX_CACHEABLE_BYTES) {
      cache.put(key, network.clone());
    }
  }
  return network;
}

async function navigationHandler(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(NAV_CACHE_KEY);

  // Background revalidate regardless of cache hit/miss.
  const revalidate = fetch(request)
    .then((network) => {
      if (network && network.status === 200) {
        cache.put(NAV_CACHE_KEY, network.clone());
      }
      return network;
    })
    .catch(() => null);

  if (cached) {
    revalidate; // fire and forget
    return cached;
  }

  const network = await revalidate;
  if (network) return network;
  return cache.match(NAV_CACHE_KEY);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin requests (YouTube thumbnails, Groq API,
  // Supabase, a remote media base host, CDN scripts, etc). Let the browser
  // handle them directly.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Range requests (audio/video seeking) and anything under /media/ must
  // pass straight through untouched and uncached - large course media
  // (slides, labs, brand video) is never part of the offline shell, and
  // the browser needs real byte-range responses from the network for
  // <video> seeking to work.
  // The landing page under /landing/ is a separate document with its own
  // stylesheet and images. It is not in the precache manifest, so a change
  // to it does not change BUILD_ID; caching it here would leave repeat
  // visitors on a stale copy. Always fetch it from the network.
  if (request.headers.has('range') || url.pathname.includes('/media/') || url.pathname.includes('/landing/')) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    // /landing (no trailing slash) redirects to /landing/ on the host; it
    // must reach the network too, or the cached app shell would answer it.
    if (url.pathname.includes('/landing')) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(navigationHandler(request));
    return;
  }

  if (isDataScript(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Same-origin static assets: cache-first with network fallback.
  event.respondWith(
    cacheFirst(request).catch(() => fetch(request))
  );
});
