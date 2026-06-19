import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get("slug")
  const number = searchParams.get("number")
  if (!slug || !number) {
    return NextResponse.json({ error: "Missing slug or number" }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://simploo.vercel.app"
  const url = `${baseUrl}/${slug}/menu?table=${number}`

  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 300, color: { dark: "#0f0f0f", light: "#ffffff" } })

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, immutable" },
  })
}
