import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getTenantConfig, parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

const TENANT_MIGRATION = `
-- ============================================================
--  Tenant Migration V3 — Self-healing schema (idempotent)
--  Safe to re-run; all statements use IF NOT EXISTS / DROP IF
-- ============================================================

-- 0) exec_sql helper — enables programmatic migration for future runs
CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT) RETURNS VOID AS $$ BEGIN EXECUTE query_text; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1) Missing columns on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_by_staff_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_by_staff_name TEXT;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','preparing','ready','out_for_delivery','completed','cancelled'));

-- 2) Missing columns on produits
ALTER TABLE produits ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
UPDATE produits SET is_available = TRUE WHERE is_available IS NULL;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3) Missing columns on ratings
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;

-- 4) Missing columns on categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;

-- 5) Seed tailles if empty (S/M/L/XL/XXL)
INSERT INTO tailles (code, label)
SELECT * FROM (VALUES ('L', 'Large'), ('XL', 'Extra Large'), ('XXL', 'Double Extra Large'), ('M', 'Medium'), ('S', 'Small'))
AS v(code, label)
WHERE NOT EXISTS (SELECT 1 FROM tailles);

-- 6) Recreate v_products_flat with all columns
DROP VIEW IF EXISTS v_products_flat;
CREATE VIEW v_products_flat AS
WITH prix_agg AS (
  SELECT pr.produit_id, COALESCE(t.code, 'UNIQUE') AS taille_code,
    MIN(CASE WHEN bs.id = 1 THEN pr.prix END) AS sauce_tomate,
    MIN(CASE WHEN bs.id = 2 THEN pr.prix END) AS creme_fraiche,
    MIN(CASE WHEN bs.id IS NULL THEN pr.prix END) AS standard
  FROM prix pr
  LEFT JOIN tailles t ON t.id = pr.taille_id
  LEFT JOIN bases_sauce bs ON bs.id = pr.base_sauce_id
  WHERE pr.disponible
  GROUP BY pr.produit_id, t.code
)
SELECT p.id, p.nom AS name, p.description, p.image_url,
  c.nom AS category, p.est_speciale, p.is_available,
  EXISTS(SELECT 1 FROM prix pr JOIN bases_sauce bs ON bs.id = pr.base_sauce_id WHERE pr.produit_id = p.id AND bs.id = 2) AS has_white_sauce,
  COALESCE((SELECT jsonb_object_agg(taille_code, jsonb_build_object('sauce_tomate', sauce_tomate, 'creme_fraiche', creme_fraiche, 'standard', standard)) FROM prix_agg WHERE produit_id = p.id), '{}'::jsonb) AS prices
FROM produits p
JOIN categories c ON c.id = p.categorie_id
ORDER BY c.id, p.id;

-- 7) Storage bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, false, 5242880, '{image/png,image/jpeg,image/webp,image/gif}')
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
CREATE POLICY "product_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

-- 8) RLS policies — allow admin writes, delete privileges
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prix ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_delete_admin" ON orders; CREATE POLICY "orders_delete_admin" ON orders FOR DELETE USING (true);
DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items; CREATE POLICY "order_items_delete_admin" ON order_items FOR DELETE USING (true);
DROP POLICY IF EXISTS "ratings_delete_admin" ON ratings; CREATE POLICY "ratings_delete_admin" ON ratings FOR DELETE USING (true);
DROP POLICY IF EXISTS "categories_admin_all" ON categories; CREATE POLICY "categories_admin_all" ON categories FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "categories_public_select" ON categories; CREATE POLICY "categories_public_select" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "produits_admin_all" ON produits; CREATE POLICY "produits_admin_all" ON produits FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "produits_public_select" ON produits; CREATE POLICY "produits_public_select" ON produits FOR SELECT USING (true);
DROP POLICY IF EXISTS "prix_admin_all" ON prix; CREATE POLICY "prix_admin_all" ON prix FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tailles_admin_all" ON tailles; CREATE POLICY "tailles_admin_all" ON tailles FOR ALL USING (true) WITH CHECK (true);

-- 9) V9: Driver live location tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_driver_location ON orders(driver_id, status) WHERE status = 'out_for_delivery';

-- 10) V10: Public order tracking RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_public" ON orders;
CREATE POLICY "orders_select_public" ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "order_items_select_public" ON order_items;
CREATE POLICY "order_items_select_public" ON order_items FOR SELECT USING (true);

-- 11) V11: Delivery men table
CREATE TABLE IF NOT EXISTS delivery_men (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug     TEXT NOT NULL,
  name            TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  is_busy         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_men_tenant_slug ON delivery_men(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_delivery_men_available ON delivery_men(tenant_slug, is_busy) WHERE is_busy = false;
ALTER TABLE delivery_men ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_man_id') THEN
    ALTER TABLE orders ADD COLUMN delivery_man_id UUID REFERENCES delivery_men(id) ON DELETE SET NULL;
  END IF;
END $$;
DROP POLICY IF EXISTS "delivery_men_select_authenticated" ON delivery_men;
CREATE POLICY "delivery_men_select_authenticated" ON delivery_men FOR SELECT USING (true);
DROP POLICY IF EXISTS "delivery_men_insert_admin" ON delivery_men;
CREATE POLICY "delivery_men_insert_admin" ON delivery_men FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "delivery_men_update_admin" ON delivery_men;
CREATE POLICY "delivery_men_update_admin" ON delivery_men FOR UPDATE USING (true);
DROP POLICY IF EXISTS "delivery_men_delete_admin" ON delivery_men;
CREATE POLICY "delivery_men_delete_admin" ON delivery_men FOR DELETE USING (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

-- 12) Atomic daily order numbers
CREATE TABLE IF NOT EXISTS daily_order_counters (
  day DATE PRIMARY KEY,
  counter INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_order_number()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  next_num INT;
BEGIN
  INSERT INTO daily_order_counters (day, counter)
  VALUES (today, 1)
  ON CONFLICT (day) DO UPDATE
  SET counter = daily_order_counters.counter + 1
  RETURNING counter INTO next_num;
  RETURN next_num;
END;
$$;

-- 13) Audit log table (drops old schema if columns mismatch)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'user_id') THEN
    DROP TABLE IF EXISTS audit_log CASCADE;
  END IF;
END $$;
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
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
DROP POLICY IF EXISTS "audit_log_select_authenticated" ON audit_log;
CREATE POLICY "audit_log_select_admin" ON audit_log FOR SELECT USING (true);
DROP POLICY IF EXISTS "audit_log_insert_all" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert_admin" ON audit_log;
CREATE POLICY "audit_log_insert_all" ON audit_log FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "audit_log_update_deny" ON audit_log;
CREATE POLICY "audit_log_update_deny" ON audit_log FOR UPDATE USING (false);
DROP POLICY IF EXISTS "audit_log_delete_deny" ON audit_log;
CREATE POLICY "audit_log_delete_deny" ON audit_log FOR DELETE USING (false);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
  END IF;
END $$;
`

const MASTER_SQL = `
-- Master project migration — self-healing

-- 0) exec_sql helper — needed for programmatic migration
CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT) RETURNS VOID AS $$ BEGIN EXECUTE query_text; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INT;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','preparing','ready','out_for_delivery','completed','cancelled'));
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
DROP POLICY IF EXISTS "public_select_categories" ON categories;
CREATE POLICY "public_select_categories" ON categories FOR SELECT USING (true);

-- V3: Cron job support (service key for external tenants)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_service_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_color TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_text_color TEXT;
-- Run this to populate your own tenant's service key:
-- UPDATE tenants SET supabase_service_key = '<your_tenant_svc_key>' WHERE supabase_url = '<tenant_supabase_url>';
`

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const secret = url.searchParams.get("secret")
  const session = parseSession(req.headers.get("cookie") || "")
  if (process.env.NODE_ENV === "production" && secret !== env.CRON_SECRET && session.role !== "owner" && session.role !== "admin") {
    return NextResponse.json({ error: "Not available in production without valid secret" }, { status: 403 })
  }

  if (!secret && session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const results: { step: string; status: string; detail?: string }[] = []
  const slug = url.searchParams.get("slug") || ""

  if (slug) {
    const tenant = await getTenantConfig(slug)
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }
    results.push({
      step: `Tenant "${slug}" migration`,
      status: "manual",
      detail: `Run this SQL in your tenant Supabase Dashboard (${tenant.supabase_url}):\n\n${TENANT_MIGRATION}`,
    })
    return NextResponse.json({ results })
  }

  // 1) Storage bucket
  if (serviceKey && supabaseUrl) {
    const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }
    try {
      const r = await fetch(`${supabaseUrl}/storage/v1/bucket`, { method: "POST", headers: h, body: JSON.stringify({ id: "product-images", name: "product-images", public: true, file_size_limit: 5242880, allowed_mime_types: ["image/png","image/jpeg","image/webp","image/gif"] }) })
      results.push({ step: "Storage bucket", status: r.ok || r.status === 409 ? "done" : "error", detail: r.ok || r.status === 409 ? undefined : await r.text() })
    } catch (e) { results.push({ step: "Storage bucket", status: "error", detail: e instanceof Error ? e.message : String(e) }) }
    // FIXED: tailles seeding removed — tenant table, already in TENANT_MIGRATION
  }

  results.push({
    step: "Master SQL migration",
    status: "manual",
    detail: `Run this SQL in your master Supabase Dashboard:\n\n${MASTER_SQL}`,
  })

  // If slug is provided, also show tenant migration
  results.push({
    step: "Tenant migration (all tenants)",
    status: "info",
    detail: `To fix missing is_available on tenant databases, call GET /api/run-sql?slug=<tenant_slug>`,
  })

  return NextResponse.json({ results })
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const secret = url.searchParams.get("secret")
  const runSession = parseSession(req.headers.get("cookie") || "")
  if (process.env.NODE_ENV === "production" && secret !== env.CRON_SECRET && runSession.role !== "owner" && runSession.role !== "admin") {
    return NextResponse.json({ error: "Not available in production without valid secret" }, { status: 403 })
  }

  const rl = await checkRateLimit(`run-sql:${getClientIp(req)}`, { max: 10, windowMs: 60000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  if (!secret && (runSession.role !== "owner" || runSession.slug)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const { slug } = body

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }

  // Special slug "__master__" runs MASTER_SQL on the master project
  if (slug === "__master__") {
    const masterUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const masterKey = env.SUPABASE_SERVICE_ROLE_KEY
    if (!masterUrl || !masterKey) {
      return NextResponse.json({ error: "Master DB not configured" }, { status: 500 })
    }
    try {
      const masterSvc = createClient(masterUrl, masterKey)
      const { error } = await masterSvc.rpc("exec_sql", { query_text: MASTER_SQL })
      if (error) {
        logger.error("Master migration exec_sql failed", error)
        return NextResponse.json({
          error: "exec_sql RPC not available on master",
          detail: `Run manually in master Supabase Dashboard SQL editor:\n\n${MASTER_SQL}`,
        }, { status: 400 })
      }
      return NextResponse.json({ success: true, slug: "__master__" })
    } catch {
      return NextResponse.json({
        error: "Could not execute SQL on master",
        detail: `Run manually in master Supabase Dashboard SQL editor:\n\n${MASTER_SQL}`,
      }, { status: 500 })
    }
  }

  const tenant = await getTenantConfig(slug)
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  const masterUrl = env.NEXT_PUBLIC_SUPABASE_URL!
  const masterKey = env.SUPABASE_SERVICE_ROLE_KEY

  // First pass: try master service key directly (works for tenants sharing master project)
  if (masterKey) {
    const svc = createClient(tenant.supabase_url, masterKey)
    const { error: e1 } = await svc.rpc("exec_sql", { query_text: TENANT_MIGRATION })
    if (!e1) return NextResponse.json({ success: true, slug })
  }

  // Second pass: look up tenant's own service key (separate-project tenants)
  const masterSb = createClient(masterUrl, masterKey || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: tenantRow } = await masterSb.from("tenants").select("supabase_service_key").eq("slug", slug).maybeSingle()
  const tenantServiceKey = tenantRow?.supabase_service_key || masterKey
  if (tenantServiceKey) {
    const svc = createClient(tenant.supabase_url, tenantServiceKey)
    const { error: e2 } = await svc.rpc("exec_sql", { query_text: TENANT_MIGRATION })
    if (!e2) return NextResponse.json({ success: true, slug })
  }

  // If both passess failed, return the SQL for manual execution
  return NextResponse.json({
    error: "exec_sql RPC not available on tenant",
    detail: `Run manually in tenant Supabase Dashboard SQL editor:\n\n${TENANT_MIGRATION}`,
  }, { status: 400 })
}
