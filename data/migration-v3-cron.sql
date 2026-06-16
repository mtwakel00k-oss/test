-- ============================================================
--  MIGRATION V3 — Cron job support
-- ============================================================

-- Add service_key column to tenants (for cron cleanup on separate projects)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_service_key TEXT;

-- Update tenants that share the master project
UPDATE tenants SET supabase_service_key = 'CHANGE_ME_to_your_supabase_service_role_key'
WHERE supabase_url = 'https://icefntwfwvtonkdyshde.supabase.co'
  AND supabase_service_key IS NULL;

-- Add plan_type column for subscription plans
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'starter';

-- Set existing rows to 'starter' if they somehow got NULL (safety net)
UPDATE tenants SET plan_type = 'starter' WHERE plan_type IS NULL;
