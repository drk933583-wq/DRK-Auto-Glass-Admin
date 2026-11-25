const CACHE_PREFIX = 'drkhaled-admin-';
const VERSION = 'v1';                       
const CACHE = CACHE_PREFIX + VERSION;

const SCOPE_PATH = new URL('./', self.location).pathname;
const STATIC_FILE = /\.(?:css|js|png|jpe?g|svg|webp|ico|woff2?)$/i;

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith(CACHE_PREFIX) && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;
  if (req.mode === 'navigate') return;
  if (!STATIC_FILE.test(url.pathname)) return;
  if (url.pathname === SCOPE_PATH + 'service-worker.js') return;
  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const saved = await cache.match(req);
    if (saved) return saved;
    throw err;
  }
}
