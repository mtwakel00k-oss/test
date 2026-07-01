import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseForRequest, supabaseForRequestAdmin, isTenantMismatch, parseSession, getTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { logAudit } from "@/lib/audit"
import { getAllImageUrls, setImageUrl, deleteImageUrl } from "@/lib/image-store"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

function getMasterServiceClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getTenantServiceClient(slug: string) {
  const config = await getTenantConfig(slug)
  if (!config?.supabase_url) return null
  const masterSb = getMasterServiceClient()
  let svcKey: string | undefined
  try {
    const { data: tRow } = await masterSb.from("tenants").select("supabase_service_key").eq("slug", slug).maybeSingle()
    if (tRow?.supabase_service_key) svcKey = tRow.supabase_service_key
  } catch (e) { logger.warn("Failed to get tenant service key from master DB", e) }
  if (svcKey) return createClient(config.supabase_url, svcKey)
  const isSameProject = config.supabase_url === env.NEXT_PUBLIC_SUPABASE_URL
  return isSameProject ? createClient(config.supabase_url, env.SUPABASE_SERVICE_ROLE_KEY!) : null
}

function getAdminRole(req: NextRequest): boolean {
  const session = parseSession(req.headers.get("cookie") || "")
  return session.role === "admin" || session.role === "owner"
}

export async function GET(req: NextRequest) {
  try {
    const sb = await supabaseForRequest(req)
    const { data, error } = await (sb.from("v_products_flat"))
      .select("*")
      .order("category")
      .order("id")

    if (error) {
      logger.error("Products API v_products_flat error: " + (error.message || JSON.stringify(error)))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await (sb.from("produits")).select("id, is_available").limit(1)
    } catch {
      logger.warn("is_available column missing — defaulting to true. Run tenant migration SQL in Supabase Dashboard to fix.")
    }

    const session = parseSession(req.headers.get("cookie") || "")
    const tenantSlug = session.slug || ""
    const memoryUrls = getAllImageUrls(tenantSlug)
    for (const item of data) {
      if (!item.image_url && memoryUrls[item.id]) {
        item.image_url = memoryUrls[item.id]
      }
    }

    return NextResponse.json(data)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "unknown"
    logger.error("Products API unexpected error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`products:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    if (!getAdminRole(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await req.json()
    const postSession = parseSession(req.headers.get("cookie") || "")
    const tenantSlug = postSession.slug || ""

    // Update existing product
    if (body.action === "update") {
      const { id, nom, categorie_id, description, image_url, sizes } = body
      if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 })

      const sb2 = await supabaseForRequestAdmin(req)
      const updates: Record<string, unknown> = {}
      if (nom !== undefined) updates.nom = nom
      if (categorie_id !== undefined) updates.categorie_id = categorie_id || null
      if (description !== undefined) updates.description = description || null
      if (image_url !== undefined) updates.image_url = image_url || null

      if (Object.keys(updates).length > 0) {
        const px = (await getTenantServiceClient(tenantSlug)) || sb2
        const { error: updErr } = await (px.from("produits")).update(updates).eq("id", id)
        if (updErr) {
          delete updates.image_url
          if (Object.keys(updates).length > 0) {
            const { error: retryErr } = await (px.from("produits")).update(updates).eq("id", id)
            if (retryErr) throw new Error(retryErr.message || JSON.stringify(retryErr))
          }
        }
      }

      if (Array.isArray(sizes)) {
        const px = (await getTenantServiceClient(tenantSlug)) || sb2
        const { data: tailles } = await (sb2.from("tailles")).select("id, code")
        const tailleMap: Record<string, number> = Object.fromEntries((tailles || []).map((t: { code: string; id: number }) => [t.code, t.id]))
        const missingCodes = sizes.filter(s => s.price != null || s.price_tomate != null || s.price_creme != null).filter(s => !tailleMap[s.code]).map(s => s.code)
        if (missingCodes.length > 0) {
          const { data: insT, error: insTErr } = await (px.from("tailles")).upsert(
            [...new Set(missingCodes)].map(code => ({ code, label: code === 'S' ? 'Small' : code === 'M' ? 'Medium' : code === 'L' ? 'Large' : code === 'XL' ? 'Extra Large' : code === 'XXL' ? 'Double Extra Large' : code })),
            { onConflict: 'code', ignoreDuplicates: false }
          )
          if (insTErr && insTErr.message?.includes('row-level security')) {
            throw new Error("لا يمكن تعديل السعر: جدول الأحجام (tailles) فارغ و RLS يمنع الإضافة. شغّل SQL التحديث من صفحة الإعدادات.")
          }
          if (Array.isArray(insT)) {
            for (const t of insT as Array<{code: string; id: number}>) tailleMap[t.code] = t.id
          }
          const { data: taillesRefresh } = await (sb2.from("tailles")).select("id, code")
          if (taillesRefresh) {
            for (const t of taillesRefresh) tailleMap[t.code] = t.id
          }
        }
        const { error: delErr } = await (px.from("prix")).delete().eq("produit_id", id)
        if (delErr) throw new Error("Failed to clear old prices: " + (delErr.message || JSON.stringify(delErr)))
        for (const s of sizes) {
          if (!s.price && !s.price_tomate && !s.price_creme) continue
          const targetTailleId: number | null | undefined = s.code === "NONE" ? null : tailleMap[s.code]
          if (targetTailleId === undefined) continue
          if (s.price != null) {
            const { error: insErr } = await (px.from("prix")).insert({
              produit_id: id, taille_id: targetTailleId, prix: s.price, disponible: true,
            })
            if (insErr) throw new Error("Failed to save price for " + s.code + ": " + (insErr.message || JSON.stringify(insErr)))
          } else {
            if (s.price_tomate != null) {
              const { error: ie } = await (px.from("prix")).insert({
                produit_id: id, taille_id: targetTailleId, base_sauce_id: 1, prix: s.price_tomate, disponible: true,
              })
              if (ie) throw new Error("Failed to save sauce_tomate for " + s.code + ": " + (ie.message || JSON.stringify(ie)))
            }
            if (s.price_creme != null) {
              const { error: ie } = await (px.from("prix")).insert({
                produit_id: id, taille_id: targetTailleId, base_sauce_id: 2, prix: s.price_creme, disponible: true,
              })
              if (ie) throw new Error("Failed to save creme_fraiche for " + s.code + ": " + (ie.message || JSON.stringify(ie)))
            }
          }
        }
      }

      if (image_url !== undefined) {
        if (image_url) setImageUrl(tenantSlug, id, image_url)
        else deleteImageUrl(tenantSlug, id)
      }

      logger.info("Product updated", { id, sizesCount: sizes?.length, tenantSlug })
      logAudit(sb2, req, { table_name: "produits", record_id: id, operation: "UPDATE", new_data: { nom, categorie_id, description, image_url, sizesCount: sizes?.length } })
      return NextResponse.json({ success: true })
    }

    // Create new product
    if (body.action === "create") {
      const { nom, categorie_id, description, image_url, sizes } = body
      if (!nom) return NextResponse.json({ error: "Missing product name" }, { status: 400 })

      const px = (await getTenantServiceClient(tenantSlug)) || await supabaseForRequestAdmin(req)
      const sb3 = await supabaseForRequestAdmin(req)
      const insertData: Record<string, unknown> = { nom, categorie_id: categorie_id || null, description: description || null }
      if (image_url) insertData.image_url = image_url

      const { data: initialData, error } = await (px.from("produits")).insert(insertData).select().single()
      let data = initialData
      if (error) {
        delete insertData.image_url
        const result = await (px.from("produits")).insert(insertData).select().single()
        if (result.error) throw new Error(result.error.message || JSON.stringify(result.error))
        data = result.data
      }

      if (Array.isArray(sizes) && data?.id) {
        const { data: tailles } = await (sb3.from("tailles")).select("id, code")
        const tailleMap: Record<string, number> = Object.fromEntries((tailles || []).map((t: { code: string; id: number }) => [t.code, t.id]))
        const px = (await getTenantServiceClient(tenantSlug)) || sb3
        const missingCodes = sizes.filter(s => s.price != null || s.price_tomate != null || s.price_creme != null).filter(s => s.code !== "NONE" && !tailleMap[s.code]).map(s => s.code)
        if (missingCodes.length > 0) {
          const { data: insT, error: insTErr } = await (px.from("tailles")).upsert(
            [...new Set(missingCodes)].map(code => ({ code, label: code === 'S' ? 'Small' : code === 'M' ? 'Medium' : code === 'L' ? 'Large' : code === 'XL' ? 'Extra Large' : code === 'XXL' ? 'Double Extra Large' : code })),
            { onConflict: 'code', ignoreDuplicates: false }
          )
          if (insTErr && insTErr.message?.includes('row-level security')) {
            throw new Error("لا يمكن إضافة السعر: جدول الأحجام (tailles) فارغ و RLS يمنع الإضافة. شغّل SQL التحديث من صفحة الإعدادات.")
          }
          if (Array.isArray(insT)) {
            for (const t of insT as Array<{code: string; id: number}>) tailleMap[t.code] = t.id
          }
          const { data: taillesRefresh } = await (sb3.from("tailles")).select("id, code")
          if (taillesRefresh) {
            for (const t of taillesRefresh) tailleMap[t.code] = t.id
          }
        }
        for (const s of sizes) {
          if (!s.price && !s.price_tomate && !s.price_creme) continue
          const targetTailleId: number | null | undefined = s.code === "NONE" ? null : tailleMap[s.code]
          if (targetTailleId === undefined) continue
          if (s.price != null) {
            const { error: ie } = await (px.from("prix")).insert({
              produit_id: data.id, taille_id: targetTailleId, prix: s.price, disponible: true,
            })
            if (ie) throw new Error(ie.message || JSON.stringify(ie))
          } else {
            if (s.price_tomate != null) {
              const { error: ie } = await (px.from("prix")).insert({
                produit_id: data.id, taille_id: targetTailleId, base_sauce_id: 1, prix: s.price_tomate, disponible: true,
              })
              if (ie) throw new Error(ie.message || JSON.stringify(ie))
            }
            if (s.price_creme != null) {
              const { error: ie } = await (px.from("prix")).insert({
                produit_id: data.id, taille_id: targetTailleId, base_sauce_id: 2, prix: s.price_creme, disponible: true,
              })
              if (ie) throw new Error(ie.message || JSON.stringify(ie))
            }
          }
        }
      }

      if (image_url) setImageUrl(tenantSlug, data.id, image_url)

      logger.info("Product created", { id: data.id, nom, sizesCount: sizes?.length, tenantSlug })
      logAudit(sb3, req, { table_name: "produits", record_id: data.id, operation: "INSERT", new_data: { nom, categorie_id, description, image_url, sizesCount: sizes?.length } })
      return NextResponse.json(data)
    }

    // Toggle availability (existing)
    const { id, is_available } = body
    if (id == null) return NextResponse.json({ error: "Missing product id" }, { status: 400 })

    const next = !!is_available
    const pxt = (await getTenantServiceClient(tenantSlug)) || await supabaseForRequestAdmin(req)
    const { error } = await (pxt.from("produits"))
      .update({ is_available: next })
      .eq("id", id)

    if (error) {
      if (error.message?.includes("does not exist") || error.code === "42703") {
        return NextResponse.json({ error: "Tenant DB missing 'is_available' column. Apply tenant migration SQL in Supabase Dashboard." }, { status: 400 })
      }
      throw new Error(error.message || JSON.stringify(error))
    }

    logAudit(pxt, req, { table_name: "produits", record_id: id, operation: "UPDATE", new_data: { is_available: next }, old_data: { is_available: !next } })
    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Toggle failed"
    logger.error("Toggle error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`products:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    if (!getAdminRole(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const force = searchParams.get("force") === "1"
    if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 })

    const sessionDel = parseSession(req.headers.get("cookie") || "")
    const pxDel = (await getTenantServiceClient(sessionDel.slug || "")) || await supabaseForRequestAdmin(req)
    let imageUrl: string | null = null
    try {
      const { data: product } = await (pxDel.from("produits")).select("image_url").eq("id", id).single()
      if (product?.image_url) imageUrl = product.image_url
    } catch (e) { logger.warn("Failed to fetch product image_url for deletion", e) }
    if (imageUrl) {
      try {
        const path = imageUrl.split("/product-images/")[1]
        if (path) await pxDel.storage.from("product-images").remove([path])
      } catch (e2) { logger.warn("Failed to remove storage image", e2) }
    }

    const { error: prixErr } = await (pxDel.from("prix")).delete().eq("produit_id", id)
    if (prixErr) throw new Error(prixErr.message || JSON.stringify(prixErr))

    if (force) {
      await (pxDel.from("order_items")).delete().eq("product_id", id)
    }

    const { error } = await (pxDel.from("produits")).delete().eq("id", id)
    if (error) {
      if (error && "code" in error && (error as { code: string }).code === "23503") {
        return NextResponse.json({
          error: "لا يمكن حذف هذه الوجبة لأنها مرتبطة بطلبات سابقة. يمكنك تعطيلها بدلاً من ذلك.",
          code: "FK_VIOLATION",
        }, { status: 409 })
      }
      throw new Error(error.message || JSON.stringify(error))
    }

    deleteImageUrl(sessionDel.slug || "", Number(id))
    logger.info("Product deleted", { id })
    logAudit(pxDel, req, { table_name: "produits", record_id: id, operation: "DELETE" })
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed"
    logger.error("Delete error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
