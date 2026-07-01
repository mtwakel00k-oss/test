import { NextRequest, NextResponse } from "next/server"
import { parseSession, getTenantConfig, createTenantSupabaseClient } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { randomUUID } from "crypto"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import sharp from "sharp"

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])
const MAX_SIZE = 5 * 1024 * 1024
const MAX_WIDTH = 800
const JPEG_QUALITY = 80

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`upload:${getClientIp(req)}`, { max: 10, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Resolve tenant slug: session → x-tenant-slug header → Referer path
    let tenantSlug = session.slug || req.headers.get("x-tenant-slug") || ""
    if (!tenantSlug) {
      const ref = req.headers.get("referer") || ""
      const m = ref.match(/\/([^/]+)\/(?:admin|menu|pos|kitchen|order|login|driver)\b/)
      if (m) tenantSlug = m[1]
    }
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

    const supabase = createTenantSupabaseClient(tenantConfig.supabase_url, tenantConfig.supabase_anon_key)

    const raw = Buffer.from(await file.arrayBuffer())
    const img = sharp(raw)
    const meta = await img.metadata()
    const w = meta.width || 999
    const resizeW = w > MAX_WIDTH ? MAX_WIDTH : undefined
    const q = JPEG_QUALITY

    let compressed: Buffer
    let contentType: string
    let ext: string

    if (file.type === "image/gif") {
      // Reject GIF uploads: sharp cannot re-encode them safely, so we'd
      // store raw bytes as-is, creating a vector for animated GIF exploits.
      return NextResponse.json({ error: "GIF uploads are not supported. Convert to PNG or WebP first." }, { status: 400 })
    } else {
      const pipeline = img.resize(resizeW, undefined, { fit: "inside", withoutEnlargement: true })
      compressed = await pipeline.jpeg({ quality: q, progressive: true }).toBuffer()
      contentType = "image/jpeg"
      ext = "jpg"
    }

    const fileName = `${tenantSlug}/${randomUUID()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from("product-images")
      .upload(fileName, compressed, { contentType, upsert: false })

    logger.info("Image compressed", {
      tenant: tenantSlug, original: file.size, compressed: compressed.length,
      dims: `${meta.width}x${meta.height} → ${resizeW ? `${resizeW}x?` : `${meta.width}x${meta.height}`}`,
    })

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
