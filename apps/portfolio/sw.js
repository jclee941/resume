// Service Worker for PWA offline support
// Version: 1.0.0

/**
 * @typedef {Window & typeof globalThis & {
 *   skipWaiting(): Promise<void>;
 *   clients: { claim(): Promise<void> };
 *   registration: ServiceWorkerRegistration;
 * }} ServiceWorkerGlobal
 */

/**
 * @typedef {Event & { waitUntil(f: Promise<unknown>): void }} ExtendableEvent
 * @typedef {Event & { request: Request, respondWith(r: Response | Promise<Response>): void }} FetchEvent
 * @typedef {Event & { tag: string }} SyncEvent
 * @typedef {Event & { data?: { text(): string, json(): unknown } | null }} PushEvent
 */

const CACHE_NAME = 'resume-pwa-v1';
const RUNTIME_CACHE = 'resume-runtime-v1';

// Resources to cache on install (no HTML — HTML carries per-response CSP nonce).
// Manifests are cached for offline PWA install support; HTML is fetched fresh.
const PRECACHE_URLS = [
  '/manifest.json',
  '/manifest_en.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  /** @type {ExtendableEvent} */ (event).waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching core resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => /** @type {ServiceWorkerGlobal} */ (self).skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  /** @type {ExtendableEvent} */ (event).waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => /** @type {ServiceWorkerGlobal} */ (self).clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = /** @type {FetchEvent} */ (event);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) return;

  // Network-first strategy for HTML
  // Network-only for HTML — never cache HTML responses because they carry per-response
  // CSP nonces. Caching would create stale nonce mismatches that block inline scripts.
  if ((request.headers.get('accept') || '').includes('text/html')) {
    /** @type {FetchEvent} */ (event).respondWith(
      fetch(request).catch(
        () =>
          new Response('Offline - please check your connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' }),
          })
      )
    );
    return;
  }

  // Cache-first strategy for assets (fonts, images)
  if (
    request.url.includes('fonts.googleapis.com') ||
    request.url.includes('fonts.gstatic.com') ||
    request.url.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/i)
  ) {
    /** @type {FetchEvent} */ (event).respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // Network-only for API calls and external resources
  /** @type {FetchEvent} */ (event).respondWith(fetch(request));
});

// Background sync for Web Vitals (future enhancement)
self.addEventListener('sync', (event) => {
  if (/** @type {SyncEvent} */ (event).tag === 'sync-vitals') {
    console.log('[SW] Background sync: vitals');
    // Implementation for queued vitals data
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  const options = {
    body: /** @type {PushEvent} */ (event).data
      ? /** @type {NonNullable<PushEvent['data']>} */ (/** @type {PushEvent} */ (event).data).text()
      : 'New update available',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
  };

  /** @type {ExtendableEvent} */ (event).waitUntil(
    /** @type {ServiceWorkerGlobal} */ (self).registration.showNotification(
      'Resume Portfolio',
      options
    )
  );
});
