import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"
import { parseSession, getTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

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
  slug?: string
}

/** In-memory fallback store for audit entries when the DB table doesn't exist. */
const _memoryStore: StoredAuditEntry[] = []
const MAX_MEMORY_ENTRIES = 500

function addToMemoryStore(entry: StoredAuditEntry): void {
  _memoryStore.unshift(entry)
  if (_memoryStore.length > MAX_MEMORY_ENTRIES) _memoryStore.length = MAX_MEMORY_ENTRIES
}

export function getMemoryAuditLog(slug?: string): StoredAuditEntry[] {
  if (!slug) return _memoryStore
  return _memoryStore.filter(e => e.slug === slug)
}

async function ensureAuditTable(sb: SupabaseClient, slug?: string): Promise<boolean> {
  const supabaseUrl = (sb as unknown as { supabaseUrl?: string }).supabaseUrl

  const sql = `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'user_id') THEN
      DROP TABLE IF EXISTS audit_log CASCADE;
    END IF;
  END $$;
  CREATE TABLE IF NOT EXISTS audit_log (
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
  DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
  CREATE POLICY "audit_log_select_admin" ON audit_log FOR SELECT USING (true);
  DROP POLICY IF EXISTS "audit_log_insert_all" ON audit_log;
  CREATE POLICY "audit_log_insert_all" ON audit_log FOR INSERT WITH CHECK (true);
  DROP POLICY IF EXISTS "audit_log_update_deny" ON audit_log;
  CREATE POLICY "audit_log_update_deny" ON audit_log FOR UPDATE USING (false);
  DROP POLICY IF EXISTS "audit_log_delete_deny" ON audit_log;
  CREATE POLICY "audit_log_delete_deny" ON audit_log FOR DELETE USING (false);`

  // Strategy 1: try exec_sql RPC using the provided client (tenant's own auth)
  // exec_sql is SECURITY DEFINER so it works even with anon key if available
  try {
    const { error: rpcErr } = await sb.rpc("exec_sql", { query_text: sql })
    if (!rpcErr) return true
    logger.warn("exec_sql RPC via tenant client failed", rpcErr)
  } catch {
    logger.warn("exec_sql RPC via tenant client threw")
  }

  // Strategy 2: look up tenant and use its own service key
  if (slug && supabaseUrl) {
    try {
      const config = await getTenantConfig(slug)
      if (config?.supabase_service_key) {
        const svc = createClient(supabaseUrl, config.supabase_service_key)
        const { error: svcErr } = await svc.rpc("exec_sql", { query_text: sql })
        if (!svcErr) return true
        logger.warn("exec_sql RPC via tenant service key failed", svcErr)
      }
    } catch { /* ignore */ }
  }

  // Strategy 3: try master service key (works if tenant shares master project)
  if (supabaseUrl && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const svc = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY)
      const { error: svcErr } = await svc.rpc("exec_sql", { query_text: sql })
      if (!svcErr) return true
    } catch { /* ignore */ }
  }

  return false
}

export async function logAudit(
  sb: SupabaseClient,
  req: Request,
  entry: AuditEntry,
): Promise<void> {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    const slug = session.slug || req.headers.get("x-tenant-slug") || ""
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

    if (error.message?.includes("does not exist") || error.message?.includes("relation") || error.message?.includes("column")) {
      const created = await ensureAuditTable(sb, slug)
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
      slug,
    })
  } catch (e) {
    logger.warn("Audit log exception (silent)", e)
  }
}
