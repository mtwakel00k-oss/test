import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const isDev = process.env.NODE_ENV === "development"

const PUBLIC_PREFIXES = ["/login", "/_next", "/favicon.ico", "/api/auth", "/order"]
const PROTECTED_ROUTES = new Set(["/admin", "/pos", "/kitchen"])

function addSecurityHeaders(res: NextResponse) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.supabase.co",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org",
    "upgrade-insecure-requests",
  ].join("; ")

  res.headers.set("Content-Security-Policy", csp)
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("Permissions-Policy", "geolocation=(self), camera=(), microphone=(), browsing-topics=()")
  res.headers.set("X-Robots-Tag", "noindex, nofollow")
}

const MAX_BODY_SIZE = 2 * 1024 * 1024

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Request size limit
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentLength = request.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large (max 2MB)" }, { status: 413 })
    }
  }

  // Allow public paths
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next()
    addSecurityHeaders(res)
    return res
  }

  // Allow API routes (auth is handled per-route)
  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next()
    addSecurityHeaders(res)
    return res
  }

  const hasSession = request.cookies.has("session")

  const parts = pathname.split("/").filter(Boolean)
  const firstSegment = parts[0] || ""

  const knownTopPages = new Set(["admin", "pos", "kitchen", "order", "login"])
  const isTenantRoute = parts.length >= 2 && !knownTopPages.has(firstSegment)

  if (isTenantRoute) {
    const slug = firstSegment
    const page = parts[1]

    if (page === "menu" || page === "login" || page === "order" || page === "driver") {
      const res = NextResponse.next()
      addSecurityHeaders(res)
      return res
    }

    if (!hasSession) {
      return NextResponse.redirect(new URL(`/${slug}/login?redirect=${pathname}`, request.url))
    }

    const res = NextResponse.next()
    addSecurityHeaders(res)
    return res
  }

  const matchedRoute = Array.from(PROTECTED_ROUTES).find((r) => pathname.startsWith(r))
  if (matchedRoute) {
    if (!hasSession) {
      return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    }
    const res = NextResponse.next()
    addSecurityHeaders(res)
    return res
  }

  const res = NextResponse.next()
  addSecurityHeaders(res)
  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
