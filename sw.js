/* Chess Coach service worker — precache everything, serve cache-first for full offline use.
   Bump CACHE when any asset changes to force an update. */
const CACHE = 'chess-coach-v3';

const ASSETS = [
  'index.html',
  'analysis_board.html',
  'vendor/chessground.min.js',
  'vendor/chess.js',
  'vendor/chessground.base.css',
  'vendor/chessground.cburnett.css',
  'vendor/fonts/fonts.css',
  'vendor/fonts/Fraunces-600.woff2',
  'vendor/fonts/Fraunces-700.woff2',
  'vendor/fonts/InstrumentSans-400.woff2',
  'vendor/fonts/InstrumentSans-500.woff2',
  'vendor/fonts/InstrumentSans-600.woff2',
  'vendor/fonts/JetBrainsMono-500.woff2',
  'vendor/fonts/JetBrainsMono-700.woff2',
  'stockfish-18-lite-single.js',
  'stockfish-18-lite-single.wasm',
  'manifest.json',
  'icons/icon.svg'
];

// Precache all local assets on install.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Drop old versioned caches on activate, then take control.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first. The handler ALWAYS resolves to a valid Response — cache hit, network response,
// or a 504 fallback — so a failed/uncached fetch (e.g. offline) can never reject respondWith.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      const cached = await caches.match(req);
      if (cached) return cached;
    } catch (_) { /* fall through to network */ }
    try {
      const res = await fetch(req);
      // runtime-cache successful same-origin GETs so later visits work offline too
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (_) {
      // both cache and network missed — return a valid fallback instead of rejecting
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
