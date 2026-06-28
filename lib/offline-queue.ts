"use client"

interface QueuedOrder {
  id: string
  body: unknown
  createdAt: number
  retries: number
  lastError?: string
}

const DB_NAME = "simploo-offline"
const STORE = "orders"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function queueOrder(id: string, body: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE, "readwrite")
  tx.objectStore(STORE).put({ id, body, createdAt: Date.now(), retries: 0 } satisfies QueuedOrder)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueuedOrders(): Promise<QueuedOrder[]> {
  const db = await openDB()
  const tx = db.transaction(STORE, "readonly")
  const req = tx.objectStore(STORE).getAll()
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function removeQueuedOrder(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE, "readwrite")
  tx.objectStore(STORE).delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function retryQueuedOrders(
  submitFn: (order: QueuedOrder) => Promise<boolean>
): Promise<{ success: number; failed: number }> {
  const orders = await getQueuedOrders()
  let success = 0
  for (const order of orders) {
    try {
      const ok = await submitFn(order)
      if (ok) {
        await removeQueuedOrder(order.id)
        success++
      }
    } catch {
      order.retries++
      if (order.retries >= 5) await removeQueuedOrder(order.id)
    }
  }
  return { success, failed: orders.length - success }
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORE, "readonly")
  const req = tx.objectStore(STORE).count()
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(0)
  })
}
