import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequestAdmin, isTenantMismatch, parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { requirePremiumTier } from "@/lib/require-premium"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"

export interface AuditEventRow {
  id: string
  tenant_slug: string
  event_type: string
  table_name: string | null
  record_id: string | null
  operation: string
  outcome: string
  actor_id: string | null
  actor_email: string
  actor_role: string
  ip_address: string
  user_agent: string
  request_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  seq: number
  prev_hash: string | null
  row_hash: string | null
}

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const slug = session.slug || searchParams.get("slug") || ""

    const tierCheck = await requirePremiumTier(slug)
    if (tierCheck) return tierCheck

    const sb = await supabaseForRequestAdmin(req)

    // ── Meta-audit: log access to the log itself ───────────────
    const metaParams: Record<string, string> = {}
    searchParams.forEach((v, k) => { metaParams[k] = v })
    // Fire and forget — never block the query for meta-audit
    recordAuditEvent(req, {
      event_type: EVENT_TYPES.AUDIT_LOG_VIEWED,
      operation: "ACCESS",
      outcome: "success",
      metadata: { filters: metaParams, viewer_role: session.role },
    }).catch(() => {})

    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500)
    const offset = Number(searchParams.get("offset")) || 0
    const eventTypeFilter = searchParams.get("event_type") || ""
    const tableFilter = searchParams.get("table") || ""
    const operationFilter = searchParams.get("operation") || ""
    const outcomeFilter = searchParams.get("outcome") || ""
    const actorFilter = searchParams.get("actor") || ""
    const fromDate = searchParams.get("from") || ""
    const toDate = searchParams.get("to") || ""
    const search = searchParams.get("search") || ""

    let query = sb.from("audit_events")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (eventTypeFilter) query = query.eq("event_type", eventTypeFilter)
    if (tableFilter) query = query.eq("table_name", tableFilter)
    if (operationFilter) query = query.eq("operation", operationFilter.toUpperCase())
    if (outcomeFilter) query = query.eq("outcome", outcomeFilter)
    if (actorFilter) query = query.eq("actor_email", actorFilter)
    if (fromDate) query = query.gte("created_at", fromDate)
    if (toDate) query = query.lte("created_at", toDate)
    if (search) {
      query = query.or(
        `actor_email.ilike.%${search}%,event_type.ilike.%${search}%,record_id.ilike.%${search}%`,
      )
    }

    const { data: rawData, error, count } = await query.returns<AuditEventRow[]>()

    if (error) {
      logger.error("Audit-log query failed", { error: error.message })
      throw new Error(error.message)
    }

    // Transform seq from BigInt to number for JSON serialization
    const data = (rawData || []).map((r) => ({
      ...r,
      seq: Number(r.seq),
    }))

    return NextResponse.json({ data, count: count || 0 })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Audit-log GET failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}


