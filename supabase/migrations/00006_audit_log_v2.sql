-- ============================================================
--  Migration 00006: Immutable tamper-evident audit trail (v2)
--
--  Replaces the old `audit_log` table with `audit_events`:
--    • Hash-chain integrity (SHA-256 chain per tenant_slug)
--    • Trigger-blocked UPDATE/DELETE (applies to ALL roles,
--      including service_role — triggers fire regardless of RLS)
--    • Zero anon/authenticated RLS policies (empty set = DENY)
--    • Tenant isolation via `tenant_slug TEXT NOT NULL`
--      (required because shared-project mode is supported —
--       see lib/tenant.ts isSharedProjectTenant())
--    • Strict enum constraints on operation, outcome
--    • Indexed for all common query patterns
--
--  The old `audit_log` table is NOT dropped here. It will be
--  dropped in a follow-up migration after the backfill from
--  audit_log → audit_events is verified (see Step 5 of the
--  audit re-architecture task).
-- ============================================================

-- ── 1. Dead-letter table for audit write failures ────────────
-- Stores events that failed to insert so they are queryable/
-- alertable instead of only living in ephemeral function logs.
CREATE TABLE IF NOT EXISTS audit_write_failures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_payload   JSONB NOT NULL,
  error_message   TEXT NOT NULL,
  actor_email     TEXT NOT NULL DEFAULT '',
  ip_address      TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_write_failures ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only by default (empty set = DENY for anon/authenticated)

-- Block UPDATE/DELETE even for service_role (triggers bypass RLS)
CREATE OR REPLACE FUNCTION audit_write_failures_block_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_write_failures is append-only; % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_write_failures_no_update
  BEFORE UPDATE ON audit_write_failures
  FOR EACH ROW EXECUTE FUNCTION audit_write_failures_block_mutation();
CREATE TRIGGER trg_audit_write_failures_no_delete
  BEFORE DELETE ON audit_write_failures
  FOR EACH ROW EXECUTE FUNCTION audit_write_failures_block_mutation();

-- ── 2. Main audit_events table ───────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug     TEXT NOT NULL,
  event_type      TEXT NOT NULL,                          -- See lib/audit-events.ts AuditEventType
  table_name      TEXT,                                    -- Nullable; not every event maps to a table (e.g. login)
  record_id       TEXT,
  operation       TEXT NOT NULL CHECK (operation IN ('CREATE','UPDATE','DELETE','ACCESS','LOGIN','LOGOUT','DENIED')),
  outcome         TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success','failure')),
  actor_id        TEXT,
  actor_email     TEXT NOT NULL DEFAULT '',
  actor_role      TEXT NOT NULL DEFAULT '',
  ip_address      TEXT NOT NULL DEFAULT '',
  user_agent      TEXT NOT NULL DEFAULT '',
  request_id      TEXT,                                    -- Correlate multiple events from one request
  old_data        JSONB,                                   -- REDACTED before insert (see lib/audit-events.ts)
  new_data        JSONB,                                   -- REDACTED before insert (see lib/audit-events.ts)
  metadata        JSONB,                                   -- Free-form extra context
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  seq             BIGSERIAL,                               -- Strictly monotonic, gap-visible ordering
  prev_hash       TEXT,                                    -- SHA-256 of the previous row (per tenant_slug)
  row_hash        TEXT NOT NULL                            -- SHA-256(prev_hash || tenant_slug || event_type || record_id || operation || old_data || new_data || actor_email || created_at)
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant ON audit_events(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_table_name ON audit_events(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_events_outcome ON audit_events(outcome);
CREATE INDEX IF NOT EXISTS idx_audit_events_request ON audit_events(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created ON audit_events(tenant_slug, created_at DESC);

-- ── 3. Hash-chain trigger ────────────────────────────────────
-- Computes row_hash from prev_hash + this row's content,
-- so any historical tampering (even a direct DB edit) breaks
-- the chain and is detectable by recomputation.
-- Chain is PER tenant_slug (different tenants' chains are independent).
CREATE OR REPLACE FUNCTION audit_events_chain() RETURNS TRIGGER AS $$
DECLARE
  last_hash TEXT;
BEGIN
  SELECT row_hash INTO last_hash FROM audit_events
    WHERE tenant_slug = NEW.tenant_slug ORDER BY seq DESC LIMIT 1;
  NEW.prev_hash := COALESCE(last_hash, '');
  NEW.row_hash := encode(
    sha256(
      convert_to(
        COALESCE(NEW.prev_hash,'') ||
        NEW.tenant_slug ||
        NEW.event_type ||
        COALESCE(NEW.record_id,'') ||
        NEW.operation ||
        NEW.outcome ||
        COALESCE(NEW.old_data::text,'') ||
        COALESCE(NEW.new_data::text,'') ||
        NEW.actor_email ||
        NEW.created_at::text,
        'UTF8'
      )
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_events_chain
  BEFORE INSERT ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_chain();

-- ── 4. Immutability triggers (block UPDATE/DELETE) ──────────
-- These fire for ALL roles including service_role because triggers
-- execute regardless of RLS. This is the ONLY reliable way to
-- enforce append-only on a table accessible to service_role.
CREATE OR REPLACE FUNCTION audit_events_block_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only; % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_events_no_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_block_mutation();
CREATE TRIGGER trg_audit_events_no_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_block_mutation();

-- ── 5. RLS: empty policy set = deny all for anon/authenticated ──
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
-- No CREATE POLICY statements here.
-- An empty policy set with RLS enabled means anon and authenticated
-- roles get zero access by default. Only service_role (used by
-- supabaseForRequestAdmin) can read/write, via the triggers above.
