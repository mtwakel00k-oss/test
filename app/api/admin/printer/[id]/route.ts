import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { supabaseForRequestAdmin } from "@/lib/tenant"
import type { PrinterConfigInput } from "@/lib/escpos"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const { id } = await params
  const body: PrinterConfigInput & { is_default?: boolean } = await req.json()
  const sb = await supabaseForRequestAdmin(req)

  if (body.is_default) {
    await sb
      .from("printer_config")
      .update({ is_default: false })
      .eq("tenant_slug", session.slug)
      .eq("is_default", true)
      .neq("id", id)
  }

  const { data, error } = await sb
    .from("printer_config")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_slug", session.slug)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ printer: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const { id } = await params
  const sb = await supabaseForRequestAdmin(req)
  const { error } = await sb
    .from("printer_config")
    .delete()
    .eq("id", id)
    .eq("tenant_slug", session.slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
