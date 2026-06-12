import { NextRequest, NextResponse } from "next/server"
import { createClientForRouteHandlerWithResponse } from "@/lib/supabase-server"
import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    logger.info("Logout", { email: (session as Record<string, string | undefined>).email, role: session.role, slug: session.slug })

    const res = NextResponse.json({ ok: true })
    res.cookies.set("session", "", { httpOnly: true, path: "/", maxAge: 0 })
    const supabase = createClientForRouteHandlerWithResponse(req, res)
    await supabase.auth.signOut()
    return res
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Logout failed" }, { status: 500 })
  }
}
