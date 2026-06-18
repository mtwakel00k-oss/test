import { NextRequest, NextResponse } from "next/server"
import { encryptSession, decryptSession } from "@/lib/session-crypto"
import { logger } from "@/lib/logger"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

const SECURE = process.env.NODE_ENV === "production"

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`auth:extend-session:${getClientIp(req)}`, { max: 10, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const rawCookie = req.cookies.get("session")?.value
    if (!rawCookie) {
      return NextResponse.json({ error: "No session" }, { status: 401 })
    }

    const decrypted = decryptSession(rawCookie)
    const parsed = decrypted ?? JSON.parse(decodeURIComponent(rawCookie)) as { email?: string; role?: string; slug?: string }

    if (!parsed.role) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set("session", encryptSession(parsed), {
      httpOnly: true,
      secure: SECURE,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    logger.info("Session extended", { email: parsed.email, role: parsed.role })
    return res
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Extend session failed"
    logger.error("Extend session error", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
