-- ============================================================
--  Migration 00004: Tenant-scoped RLS policies
--  Replaces permissive "USING (true)" policies with
--  authenticated-only access. Each tenant has its own DB
--  project/credentials, so no tenant_id column is needed
--  for isolation — auth.role() is sufficient.
--  Run AFTER 00002_tenant_schema.sql.
-- ============================================================

-- Helper: check if the user is authenticated (not using anon key)
-- This ensures that even if the anon key is leaked in the browser,
-- direct Supabase API access is restricted to authenticated users.

-- ── produits ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "produits_admin_all" ON produits;
DROP POLICY IF EXISTS "produits_public_select" ON produits;
DROP POLICY IF EXISTS "produits_select_all" ON produits;
DROP POLICY IF EXISTS "produits_insert_auth" ON produits;
DROP POLICY IF EXISTS "produits_update_auth" ON produits;
DROP POLICY IF EXISTS "produits_delete_auth" ON produits;

CREATE POLICY "produits_select_public" ON produits
  FOR SELECT USING (true);

CREATE POLICY "produits_insert_auth" ON produits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "produits_update_auth" ON produits
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "produits_delete_auth" ON produits
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── categories ───────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_admin_all" ON categories;
DROP POLICY IF EXISTS "categories_public_select" ON categories;
DROP POLICY IF EXISTS "categories_select_all" ON categories;
DROP POLICY IF EXISTS "categories_insert_auth" ON categories;
DROP POLICY IF EXISTS "categories_update_auth" ON categories;
DROP POLICY IF EXISTS "categories_delete_auth" ON categories;

CREATE POLICY "categories_select_public" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_insert_auth" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories_update_auth" ON categories
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories_delete_auth" ON categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── prix ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "prix_admin_all" ON prix;
DROP POLICY IF EXISTS "prix_select_all" ON prix;
DROP POLICY IF EXISTS "prix_insert_auth" ON prix;
DROP POLICY IF EXISTS "prix_update_auth" ON prix;
DROP POLICY IF EXISTS "prix_delete_auth" ON prix;

CREATE POLICY "prix_select_public" ON prix
  FOR SELECT USING (true);

CREATE POLICY "prix_insert_auth" ON prix
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "prix_update_auth" ON prix
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "prix_delete_auth" ON prix
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── tailles ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "tailles_admin_all" ON tailles;

CREATE POLICY "tailles_select_public" ON tailles
  FOR SELECT USING (true);

-- ── bases_sauce ──────────────────────────────────────────────
DROP POLICY IF EXISTS "bases_sauce_select_public" ON bases_sauce IF EXISTS;

CREATE POLICY "bases_sauce_select_public" ON bases_sauce
  FOR SELECT USING (true);

-- ── orders ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
DROP POLICY IF EXISTS "orders_select_public" ON orders;
DROP POLICY IF EXISTS "orders_select_all" ON orders;
DROP POLICY IF EXISTS "orders_insert_auth" ON orders;
DROP POLICY IF EXISTS "orders_update_auth" ON orders;
DROP POLICY IF EXISTS "orders_delete_auth" ON orders;

CREATE POLICY "orders_select_authenticated" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "orders_insert_authenticated" ON orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "orders_update_authenticated" ON orders
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "orders_delete_authenticated" ON orders
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── order_items ──────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items;
DROP POLICY IF EXISTS "order_items_select_public" ON order_items;
DROP POLICY IF EXISTS "order_items_select_all" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_auth" ON order_items;
DROP POLICY IF EXISTS "order_items_update_auth" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_auth" ON order_items;

CREATE POLICY "order_items_select_authenticated" ON order_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "order_items_insert_authenticated" ON order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "order_items_update_authenticated" ON order_items
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "order_items_delete_authenticated" ON order_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── ratings ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "ratings_delete_admin" ON ratings;

CREATE POLICY "ratings_insert_public" ON ratings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "ratings_select_authenticated" ON ratings
  FOR SELECT USING (auth.role() = 'authenticated');
