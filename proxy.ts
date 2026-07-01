import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decryptSession } from "@/lib/session-crypto"

// CSRF protection: The `session` cookie is set with `sameSite: "lax"`, which
// prevents CSRF from external origins on state-changing POST requests (the
// browser won't include the cookie in cross-origin POSTs that don't originate
// from a top-level navigation). API routes also have rate limiting and session
// auth as additional layers. No explicit CSRF middleware is needed because:
//   - All state-changing endpoints are POST/PATCH/DELETE (no GET mutations)
//   - Rate limiting prevents automated CSRF flooding
//   - SameSite=Lax blocks cross-origin form submissions
// If SameSite is ever relaxed (e.g. for cross-origin API access), add explicit
// CSRF tokens via the double-submit cookie pattern.

const PUBLIC_PREFIXES = ["/login", "/_next", "/favicon.ico", "/api/auth", "/order"]
const PROTECTED_ROUTES = new Set(["/admin", "/pos", "/kitchen"])
const MAX_BODY_SIZE = 2 * 1024 * 1024

const ROLE_REDIRECTS: Record<string, (slug?: string) => string> = {
  cashier: (slug) => slug ? `/${slug}/pos` : "/pos",
  chef: (slug) => slug ? `/${slug}/kitchen` : "/kitchen",
}

function tryParseRole(request: NextRequest): string | null {
  const cookie = request.cookies.get("session")?.value
  if (!cookie) return null
  const decrypted = decryptSession(cookie)
  if (!decrypted) return null
  return decrypted.role || null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isDev = process.env.NODE_ENV === "development"

  // Request size limit
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentLength = request.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large (max 2MB)" }, { status: 413 })
    }
  }

  // Generate nonce for page routes
  const isPage = !pathname.startsWith("/api/") && !pathname.startsWith("/_next/static")
  const nonce = isPage ? Buffer.from(crypto.randomUUID()).toString("base64") : ""

  function addSecurityHeaders(res: NextResponse) {
    if (isPage && nonce) {
      const csp = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data: https://*.supabase.co https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://cdnjs.cloudflare.com",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org",
        "upgrade-insecure-requests",
      ].join("; ")
      res.headers.set("Content-Security-Policy", csp)
    }
    res.headers.set("X-Frame-Options", "DENY")
    res.headers.set("X-Content-Type-Options", "nosniff")
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    res.headers.set("Permissions-Policy", "geolocation=(self), camera=(), microphone=()")
    res.headers.set("X-Robots-Tag", "noindex, nofollow")
  }

  // Build response with nonce header
  function buildResponse(): NextResponse {
    const requestHeaders = new Headers(request.headers)
    if (nonce) requestHeaders.set("x-nonce", nonce)
    requestHeaders.set("x-pathname", pathname)
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    addSecurityHeaders(res)
    return res
  }

  // Allow public paths
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return buildResponse()
  }

  // Allow API routes (auth is handled per-route)
  if (pathname.startsWith("/api/")) {
    return buildResponse()
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
      return buildResponse()
    }

    if (!hasSession) {
      return NextResponse.redirect(new URL(`/${slug}/login?redirect=${pathname}`, request.url))
    }

    // Role-based redirect for admin pages
    if (page === "admin") {
      const role = tryParseRole(request)
      if (role && role in ROLE_REDIRECTS) {
        return NextResponse.redirect(new URL(ROLE_REDIRECTS[role](slug), request.url))
      }
    }

    return buildResponse()
  }

  const matchedRoute = Array.from(PROTECTED_ROUTES).find((r) => pathname.startsWith(r))
  if (matchedRoute) {
    if (!hasSession) {
      return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    }
    // Role-based redirect for top-level admin route
    if (matchedRoute === "/admin") {
      const role = tryParseRole(request)
      if (role && role in ROLE_REDIRECTS) {
        return NextResponse.redirect(new URL(ROLE_REDIRECTS[role](), request.url))
      }
    }
    return buildResponse()
  }

  return buildResponse()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
