import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseForRequestAdmin, isTenantMismatch, parseSession, getTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { logAudit } from "@/lib/audit"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { bulkUpdateSchema, validationError } from "@/lib/validations"

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

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`admin:bulk-update:${getClientIp(req)}`, { max: 10, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = bulkUpdateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    const { product_ids, action } = parsed.data
    const tenantSlug = session.slug || ""

    const sb = await supabaseForRequestAdmin(req)
    const svc = (await getTenantServiceClient(tenantSlug)) || sb
    const errors: string[] = []
    let affected = 0

    if (action === "set_availability") {
      const { is_available } = body
      if (typeof is_available !== "boolean") {
        return NextResponse.json({ error: "is_available must be a boolean" }, { status: 400 })
      }
      for (const id of product_ids) {
        const { error } = await svc.from("produits").update({ is_available }).eq("id", id)
        if (error) errors.push(`Product ${id}: ${error.message}`)
        else affected++
      }
      if (errors.length > 0 && errors.every(e => e.includes("does not exist") || e.includes("42703"))) {
        return NextResponse.json({ error: "Tenant DB missing 'is_available' column. Apply tenant migration SQL in Supabase Dashboard.", errors }, { status: 400 })
      }
      logAudit(sb, req, { table_name: "produits", record_id: `bulk:${product_ids.join(",")}`, operation: "UPDATE", new_data: { action: "set_availability", is_available, count: product_ids.length } })
    } else if (action === "set_price") {
      const { size_code, price, sauce_id } = body
      if (!size_code || price == null) {
        return NextResponse.json({ error: "size_code and price required" }, { status: 400 })
      }
      // Resolve taille_id from code
      const { data: tailles } = await sb.from("tailles").select("id, code")
      const tailleMap: Record<string, number> = Object.fromEntries((tailles || []).map((t: { code: string; id: number }) => [t.code, t.id]))
      const targetTailleId = size_code === "NONE" ? null : tailleMap[size_code]
      if (targetTailleId === undefined) {
        return NextResponse.json({ error: `Unknown size code: ${size_code}` }, { status: 400 })
      }

      for (const id of product_ids) {
        // Delete existing price for this size/sauce combo
        const delQuery = svc.from("prix").delete().eq("produit_id", id).eq("taille_id", targetTailleId)
        if (sauce_id != null) {
          delQuery.eq("base_sauce_id", sauce_id)
        } else {
          delQuery.is("base_sauce_id", null)
        }
        const { error: delErr } = await delQuery
        if (delErr) { errors.push(`Product ${id} delete price: ${delErr.message}`); continue }

        // Insert new price
        const insertData: Record<string, unknown> = { produit_id: id, taille_id: targetTailleId, prix: price, disponible: true }
        if (sauce_id != null) insertData.base_sauce_id = sauce_id
        const { error: insErr } = await svc.from("prix").insert(insertData)
        if (insErr) errors.push(`Product ${id} insert price: ${insErr.message}`)
        else affected++
      }
      logAudit(sb, req, { table_name: "prix", record_id: `bulk:${product_ids.join(",")}`, operation: "UPDATE", new_data: { action: "set_price", size_code, price, sauce_id, count: product_ids.length } })
    } else if (action === "set_category") {
      const { categorie_id } = body
      if (categorie_id == null) {
        return NextResponse.json({ error: "categorie_id required" }, { status: 400 })
      }
      const { error } = await svc.from("produits").update({ categorie_id: categorie_id || null }).in("id", product_ids)
      if (error) errors.push(error.message)
      else affected = product_ids.length
      logAudit(sb, req, { table_name: "produits", record_id: `bulk:${product_ids.join(",")}`, operation: "UPDATE", new_data: { action: "set_category", categorie_id, count: product_ids.length } })
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, affected, errors })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Bulk-update POST failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
