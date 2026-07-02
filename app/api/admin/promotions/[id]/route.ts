import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { supabaseForRequestAdmin } from "@/lib/tenant"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const { id } = await params
  const body = await req.json()
  const sb = await supabaseForRequestAdmin(req)

  const { data, error } = await sb
    .from("promotions")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_slug", session.slug)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update promotion_products if applicable_to changed
  if (body.product_ids) {
    await sb.from("promotion_products").delete().eq("promotion_id", id)
    if (body.product_ids.length > 0) {
      await sb.from("promotion_products").insert(
        body.product_ids.map((pid: number) => ({ promotion_id: id, product_id: pid }))
      )
    }
  }

  return NextResponse.json({ promotion: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const { id } = await params
  const sb = await supabaseForRequestAdmin(req)
  const { error } = await sb.from("promotions").delete().eq("id", id).eq("tenant_slug", session.slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
