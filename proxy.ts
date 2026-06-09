import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAllowedRolesForRoute, extractSlug } from '@/lib/auth-server'

const isDev = process.env.NODE_ENV === 'development'

function addSecurityHeaders(res: NextResponse, nonce: string) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' blob: data: https://*.supabase.co",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org",
    "upgrade-insecure-requests",
  ].join('; ')

  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(), browsing-topics=()')
}

interface Session {
  slug?: string
  role?: string
}

const PUBLIC_PREFIXES = ["/login", "/_next", "/favicon.ico", "/api/auth", "/order"]
const PROTECTED_ROUTES = new Set(["admin", "pos", "kitchen"])

function parseSession(cookie?: string): Session | null {
  if (!cookie) return null
  try {
    return JSON.parse(cookie)
  } catch {
    return null
  }
}

function loginUrl(request: NextRequest, pathname: string): URL {
  const slug = extractSlug(pathname)
  const base = slug ? `/${slug}/login` : "/login"
  const url = new URL(base, request.url)
  url.searchParams.set("redirect", pathname)
  return url
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  function securedNext() {
    const reqH = new Headers(request.headers)
    reqH.set('x-nonce', nonce)
    const res = NextResponse.next({ request: { headers: reqH } })
    addSecurityHeaders(res, nonce)
    return res
  }

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return securedNext()
  }

  if (pathname.startsWith("/api/")) {
    return securedNext()
  }

  const session = parseSession(request.cookies.get("session")?.value)
  const parts = pathname.split("/").filter(Boolean)
  const firstSegment = parts[0] || ""

  const knownTopPages = new Set(["admin", "pos", "kitchen", "order", "login"])

  const isTenantRoute = parts.length >= 2 && !knownTopPages.has(firstSegment) && !firstSegment.includes(".")

  if (isTenantRoute) {
    const urlSlug = firstSegment
    const page = parts[1]

    if (page === "menu" || page === "login" || page === "order") {
      return securedNext()
    }

    if (!session) {
      return NextResponse.redirect(new URL(`/${urlSlug}/login`, request.url))
    }

    if (session.slug && session.slug !== urlSlug) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const allowedRoles = getAllowedRolesForRoute(pathname)
    if (allowedRoles && (!session.role || !allowedRoles.includes(session.role))) {
      return NextResponse.redirect(loginUrl(request, pathname))
    }

    return securedNext()
  }

  if (PROTECTED_ROUTES.has(firstSegment)) {
    if (!session) {
      return NextResponse.redirect(loginUrl(request, pathname))
    }
    if (session.slug) {
      const rest = parts.slice(1).join("/")
      return NextResponse.redirect(new URL(`/${session.slug}/${firstSegment}${rest ? "/" + rest : ""}`, request.url))
    }
    return securedNext()
  }

  const allowedRoles = getAllowedRolesForRoute(pathname)
  if (!allowedRoles) return securedNext()

  if (session) {
    if (session.role && allowedRoles.includes(session.role)) {
      return securedNext()
    }
    return NextResponse.redirect(loginUrl(request, pathname))
  }

  const reqH = new Headers(request.headers)
  reqH.set('x-nonce', nonce)
  const response = NextResponse.next({ request: { headers: reqH } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(loginUrl(request, pathname))
  }

  const role = user.user_metadata?.role as string | undefined
  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.redirect(loginUrl(request, pathname))
  }

  addSecurityHeaders(response, nonce)
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
