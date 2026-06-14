import type { SupabaseClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"

export interface AuditEntry {
  table_name: string
  record_id: string | number
  operation: "INSERT" | "UPDATE" | "DELETE"
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
}

/**
 * Log an audit event to the tenant's audit_log table.
 * Extracts session (email, role, slug) from the request cookie.
 * Fire-and-forget — never throws.
 */
export async function logAudit(
  sb: SupabaseClient,
  req: Request,
  entry: AuditEntry,
): Promise<void> {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      ""

    const { error } = await sb.from("audit_log").insert({
      table_name: entry.table_name,
      record_id: String(entry.record_id),
      operation: entry.operation,
      old_data: entry.old_data ?? null,
      new_data: entry.new_data ?? null,
      changed_by: session.email || "",
      changed_by_role: session.role || "",
      ip_address: ip,
    })

    if (error) {
      // silent fail — audit should never break the main operation
      logger.warn("Audit log insert failed (silent)", { error: error.message, table: entry.table_name })
    }
  } catch (e) {
    logger.warn("Audit log exception (silent)", e)
  }
}
