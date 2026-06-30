import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving"
const OSRM_TIMEOUT_MS = 5_000

interface OsrmResponse {
  code: string
  routes?: Array<{
    distance: number
    duration: number
    geometry: {
      coordinates: [number, number][]
      type: string
    }
  }>
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(`route-eta:${getClientIp(req)}`, { max: 30, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const driverLat = searchParams.get("driverLat")
    const driverLng = searchParams.get("driverLng")
    const customerLat = searchParams.get("customerLat")
    const customerLng = searchParams.get("customerLng")

    if (!driverLat || !driverLng || !customerLat || !customerLng) {
      return NextResponse.json({ error: "Missing driverLat, driverLng, customerLat, customerLng" }, { status: 400 })
    }

    const dlat = Number(driverLat)
    const dlng = Number(driverLng)
    const clat = Number(customerLat)
    const clng = Number(customerLng)

    if (isNaN(dlat) || isNaN(dlng) || isNaN(clat) || isNaN(clng)) {
      return NextResponse.json({ error: "Invalid coordinate values" }, { status: 400 })
    }

    // OSRM expects lng,lat (not lat,lng)
    const url = `${OSRM_BASE}/${dlng},${dlat};${clng},${clat}?overview=full&geometries=geojson&steps=true`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)

    let osrmRes: Response
    try {
      osrmRes = await fetch(url, { signal: controller.signal, headers: { "Accept": "application/json" } })
    } finally {
      clearTimeout(timeout)
    }

    if (!osrmRes.ok) {
      const body = await osrmRes.text().catch(() => "")
      return NextResponse.json({
        error: "OSRM routing failed",
        distance: null,
        duration: null,
        geometry: null,
        osrmStatus: osrmRes.status,
        osrmBody: body.slice(0, 500),
      }, { status: 502 })
    }

    const data: OsrmResponse = await osrmRes.json()

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return NextResponse.json({
        error: "OSRM returned no route",
        distance: null,
        duration: null,
        geometry: null,
      }, { status: 502 })
    }

    const route = data.routes[0]

    return NextResponse.json({
      orderId: id,
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry.coordinates,
      osrmStatus: 200,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      error: msg,
      distance: null,
      duration: null,
      geometry: null,
    }, { status: 502 })
  }
}
