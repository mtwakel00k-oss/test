import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseSession, getTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"

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

    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    const fileName = `${tenantSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const supabase = createClient(tenantConfig.supabase_url, tenantConfig.supabase_anon_key)

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
