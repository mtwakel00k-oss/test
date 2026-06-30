import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface AuditEntry {
  table_name: string
  record_id?: string
  operation: "INSERT" | "UPDATE" | "DELETE"
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
  changed_by?: string
  changed_by_role?: string
}

// In-memory fallback store for audit logs when the DB table doesn't exist
const memoryStore: Map<string, AuditEntry[]> = new Map()

export function getMemoryAuditLog(slug: string): AuditEntry[] {
  return memoryStore.get(slug) || []
}

function addToMemoryStore(slug: string, entry: AuditEntry): void {
  const entries = memoryStore.get(slug) || []
  entries.unshift(entry)
  memoryStore.set(slug, entries)
}

export async function logAudit(
  sb: SupabaseClient,
  req: Request,
  entry: AuditEntry,
  _supabaseUrl?: string,
): Promise<void> {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    const slug = session.slug || req.headers.get("x-tenant-slug") || ""
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      ""

    const memoryEntry: AuditEntry = {
      table_name: entry.table_name,
      record_id: entry.record_id,
      operation: entry.operation,
      old_data: entry.old_data || null,
      new_data: entry.new_data || null,
      changed_by: entry.changed_by || session.email || "",
      changed_by_role: entry.changed_by_role || session.role || "",
    }

    const auditRow = {
      ...memoryEntry,
      record_id: entry.record_id || null,
      ip_address: ip,
    }

    // Always add to memory store as fallback
    addToMemoryStore(slug, memoryEntry)

    const { error: insertError } = await sb.from("audit_log").insert(auditRow)
    if (insertError?.message?.includes("does not exist") || insertError?.code === "42P01") {
      logger.warn("audit_log table does not exist — run migration 00002. Using memory store.")
    } else if (insertError) {
      logger.warn("audit insert failed", insertError)
    }
  } catch (err) {
    logger.warn("audit log error", err)
  }
}
