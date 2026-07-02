import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequestAdmin, parseSession } from "@/lib/tenant"
import type { AuditEventRow } from "@/app/api/admin/audit-log/route"

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sb = await supabaseForRequestAdmin(req)
    const { searchParams } = new URL(req.url)

    let query = sb.from("audit_events").select("*").order("created_at", { ascending: false })

    const eventTypeFilter = searchParams.get("event_type") || ""
    const tableFilter = searchParams.get("table") || ""
    const operationFilter = searchParams.get("operation") || ""
    const outcomeFilter = searchParams.get("outcome") || ""
    const actorFilter = searchParams.get("actor") || ""
    const fromDate = searchParams.get("from") || ""
    const toDate = searchParams.get("to") || ""

    if (eventTypeFilter) query = query.eq("event_type", eventTypeFilter)
    if (tableFilter) query = query.eq("table_name", tableFilter)
    if (operationFilter) query = query.eq("operation", operationFilter.toUpperCase())
    if (outcomeFilter) query = query.eq("outcome", outcomeFilter)
    if (actorFilter) query = query.eq("actor_email", actorFilter)
    if (fromDate) query = query.gte("created_at", fromDate)
    if (toDate) query = query.lte("created_at", toDate)

    const { data } = await query.returns<AuditEventRow[]>()
    if (!data || data.length === 0) {
      return new NextResponse("No data", { status: 200, headers: { "Content-Type": "text/csv" } })
    }

    const csvHeaders = ["id","tenant_slug","event_type","table_name","record_id","operation","outcome","actor_email","actor_role","ip_address","created_at"]
    const csvRows = data.map((r) =>
      csvHeaders.map((h) => {
        const v = (r as unknown as Record<string, unknown>)[h]
        if (v === null || v === undefined) return ""
        const s = String(v).replace(/"/g, '""')
        return `"${s}"`
      }).join(","),
    )

    const csv = [csvHeaders.join(","), ...csvRows].join("\n")
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-events-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
