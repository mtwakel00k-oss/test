import { NextRequest, NextResponse } from "next/server"
import { checkFeature } from "@/lib/check-feature"
import { logger } from "@/lib/logger"

export async function GET(
  req: NextRequest,
  _params: { params: Promise<{ id: string }> },
) {
  try {
    const slug = req.headers.get("x-tenant-slug") || ""
    if (!slug) {
      return NextResponse.json({ hasLiveTracking: false })
    }

    const hasLiveTracking = await checkFeature(slug, "hasLiveTracking")
    const hasRatings = await checkFeature(slug, "hasRatings")
    return NextResponse.json({ hasLiveTracking, hasRatings })
  } catch (e) {
    logger.error("tracking-access failed", e)
    return NextResponse.json({ hasLiveTracking: false })
  }
}
