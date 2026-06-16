import fs from "fs"
import path from "path"
import { logger } from "@/lib/logger"

const STORE_PATH = path.join(process.cwd(), ".images.json")
let cache: Record<string, string> | null = null
let dirty = false

function key(tenantSlug: string, productId: number): string {
  return `${tenantSlug}:${productId}`
}

function load(): Record<string, string> {
  if (cache) return cache
  try {
    if (fs.existsSync(STORE_PATH)) {
      cache = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    }
  } catch (e) {
    logger.error("Failed to load image store", e)
  }
  cache = cache || {}
  return cache
}

function persist(): void {
  if (!dirty || !cache) return
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(cache, null, 2))
    dirty = false
  } catch (e) {
    logger.error("Failed to persist image store", e)
  }
}

export function getImageUrl(tenantSlug: string, productId: number): string | null {
  return load()[key(tenantSlug, productId)] || null
}

export function getAllImageUrls(tenantSlug: string): Record<number, string> {
  const store = load()
  const prefix = `${tenantSlug}:`
  const result: Record<number, string> = {}
  for (const [k, v] of Object.entries(store)) {
    if (k.startsWith(prefix)) {
      const id = Number(k.slice(prefix.length))
      if (!isNaN(id)) result[id] = v
    }
  }
  return result
}

export function setImageUrl(tenantSlug: string, productId: number, url: string | null): void {
  const store = load()
  const k = key(tenantSlug, productId)
  if (url) {
    store[k] = url
  } else {
    delete store[k]
  }
  dirty = true
  persist()
}

export function deleteImageUrl(tenantSlug: string, productId: number): void {
  const store = load()
  delete store[key(tenantSlug, productId)]
  dirty = true
  persist()
}

export function resetImageStore(): void {
  cache = {}
  dirty = true
  persist()
}
