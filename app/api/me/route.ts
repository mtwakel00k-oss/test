import { NextRequest, NextResponse } from "next/server"
import { parseSession } from "@/lib/tenant"

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (!session.role) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    return NextResponse.json(session)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    return NextResponse.json({ error: "Internal Server Error", details: msg }, { status: 500 })
  }
}
