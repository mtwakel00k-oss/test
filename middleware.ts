import { NextResponse, type NextRequest } from "next/server"
import { decryptSession, encryptSession } from "@/lib/session-crypto"
import { logger } from "@/lib/logger"

const PUBLIC_PATHS = new Set(["/login", "/_next", "/api/auth/login", "/api/auth/logout", "/api/auth/setup-root"])
const SESSION_COOKIE = "session"
const SECURE = process.env.NODE_ENV === "production"

function isPublic(path: string): boolean {
  if (path.startsWith("/api/orders/") && path.endsWith("/tracking-access")) return true
  if (PUBLIC_PATHS.has(path)) return true
  for (const p of PUBLIC_PATHS) {
    if (path.startsWith(p)) return true
  }
  return false
}

function getSlugFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean)
  if (parts.length >= 2 && !parts[0].includes(".") && !["api", "_next", "login"].includes(parts[0])) {
    return parts[0]
  }
  return ""
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const rawCookie = request.cookies.get(SESSION_COOKIE)?.value
  let session = rawCookie ? decryptSession(rawCookie) : null

  // If session cookie is unencrypted (old format), keep it for backward compat but re-encrypt on response
  if (!session && rawCookie) {
    try {
      session = JSON.parse(decodeURIComponent(rawCookie))
    } catch {}
  }

  const response = NextResponse.next()

  // Encrypt session cookie if it was plaintext
  if (session && rawCookie && !rawCookie.startsWith("ey")) {
    const encrypted = encryptSession(session)
    response.cookies.set(SESSION_COOKIE, encrypted, {
      httpOnly: true,
      secure: SECURE,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
  }

  // Skip auth checks for public paths
  if (isPublic(pathname)) return response

  // Verify slug matches session
  const pathSlug = getSlugFromPath(pathname)
  if (pathSlug && session?.slug && session.slug !== pathSlug && session.role !== "owner") {
    logger.warn("middleware: slug mismatch", { pathSlug, sessionSlug: session.slug })
    const loginUrl = new URL(`/${pathSlug}/login`, request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
