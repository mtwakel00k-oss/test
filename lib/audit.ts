import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"

export interface AuditEntry {
  table_name: string
  record_id: string | number
  operation: "INSERT" | "UPDATE" | "DELETE"
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
}

export interface StoredAuditEntry {
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

/** In-memory fallback store for audit entries when the DB table doesn't exist. */
const _memoryStore: StoredAuditEntry[] = []
const MAX_MEMORY_ENTRIES = 500

function addToMemoryStore(entry: StoredAuditEntry): void {
  _memoryStore.unshift(entry)
  if (_memoryStore.length > MAX_MEMORY_ENTRIES) _memoryStore.length = MAX_MEMORY_ENTRIES
}

export function getMemoryAuditLog(): StoredAuditEntry[] {
  return _memoryStore
}

async function ensureAuditTable(sb: SupabaseClient): Promise<boolean> {
  const supabaseUrl = (sb as unknown as { supabaseUrl?: string }).supabaseUrl
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    logger.warn("Cannot create audit_log table: missing supabaseUrl or service key")
    return false
  }

  const sql = `CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT NOT NULL DEFAULT '',
    changed_by_role TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
  ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "audit_log_select_all" ON audit_log;
  CREATE POLICY "audit_log_select_all" ON audit_log FOR SELECT USING (true);
  DROP POLICY IF EXISTS "audit_log_insert_all" ON audit_log;
  CREATE POLICY "audit_log_insert_all" ON audit_log FOR INSERT WITH CHECK (true);`

  try {
    // Try exec_sql RPC first (available on Supabase projects that have used SQL editor)
    const svc = createClient(supabaseUrl, serviceKey)
    const { error: rpcErr } = await svc.rpc("exec_sql", { query_text: sql })
    if (!rpcErr) return true
    logger.warn("exec_sql RPC not available, trying Management API", rpcErr)
  } catch {
    logger.warn("exec_sql RPC threw")
  }

  // Fallback: try Management API (requires SUPABASE_ACCESS_TOKEN)
  const mgmtKey = process.env.SUPABASE_ACCESS_TOKEN
  if (!mgmtKey) return false

  try {
    const ref = supabaseUrl.replace("https://", "").split(".")[0]
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgmtKey}` },
      body: JSON.stringify({ query: sql }),
    })
    return res.ok
  } catch (e) {
    logger.warn("Management API failed to create audit_log table", e)
    return false
  }
}

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

    const payload: Record<string, unknown> = {
      table_name: entry.table_name,
      record_id: String(entry.record_id),
      operation: entry.operation,
      old_data: entry.old_data ?? null,
      new_data: entry.new_data ?? null,
      changed_by: session.email || "",
      changed_by_role: session.role || "",
      ip_address: ip,
    }

    const { error } = await sb.from("audit_log").insert(payload)
    if (!error) return

    if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
      const created = await ensureAuditTable(sb)
      if (created) {
        const { error: retryErr } = await sb.from("audit_log").insert(payload)
        if (!retryErr) return
        if (retryErr) logger.warn("Audit log retry failed", { error: retryErr.message })
      }
    } else {
      logger.warn("Audit log insert failed", { error: error.message, table: entry.table_name })
    }

    // In-memory fallback — guarantees audit is visible in admin panel
    addToMemoryStore({
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      table_name: entry.table_name,
      record_id: String(entry.record_id),
      operation: entry.operation,
      old_data: entry.old_data ?? null,
      new_data: entry.new_data ?? null,
      changed_by: session.email || "",
      changed_by_role: session.role || "",
      ip_address: ip,
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    logger.warn("Audit log exception (silent)", e)
  }
}
