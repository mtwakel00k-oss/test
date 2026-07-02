import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest } from "@/lib/tenant"

export async function POST(req: NextRequest) {
  try {
    const { code, slug, cart_total } = await req.json()
    if (!code || !slug) {
      return NextResponse.json({ error: "code and slug required" }, { status: 400 })
    }

    const sb = await supabaseForRequest(req)

    const { data: promo, error } = await sb
      .from("promotions")
      .select("*")
      .eq("tenant_slug", slug)
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle()

    if (error || !promo) {
      return NextResponse.json({ error: "كود الخصم غير صالح" }, { status: 404 })
    }

    // Check date range
    const now = new Date()
    const startsAt = new Date(promo.starts_at)
    const endsAt = promo.ends_at ? new Date(promo.ends_at) : null

    if (now < startsAt) {
      return NextResponse.json({ error: "كود الخصم لم يبدأ بعد" }, { status: 400 })
    }
    if (endsAt && now > endsAt) {
      return NextResponse.json({ error: "كود الخصم انتهت صلاحيته" }, { status: 400 })
    }

    // Check usage limit
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return NextResponse.json({ error: "تم استنفاذ عدد استخدامات كود الخصم" }, { status: 400 })
    }

    // Check min order
    const cartTotal = Number(cart_total || 0)
    if (cartTotal < Number(promo.min_order_amount)) {
      return NextResponse.json({
        error: `الحد الأدنى للطلب: ${Number(promo.min_order_amount).toFixed(2)} د.ج`,
      }, { status: 400 })
    }

    // Calculate discount
    let discountAmount = 0
    const type = promo.type
    const value = Number(promo.value)

    if (type === "percentage") {
      discountAmount = Math.round((cartTotal * value) / 100 * 100) / 100
    } else if (type === "fixed") {
      discountAmount = Math.min(value, cartTotal)
    } else if (type === "bogo") {
      // BOGO: discount = price of cheapest item (simplified)
      discountAmount = value // value holds the max discount for BOGO
    }

    return NextResponse.json({
      valid: true,
      promotion: {
        id: promo.id,
        name: promo.name,
        type,
        value,
        discount_amount: discountAmount,
        label: type === "percentage" ? `${value}%` : `${value.toFixed(2)} د.ج`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
