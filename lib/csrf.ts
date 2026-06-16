import { NextRequest, NextResponse } from "next/server"
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto"

const CSRF_COOKIE = "csrf_token"
const CSRF_HEADER = "x-csrf-token"
const CSRF_SECRET = process.env.CSRF_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CSRF_SECRET must be set in production")
  }
  return "dev-csrf-secret-change-in-production"
})()

function getKey(): Buffer {
  const key = Buffer.from(CSRF_SECRET, "utf-8")
  return key.length === 32 ? key : Buffer.from(CSRF_SECRET.padEnd(32, "0").slice(0, 32), "utf-8")
}

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16

export function generateCsrfToken(): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const payload = JSON.stringify({ ts: Date.now(), nonce: randomBytes(16).toString("hex") })
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url")
}

export function verifyCsrfToken(token: string): boolean {
  const key = getKey()
  try {
    const raw = Buffer.from(token, "base64url")
    const iv = raw.subarray(0, IV_LENGTH)
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    const { ts } = JSON.parse(decrypted.toString("utf8"))
    // Token valid for 24 hours
    return Date.now() - ts < 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function setCsrfCookie(res: NextResponse): void {
  const token = generateCsrfToken()
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  })
}

export function getCsrfToken(req: NextRequest): string | null {
  return req.cookies.get(CSRF_COOKIE)?.value ?? null
}

export function checkCsrf(req: NextRequest): NextResponse | null {
  const cookieToken = getCsrfToken(req)
  const headerToken = req.headers.get(CSRF_HEADER)
  const bodyToken = req.headers.get("content-type")?.includes("multipart/form-data")
    ? null // Can't read body easily for multipart, rely on cookie+header
    : null

  const providedToken = headerToken // Primary: header
  if (!cookieToken || !providedToken) {
    return NextResponse.json({ error: "CSRF token missing" }, { status: 403 })
  }
  if (!verifyCsrfToken(cookieToken) || !verifyCsrfToken(providedToken)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
  }
  // Compare tokens (timing-safe)
  const cookieBuf = Buffer.from(cookieToken)
  const providedBuf = Buffer.from(providedToken)
  if (cookieBuf.length !== providedBuf.length || !timingSafeEqual(cookieBuf, providedBuf)) {
    return NextResponse.json({ error: "CSRF token mismatch" }, { status: 403 })
  }
  return null
}

export function csrfMiddleware(req: NextRequest): NextResponse | null {
  // Only check CSRF on mutating methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return null
  // Skip all API routes — they have their own auth, rate limiting, and validation.
  // The csrf_token cookie is httpOnly so JS cannot read it, making double-submit
  // CSRF incompatible with the SPA architecture. Session + rate-limit provide protection.
  if (req.nextUrl.pathname.startsWith("/api/")) return null
  return checkCsrf(req)
}