// StockIn Service Worker — offline support
const CACHE_NAME = 'stockin-v1'
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  // Vite will add hashed assets; we cache dynamically
]

// Install: cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Don't intercept non-GET or external API calls (Ágora)
  if (event.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return  // local Express API — always live

  // For Ágora API calls: cache the response so we can serve offline
  const isAgoraCall = url.pathname.includes('/api/export') || url.pathname.includes('/api/import')

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // For navigation requests, serve the app shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
          return new Response(JSON.stringify({ _offline: true, error: 'Sin conexión' }), {
            headers: { 'Content-Type': 'application/json' }
          })
        })
      })
  )
})

// Background sync for offline queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'stockin-sync-queue') {
    event.waitUntil(syncOfflineQueue())
  }
})

async function syncOfflineQueue() {
  const clients = await self.clients.matchAll()
  clients.forEach(client => client.postMessage({ type: 'SW_SYNC_QUEUE' }))
}
