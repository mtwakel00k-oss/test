const CACHE = "restoos-v2"
const STATIC_CACHE = "restoos-static-v2"
const FONT_CACHE = "restoos-fonts-v2"
const API_CACHE = "restoos-api-v2"

const POS_ROUTES = ["/pos", "/kitchen"]
const API_ROUTES = "/api/"
const STATIC_EXT = [".js", ".css", ".woff", ".woff2", ".ttf", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico"]
const PRECACHE_URLS = ["/offline"]

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((k) =>
      Promise.all(k.filter((n) => n !== CACHE && n !== STATIC_CACHE && n !== FONT_CACHE && n !== API_CACHE).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (e) => {
  const { pathname, origin } = new URL(e.request.url)

  if (pathname.endsWith("/sw.js") || pathname.endsWith("/manifest.json")) {
    e.respondWith(networkFirst(e.request))
    return
  }

  if (STATIC_EXT.some((ext) => pathname.endsWith(ext))) {
    e.respondWith(cacheFirst(e.request, STATIC_CACHE))
    return
  }

  if (pathname.startsWith(POS_ROUTES[0]) || pathname.startsWith(POS_ROUTES[1])) {
    e.respondWith(networkFirstOrCache(e.request, "/offline"))
    return
  }

  if (pathname.startsWith(API_ROUTES)) {
    if (e.request.method === "GET") {
      e.respondWith(networkFirstApi(e.request))
    }
    return
  }

  e.respondWith(networkFirstOrCache(e.request, "/offline"))
})

async function cacheFirst(req, cacheName = CACHE) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) {
      const clone = res.clone()
      caches.open(cacheName).then((c) => c.put(req, clone))
    }
    return res
  } catch {
    return new Response("", { status: 408, statusText: "Request timed out" })
  }
}

async function networkFirstOrCache(req, fallbackUrl) {
  const TIMEOUT = 3000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(req, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((c) => c.put(req, clone))
    }
    return res
  } catch {
    clearTimeout(timeoutId)
    const cached = await caches.match(req)
    if (cached) return cached
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl)
      if (fallback) return fallback
    }
    return new Response(JSON.stringify({ offline: true, cached: false }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((c) => c.put(req, clone))
    }
    return res
  } catch {
    const cached = await caches.match(req)
    return cached || new Response("", { status: 503 })
  }
}

async function networkFirstApi(req) {
  const cached = await caches.match(req)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(req, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) {
      const clone = res.clone()
      caches.open(API_CACHE).then((c) => c.put(req, clone))
    }
    return res
  } catch {
    if (cached) return cached
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}
