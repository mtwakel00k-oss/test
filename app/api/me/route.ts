import { NextRequest, NextResponse } from "next/server"
import { parseSession } from "@/lib/tenant"

export async function GET(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (!session.role) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  return NextResponse.json(session)
}
