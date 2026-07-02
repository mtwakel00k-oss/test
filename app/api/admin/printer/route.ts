import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { supabaseForRequestAdmin } from "@/lib/tenant"
import type { PrinterConfig, PrinterConfigInput } from "@/lib/escpos"

export async function GET(req: NextRequest) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const sb = await supabaseForRequestAdmin(req)
  const { data, error } = await sb
    .from("printer_config")
    .select("*")
    .eq("tenant_slug", session.slug)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ printers: data as PrinterConfig[] })
}

export async function POST(req: NextRequest) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const body: PrinterConfigInput & { is_default?: boolean } = await req.json()
  const sb = await supabaseForRequestAdmin(req)

  if (body.is_default) {
    await sb
      .from("printer_config")
      .update({ is_default: false })
      .eq("tenant_slug", session.slug)
      .eq("is_default", true)
  }

  const { data, error } = await sb
    .from("printer_config")
    .insert({
      tenant_slug: session.slug,
      name: body.name || "Default Printer",
      connection_type: body.connection_type || "network",
      ip_address: body.ip_address || "",
      port: body.port || 9100,
      paper_width: body.paper_width || 80,
      charset_per_line: body.charset_per_line || 42,
      receipt_lang: body.receipt_lang || "ar",
      header_text: body.header_text || "",
      footer_text: body.footer_text || "",
      primary_color: body.primary_color || "#000000",
      show_logo: body.show_logo ?? true,
      print_receipt: body.print_receipt ?? true,
      print_kitchen: body.print_kitchen ?? false,
      copies_receipt: body.copies_receipt || 1,
      copies_kitchen: body.copies_kitchen || 1,
      auto_cut: body.auto_cut ?? true,
      is_default: body.is_default ?? false,
      enabled: body.enabled ?? true,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ printer: data as PrinterConfig })
}
