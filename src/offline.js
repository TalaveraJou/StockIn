// ── IndexedDB offline queue ───────────────────────────────────────────────────
const DB_NAME = 'stockin-offline'
const DB_VERSION = 1
const STORE_QUEUE = 'action-queue'
const STORE_CACHE = 'data-cache'

let db = null

const openDB = () => new Promise((resolve, reject) => {
  if (db) return resolve(db)
  const req = indexedDB.open(DB_NAME, DB_VERSION)
  req.onupgradeneeded = (e) => {
    const d = e.target.result
    if (!d.objectStoreNames.contains(STORE_QUEUE)) {
      d.createObjectStore(STORE_QUEUE, { keyPath: 'id' })
    }
    if (!d.objectStoreNames.contains(STORE_CACHE)) {
      d.createObjectStore(STORE_CACHE, { keyPath: 'key' })
    }
  }
  req.onsuccess = (e) => { db = e.target.result; resolve(db) }
  req.onerror = () => reject(req.error)
})

const txn = (store, mode, fn) =>
  openDB().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode)
    const s = tx.objectStore(store)
    const req = fn(s)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))

// ── Queue operations ──────────────────────────────────────────────────────────
export const addToQueue = (action) => {
  const entry = { id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`, ...action, queuedAt: new Date().toISOString() }
  return txn(STORE_QUEUE, 'readwrite', s => s.add(entry))
}

export const getQueue = () =>
  openDB().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_QUEUE, 'readonly')
    const req = tx.objectStore(STORE_QUEUE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  }))

export const removeFromQueue = (id) =>
  txn(STORE_QUEUE, 'readwrite', s => s.delete(id))

export const clearQueue = () =>
  openDB().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_QUEUE, 'readwrite')
    const req = tx.objectStore(STORE_QUEUE).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))

// ── Data cache operations ─────────────────────────────────────────────────────
export const cacheData = (key, data) =>
  txn(STORE_CACHE, 'readwrite', s => s.put({ key, data, cachedAt: new Date().toISOString() }))

export const getCachedData = (key) =>
  openDB().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_CACHE, 'readonly')
    const req = tx.objectStore(STORE_CACHE).get(key)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => resolve(null)
  }))
