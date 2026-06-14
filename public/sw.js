const CACHE = "restoos-v1"
const POS_ROUTES = ["/pos", "/kitchen"]
const API_ROUTES = "/api/"
const STATIC_EXT = [".js", ".css", ".woff", ".woff2", ".ttf", ".svg", ".png", ".jpg", ".webp"]

self.addEventListener("install", (e) => {
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
  )
})

self.addEventListener("fetch", (e) => {
  const { pathname } = new URL(e.request.url)

  if (STATIC_EXT.some((ext) => pathname.endsWith(ext))) {
    e.respondWith(cacheFirst(e.request))
    return
  }

  if (POS_ROUTES.some((r) => pathname.startsWith(r))) {
    e.respondWith(networkFirst(e.request, `/offline`))
    return
  }

  if (pathname.startsWith(API_ROUTES)) {
    e.respondWith(networkFirst(e.request))
    return
  }

  e.respondWith(networkFirst(e.request))
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((c) => c.put(req, clone))
    }
    return res
  } catch {
    return caches.match(req)
  }
}

async function networkFirst(req, fallbackUrl) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((c) => c.put(req, clone))
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl)
      if (fallback) return fallback
    }
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}
