import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { invalidateTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"

let _supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    _supabase = createClient(url, key)
  }
  return _supabase
}

async function getSession(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")
  if (!sessionCookie) return null
  try {
    return JSON.parse(sessionCookie.value) as { role?: string; slug?: string }
  } catch (e) {
    logger.error("Failed to parse session cookie in logo route", e)
    return null
  }
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

    const { data: tenantRow } = await supabase.from("tenants").select("name, logo_url").eq("slug", slug).maybeSingle<{ name: string; logo_url: string | null }>()
    if (tenantRow) {
      return NextResponse.json({ name: tenantRow.name || "", logo_url: tenantRow.logo_url || null, slug })
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
    const session = await getSession(req)
    if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    const slug = session!.slug
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 })
    const body = await req.json()
    const updates: Record<string, string | null> = {}
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url
    if (!Object.keys(updates).length) return NextResponse.json({ error: "No valid fields" }, { status: 400 })
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: "Server config error" }, { status: 500 })

    const { error } = await (supabase.from("tenants") as unknown as { update: (u: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } }).update(updates).eq("slug", slug)
    if (error) {
      logger.error("Tenant PATCH failed", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    invalidateTenantConfig(slug)
    logger.info("Tenant PATCH", { slug, updates: Object.keys(updates) })
    return NextResponse.json({ ok: true, ...updates })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let slug = "unknown"
  try {
    const session = await getSession(req)
    if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    slug = session!.slug!
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
