import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getTenantConfig, parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"

const TENANT_MIGRATION = `
-- ============================================================
--  Tenant Migration V3 — Self-healing schema (idempotent)
--  Safe to re-run; all statements use IF NOT EXISTS / DROP IF
-- ============================================================

-- 1) Missing columns on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INT;
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

-- 9) Atomic daily order numbers
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
`

const MASTER_SQL = `
-- Master project migration — self-healing
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
-- Run this to populate your own tenant's service key:
-- UPDATE tenants SET supabase_service_key = '<your_tenant_svc_key>' WHERE supabase_url = '<tenant_supabase_url>';
`

export async function GET(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const results: { step: string; status: string; detail?: string }[] = []
  const slug = new URL(req.url).searchParams.get("slug") || ""

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
  const runSession = parseSession(req.headers.get("cookie") || "")
  if (runSession.role !== "owner" || runSession.slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const { slug } = body

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }

  const tenant = await getTenantConfig(slug)
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  // Look up tenant's own service key from DB
  const masterSb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: tenantRow } = await masterSb.from("tenants").select("supabase_service_key").eq("slug", slug).maybeSingle()
  const tenantServiceKey = tenantRow?.supabase_service_key || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!tenantServiceKey) {
    return NextResponse.json({ error: "No service key available for this tenant" }, { status: 500 })
  }

  try {
    const tenantSvc = createClient(tenant.supabase_url, tenantServiceKey)
    const { error } = await tenantSvc.rpc("exec_sql", { query_text: TENANT_MIGRATION })
    if (error) {
      logger.error("Tenant migration exec_sql failed", error)
      return NextResponse.json({
        error: "exec_sql RPC not available on tenant",
        detail: `Run manually in tenant Supabase Dashboard SQL editor:\n\n${TENANT_MIGRATION}`,
      }, { status: 400 })
    }
    return NextResponse.json({ success: true, slug })
  } catch {
    return NextResponse.json({
      error: "Could not execute SQL on tenant",
      detail: `Run manually in tenant Supabase Dashboard SQL editor:\n\n${TENANT_MIGRATION}`,
    }, { status: 500 })
  }
}
