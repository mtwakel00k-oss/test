import { NextRequest, NextResponse } from "next/server"
import { parseSession, getTenantConfig, createTenantSupabaseClient } from "@/lib/tenant"
import { logger } from "@/lib/logger"

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])
const MAX_SIZE = 5 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}

export async function POST(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantSlug = session.slug
    if (!tenantSlug) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const tenantConfig = await getTenantConfig(tenantSlug)
    if (!tenantConfig) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPEG, WebP, GIF" },
        { status: 400 },
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 })
    }

    const ext = EXT_BY_MIME[file.type] ?? "bin"
    const fileName = `${tenantSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const supabase = createTenantSupabaseClient(tenantConfig.supabase_url, tenantConfig.supabase_anon_key)

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await supabase.storage
      .from("product-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (uploadErr) {
      if (uploadErr.message?.includes("bucket")) {
        return NextResponse.json({
          error: "Storage bucket not configured. Ask the administrator to run the setup migration.",
        }, { status: 400 })
      }
      throw new Error(uploadErr.message || JSON.stringify(uploadErr))
    }

    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName)

    logger.info("Image uploaded", { tenant: tenantSlug, fileName, url: publicUrl })
    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed"
    logger.error("Upload error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
