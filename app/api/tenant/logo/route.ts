import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { invalidateTenantConfig, parseSession, getTenantConfig, readIsOpenFromStorage, writeIsOpenToStorage } from "@/lib/tenant"
import { logAudit } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

let _supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!_supabase) {
    const url = env.NEXT_PUBLIC_SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    _supabase = createClient(url, key)
  }
  return _supabase
}

function getSession(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (!session.role) return null
  if (!session.slug) session.slug = req.headers.get("x-tenant-slug") || ""
  return session
}

function isAdmin(session: { role?: string } | null): boolean {
  return !!session && (session.role === "admin" || session.role === "owner")
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    const slug = req.headers.get("x-tenant-slug") || session?.slug || ""
    if (!slug) return NextResponse.json({ name: "", logo_url: null })
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ name: "", logo_url: null })

    const { data: tenantRow, error: tenantErr } = await supabase.from("tenants").select("name, logo_url, brand_color, brand_text_color, is_open").eq("slug", slug).maybeSingle<{ name: string; logo_url: string | null; brand_color: string | null; brand_text_color: string | null; is_open: boolean | null }>()
    if (tenantRow || tenantErr?.message?.includes("does not exist")) {
      let isOpen = true
      if (tenantRow && typeof tenantRow.is_open === "boolean") {
        isOpen = tenantRow.is_open
      } else {
        const stored = await readIsOpenFromStorage(slug)
        if (stored !== null) isOpen = stored
      }
      const name = tenantRow?.name || ""
      const logoUrl = tenantRow?.logo_url || null
      const brandColor = tenantRow?.brand_color || null
      const brandTextColor = tenantRow?.brand_text_color || null
      return NextResponse.json({ name, logo_url: logoUrl, slug, brand_color: brandColor, brand_text_color: brandTextColor, is_open: isOpen })
    }

    // Fallback: try storage bucket
    try {
      const { data: files } = await supabase.storage.from("logos").list(slug, { limit: 5 })
      if (files?.length) {
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(`${slug}/${files[0].name}`)
        return NextResponse.json({ name: "", logo_url: urlData.publicUrl })
      }
    } catch (e) {
      logger.warn("Logo storage fallback failed", e)
    }

    return NextResponse.json({ name: "", logo_url: null })
  } catch (e) {
    logger.error("Logo GET failed", e)
    return NextResponse.json({ name: "", logo_url: null })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`tenant:logo:${getClientIp(req)}`, { max: 10, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = await getSession(req)
    if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    let slug = session!.slug
    if (!slug) slug = req.headers.get("x-tenant-slug") || ""
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 })
    const body = await req.json()
    const updates: Record<string, string | null | boolean> = {}
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url
    if (typeof body.brand_color === "string") updates.brand_color = body.brand_color
    if (typeof body.brand_text_color === "string") updates.brand_text_color = body.brand_text_color
    if (typeof body.is_open === "boolean") updates.is_open = body.is_open
    if (!Object.keys(updates).length) return NextResponse.json({ error: "No valid fields" }, { status: 400 })
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: "Server config error" }, { status: 500 })

    const { error } = await (supabase.from("tenants") as unknown as { update: (u: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } }).update(updates).eq("slug", slug)
    if (error?.message?.includes("does not exist") && typeof body.is_open === "boolean") {
      logger.warn("Tenant PATCH column missing, falling back to storage", error)
      const ok = await writeIsOpenToStorage(slug, body.is_open)
      if (!ok) return NextResponse.json({ error: "Storage fallback failed" }, { status: 500 })
      invalidateTenantConfig(slug)
      logStatusToggle(req, slug, body.is_open)
      return NextResponse.json({ ok: true, is_open: body.is_open })
    }
    if (error) {
      logger.error("Tenant PATCH failed", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    invalidateTenantConfig(slug)
    if (typeof body.is_open === "boolean") logStatusToggle(req, slug, body.is_open)
    logger.info("Tenant PATCH", { slug, updates: Object.keys(updates) })
    return NextResponse.json({ ok: true, ...updates })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 500 })
  }

  async function logStatusToggle(req: NextRequest, slug: string, isOpen: boolean): Promise<void> {
    try {
      const cfg = await getTenantConfig(slug)
      if (!cfg) return
      const tenantSb = createClient(cfg.supabase_url, cfg.supabase_anon_key)
      logAudit(tenantSb, req, {
        table_name: "tenants",
        record_id: slug,
        operation: "UPDATE",
        new_data: { is_open: isOpen, action: "status_toggle" },
      })
    } catch { /* fire-and-forget */ }
  }
}

export async function POST(req: NextRequest) {
  let slug = "unknown"
  try {
    const rl = await checkRateLimit(`tenant:logo:${getClientIp(req)}`, { max: 10, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = await getSession(req)
    if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    slug = session!.slug || req.headers.get("x-tenant-slug") || ""
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    const fileName = `${slug}/logo.${ext}`

    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: "Server config error" }, { status: 500 })

    const body = await file.arrayBuffer()
    const { error: uploadErr } = await supabase.storage.from("logos").upload(fileName, body, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(fileName)

    try {
      const { error: updateErr } = await (supabase.from("tenants") as unknown as { update: (u: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } }).update({ logo_url: publicUrl }).eq("slug", slug)
      if (updateErr) logger.warn("DB persist skipped: " + updateErr.message)
    } catch (e) {
      logger.warn("DB persist exception", e)
    }

    invalidateTenantConfig(slug)
    logger.info("Logo uploaded", { slug, url: publicUrl })
    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown upload error"
    logger.error(`Logo POST error [${slug}]: ` + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
