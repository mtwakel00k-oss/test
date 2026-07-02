import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { supabaseForRequestAdmin } from "@/lib/tenant"

export async function GET(req: NextRequest) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const sb = await supabaseForRequestAdmin(req)
  const { data, error } = await sb
    .from("promotions")
    .select("*, promotion_products(product_id)")
    .eq("tenant_slug", session.slug)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ promotions: data })
}

export async function POST(req: NextRequest) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const body = await req.json()
  const sb = await supabaseForRequestAdmin(req)

  const { data, error } = await sb
    .from("promotions")
    .insert({
      tenant_slug: session.slug,
      name: body.name,
      description: body.description || "",
      code: body.code || null,
      type: body.type,
      value: body.value,
      min_order_amount: body.min_order_amount || 0,
      starts_at: body.starts_at || new Date().toISOString(),
      ends_at: body.ends_at || null,
      usage_limit: body.usage_limit || null,
      is_active: body.is_active ?? true,
      applicable_to: body.applicable_to || "all",
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert promotion_products if specific
  if (body.applicable_to === "specific" && body.product_ids?.length > 0) {
    await sb.from("promotion_products").insert(
      body.product_ids.map((pid: number) => ({ promotion_id: data.id, product_id: pid }))
    )
  }

  return NextResponse.json({ promotion: data })
}
