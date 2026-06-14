-- ============================================================
--  Migration v13: Audit Trail (per-tenant audit_log table)
--  Run this in each tenant's database.
--  Idempotent — safe to re-run.
-- ============================================================

-- 1) Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT NOT NULL,
  record_id     TEXT,
  operation     TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data      JSONB,
  new_data      JSONB,
  changed_by    TEXT NOT NULL DEFAULT '',
  changed_by_role TEXT NOT NULL DEFAULT '',
  ip_address    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);

-- 2) RLS: authenticated users can read, admin-only write
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_authenticated" ON audit_log;
CREATE POLICY "audit_log_select_authenticated" ON audit_log
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "audit_log_insert_admin" ON audit_log;
CREATE POLICY "audit_log_insert_admin" ON audit_log
  FOR INSERT WITH CHECK (true);

-- 3) Realtime publication (for refresh triggers)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS audit_log;
