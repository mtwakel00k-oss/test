import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { supabaseForRequestAdmin } from "@/lib/tenant"
import { EscPosBuilder, Justification, CharSize, CutMode, sendToNetworkPrinter } from "@/lib/escpos"

export async function POST(req: NextRequest) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const { printer_id } = await req.json()
  if (!printer_id) return NextResponse.json({ error: "printer_id required" }, { status: 400 })

  const sb = await supabaseForRequestAdmin(req)
  const { data: printer, error: pe } = await sb
    .from("printer_config")
    .select("*")
    .eq("id", printer_id)
    .eq("tenant_slug", session.slug)
    .single()

  if (pe || !printer) return NextResponse.json({ error: "Printer not found" }, { status: 404 })

  const p = new EscPosBuilder()
  p.init()
  p.feed(2)
  p.justify(Justification.CENTER)
  p.bold(true)
  p.charSize(CharSize.WIDE_TALL)
  p.writeline("TEST PRINT")
  p.charSize(CharSize.NORMAL)
  p.bold(false)
  p.feed(1)
  p.writeline("If you can read this,")
  p.writeline("your printer is working!")
  p.feed(1)
  p.hr("=", printer.charset_per_line || 42)
  p.writeline(`Date: ${new Date().toLocaleString()}`)
  p.writeline(`Printer: ${printer.name}`)
  p.writeline(`Type: ${printer.connection_type}`)
  p.feed(2)
  p.justify(Justification.CENTER)
  p.writeline("✓ OK")
  p.feed(3)
  if (printer.auto_cut) p.cut(CutMode.FULL)

  const data = p.buildBuffer()

  if (printer.connection_type === "network") {
    try {
      await sendToNetworkPrinter(data, {
        ipAddress: printer.ip_address,
        port: printer.port,
      })
      return NextResponse.json({ ok: true, message: "Test page sent to printer" })
    } catch (err: any) {
      return NextResponse.json({ error: `Print failed: ${err.message}` }, { status: 502 })
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Send from the browser",
    data: Array.from(data),
    encoding: "escpos",
  })
}
