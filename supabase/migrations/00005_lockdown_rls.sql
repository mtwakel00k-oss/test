-- ============================================================
--  Migration 00005: Lockdown RLS — service_role-only writes
--
--  Drops all permissive "USING (true)" / authenticated policies
--  from 00002 and 00004. After this migration:
--
--    • Public menu tables (produits, prix, categories, tailles,
--      bases_sauce) — anon SELECT only
--    • ratings — anon INSERT only (customers rate without login)
--    • Everything else — NO anon/authenticated policies.
--      All writes happen server-side via the service_role client
--      (supabaseForRequestAdmin), which bypasses RLS entirely.
--
--  Run AFTER 00004_tenant_scoped_rls.sql.
--  ⚠  No further RLS migration should re-introduce authenticated
--     policies — the app never attaches a Supabase Auth JWT, so
--     every server query runs as `anon`.
-- ============================================================

-- ── 1. STORAGE ───────────────────────────────────────────────
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

-- Only service_role can access storage (no anon/authenticated policies)
-- SELECT/INSERT/DELETE happen server-side via createTenantSupabaseClient
-- which uses the anon key — but after this migration, storage will
-- require service_role. We keep the default DENY for all roles and
-- let the server-side client use service_role instead.

-- ── 2. produits ──────────────────────────────────────────────
DROP POLICY IF EXISTS "produits_admin_all" ON produits;
DROP POLICY IF EXISTS "produits_public_select" ON produits;
DROP POLICY IF EXISTS "produits_select_all" ON produits;
DROP POLICY IF EXISTS "produits_select_public" ON produits;
DROP POLICY IF EXISTS "produits_insert_auth" ON produits;
DROP POLICY IF EXISTS "produits_update_auth" ON produits;
DROP POLICY IF EXISTS "produits_delete_auth" ON produits;

CREATE POLICY "produits_anon_select" ON produits
  FOR SELECT USING (true);

-- ── 3. categories ────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_admin_all" ON categories;
DROP POLICY IF EXISTS "categories_public_select" ON categories;
DROP POLICY IF EXISTS "categories_select_all" ON categories;
DROP POLICY IF EXISTS "categories_select_public" ON categories;
DROP POLICY IF EXISTS "categories_insert_auth" ON categories;
DROP POLICY IF EXISTS "categories_update_auth" ON categories;
DROP POLICY IF EXISTS "categories_delete_auth" ON categories;

CREATE POLICY "categories_anon_select" ON categories
  FOR SELECT USING (true);

-- ── 4. prix ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "prix_admin_all" ON prix;
DROP POLICY IF EXISTS "prix_select_all" ON prix;
DROP POLICY IF EXISTS "prix_select_public" ON prix;
DROP POLICY IF EXISTS "prix_insert_auth" ON prix;
DROP POLICY IF EXISTS "prix_update_auth" ON prix;
DROP POLICY IF EXISTS "prix_delete_auth" ON prix;

CREATE POLICY "prix_anon_select" ON prix
  FOR SELECT USING (true);

-- ── 5. tailles ───────────────────────────────────────────────
DROP POLICY IF EXISTS "tailles_admin_all" ON tailles;
DROP POLICY IF EXISTS "tailles_select_public" ON tailles;

CREATE POLICY "tailles_anon_select" ON tailles
  FOR SELECT USING (true);

-- ── 6. bases_sauce ───────────────────────────────────────────
DROP POLICY IF EXISTS "bases_sauce_select_public" ON bases_sauce IF EXISTS;

CREATE POLICY "bases_sauce_anon_select" ON bases_sauce
  FOR SELECT USING (true);

-- ── 7. orders ────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
DROP POLICY IF EXISTS "orders_select_public" ON orders;
DROP POLICY IF EXISTS "orders_select_all" ON orders;
DROP POLICY IF EXISTS "orders_select_authenticated" ON orders;
DROP POLICY IF EXISTS "orders_insert_auth" ON orders;
DROP POLICY IF EXISTS "orders_insert_authenticated" ON orders;
DROP POLICY IF EXISTS "orders_update_auth" ON orders;
DROP POLICY IF EXISTS "orders_update_authenticated" ON orders;
DROP POLICY IF EXISTS "orders_delete_auth" ON orders;
DROP POLICY IF EXISTS "orders_delete_authenticated" ON orders;

-- No policies. All access via service_role only.

-- ── 8. order_items ──────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items;
DROP POLICY IF EXISTS "order_items_select_public" ON order_items;
DROP POLICY IF EXISTS "order_items_select_all" ON order_items;
DROP POLICY IF EXISTS "order_items_select_authenticated" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_auth" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_authenticated" ON order_items;
DROP POLICY IF EXISTS "order_items_update_auth" ON order_items;
DROP POLICY IF EXISTS "order_items_update_authenticated" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_auth" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_authenticated" ON order_items;

-- No policies. All access via service_role only.

-- ── 9. ratings ───────────────────────────────────────────────
DROP POLICY IF EXISTS "ratings_delete_admin" ON ratings;
DROP POLICY IF EXISTS "ratings_insert_public" ON ratings;
DROP POLICY IF EXISTS "ratings_select_authenticated" ON ratings;

-- Customers submit ratings without login — anon INSERT stays open.
-- SELECT and DELETE require service_role only.
CREATE POLICY "ratings_anon_insert" ON ratings
  FOR INSERT WITH CHECK (true);

-- ── 10. audit_log ────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert_all" ON audit_log;
DROP POLICY IF EXISTS "audit_log_update_admin" ON audit_log;
DROP POLICY IF EXISTS "audit_log_delete_admin" ON audit_log;

-- No policies. All access via service_role only.

-- ── 11. delivery_men ─────────────────────────────────────────
DROP POLICY IF EXISTS "delivery_men_select_all" ON delivery_men;
DROP POLICY IF EXISTS "delivery_men_insert_admin" ON delivery_men;
DROP POLICY IF EXISTS "delivery_men_update_admin" ON delivery_men;
DROP POLICY IF EXISTS "delivery_men_delete_admin" ON delivery_men;

-- No policies. All access via service_role only.

-- ── 12. restaurant_staff ─────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_staff_select_staff" ON restaurant_staff;
DROP POLICY IF EXISTS "restaurant_staff_insert_admin" ON restaurant_staff;
DROP POLICY IF EXISTS "restaurant_staff_update_admin" ON restaurant_staff;
DROP POLICY IF EXISTS "restaurant_staff_delete_admin" ON restaurant_staff;

-- No policies. All access via service_role only.

-- ── 13. daily_order_counters ─────────────────────────────────
DROP POLICY IF EXISTS "daily_order_counters_insert" ON daily_order_counters;
DROP POLICY IF EXISTS "daily_order_counters_select" ON daily_order_counters;

-- No policies. All access via service_role only.

-- ── 14. rate_limits ──────────────────────────────────────────
-- Backend table for distributed rate limiting when Upstash Redis is unavailable.
-- Created here (not in 00002) because 00002 only covers business schema.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);

DROP POLICY IF EXISTS "rate_limits_service_role" ON rate_limits IF EXISTS;

-- Only service_role can read/write rate_limits.
CREATE POLICY "rate_limits_service_role" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ── Verifcation helper ────────────────────────────────────────
CREATE OR REPLACE FUNCTION verify_rls_lockdown()
RETURNS TABLE(table_name text, has_anon_insert boolean, has_anon_update boolean, has_anon_delete boolean)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename::text,
    COALESCE(BOOL_OR(policyname ILIKE '%insert%' AND (roles @> '{anon}' OR roles = '{public}')), false) AS has_anon_insert,
    COALESCE(BOOL_OR(policyname ILIKE '%update%' AND (roles @> '{anon}' OR roles = '{public}')), false) AS has_anon_update,
    COALESCE(BOOL_OR(policyname ILIKE '%delete%' AND (roles @> '{anon}' OR roles = '{public}')), false) AS has_anon_delete
  FROM pg_policies
  WHERE tablename IN ('orders', 'order_items', 'produits', 'prix', 'categories', 'tailles', 'audit_log', 'delivery_men', 'restaurant_staff', 'ratings')
  GROUP BY schemaname, tablename
  ORDER BY tablename;
END;
$$;
