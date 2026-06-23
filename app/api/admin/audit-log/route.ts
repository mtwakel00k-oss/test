import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, isTenantMismatch, parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { getMemoryAuditLog } from "@/lib/audit"

export interface AuditLogRow {
  id: string
  table_name: string
  record_id: string | null
  operation: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string
  changed_by_role: string
  ip_address: string
  created_at: string
}

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500)
    const offset = Number(searchParams.get("offset")) || 0
    const tableFilter = searchParams.get("table") || ""
    const operationFilter = searchParams.get("operation") || ""

    const sb = await supabaseForRequest(req)

    let query = sb.from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (tableFilter) query = query.eq("table_name", tableFilter)
    if (operationFilter) query = query.eq("operation", operationFilter.toUpperCase())

    const { data, error, count } = await query.returns<AuditLogRow[]>()
    if (error) {
      // Table may not exist or wrong schema — fall back to in-memory store
      if (error.message?.includes("does not exist") || error.message?.includes("relation") || error.message?.includes("column")) {
        logger.warn("Audit log query failed — using memory store", { error: error.message })
        let memEntries = getMemoryAuditLog()
        if (tableFilter) memEntries = memEntries.filter(e => e.table_name === tableFilter)
        if (operationFilter) memEntries = memEntries.filter(e => e.operation === operationFilter.toUpperCase())
        const paginated = memEntries.slice(offset, offset + limit)
        return NextResponse.json({ data: paginated, count: memEntries.length })
      }
      throw new Error(error.message)
    }

    // Merge DB entries + memory entries (memory entries may have been created before DB table existed)
    let memEntries = getMemoryAuditLog()
    if (tableFilter) memEntries = memEntries.filter(e => e.table_name === tableFilter)
    if (operationFilter) memEntries = memEntries.filter(e => e.operation === operationFilter.toUpperCase())
    const merged = [...memEntries, ...(data || [])]
    const total = merged.length
    const paginated = merged.slice(offset, offset + limit)
    return NextResponse.json({ data: paginated, count: total })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Audit-log GET failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
