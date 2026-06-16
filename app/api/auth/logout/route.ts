import { NextRequest, NextResponse } from "next/server"
import { createClientForRouteHandlerWithResponse } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true })
    res.cookies.set("session", "", { httpOnly: true, path: "/", maxAge: 0 })
    const supabase = createClientForRouteHandlerWithResponse(req, res)
    await supabase.auth.signOut()
    return res
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Logout failed" }, { status: 500 })
  }
}
