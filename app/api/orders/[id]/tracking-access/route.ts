import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkFeatureAccess } from "@/lib/subscription"
import { logger } from "@/lib/logger"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const slug = req.headers.get("x-tenant-slug") || ""
    if (!slug) {
      return NextResponse.json({ hasLiveTracking: false })
    }

    const masterSb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    const { data: tenant } = await masterSb
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single()

    if (!tenant) {
      return NextResponse.json({ hasLiveTracking: false })
    }

    const hasLiveTracking = await checkFeatureAccess(tenant.id, "hasLiveTracking")
    return NextResponse.json({ hasLiveTracking })
  } catch (e) {
    logger.error("tracking-access failed", e)
    return NextResponse.json({ hasLiveTracking: false })
  }
}
