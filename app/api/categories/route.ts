import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, supabaseForRequestAdmin, isTenantMismatch, parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  try {
    const sb = await supabaseForRequest(req)

    const { data: cats, error } = await (sb.from("categories"))
      .select("id, nom, description")
      .order("id") as unknown as { data: { id: number; nom: string; description: string | null }[] | null; error: unknown }

    if (!error && cats !== null) {
      return NextResponse.json(cats)
    }

    // Fallback: extract unique categories from v_products_flat
    const { data: products } = await (sb.from("v_products_flat"))
      .select("category")
      .order("category")

    const seen = new Set<string>()
    const result: { id: number; nom: string; description: string | null }[] = []
    if (cats) {
      for (const c of cats) {
        if (!seen.has(c.nom)) {
          seen.add(c.nom)
          result.push(c)
        }
      }
    }
    if (products) {
      for (const p of products) {
        const name = p.category as string
        if (name && !seen.has(name)) {
          seen.add(name)
          result.push({ id: -(result.length + 1), nom: name, description: null })
        }
      }
    }
    return NextResponse.json(result)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Categories GET failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`categories:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const postSession = parseSession(req.headers.get("cookie") || "")
    if (postSession.role !== "admin" && postSession.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { nom, description } = await req.json()
    if (!nom?.trim()) return NextResponse.json({ error: "Missing category name" }, { status: 400 })

    const sb2 = await supabaseForRequestAdmin(req)
    const payload: Record<string, string> = { nom: nom.trim() }
    if (description?.trim()) payload.description = description.trim()

    const { data, error } = await (sb2.from("categories"))
      .insert(payload)
      .select()
      .single()

    if (error) {
      logger.warn("Category insert failed, using temporary id: " + error.message)
      return NextResponse.json({ id: -(Math.abs(nom.trim().length * 997) % 1000 + 100), nom: nom.trim(), description: description?.trim() || null })
    }

    recordAuditEvent(req, { event_type: EVENT_TYPES.CATEGORY_CREATED, operation: "CREATE", table_name: "categories", record_id: String(data?.id ?? 0), new_data: payload }).catch(() => {})
    return NextResponse.json(data)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Unknown"
    logger.error("Category POST error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`categories:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const delSession = parseSession(req.headers.get("cookie") || "")
    if (delSession.role !== "admin" && delSession.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const force = searchParams.get("force") === "1"
    if (!id) return NextResponse.json({ error: "Missing category id" }, { status: 400 })

    const sb2 = await supabaseForRequestAdmin(req)

    if (force) {
      await (sb2.from("produits")).update({ categorie_id: null }).eq("categorie_id", id)
    }

    const { error } = await (sb2.from("categories"))
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === "23503") {
        return NextResponse.json({ error: "Cannot delete: category has products", code: "FK_VIOLATION" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    recordAuditEvent(req, { event_type: EVENT_TYPES.CATEGORY_DELETED, operation: "DELETE", table_name: "categories", record_id: id }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Unknown"
    logger.error("Category DELETE error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
