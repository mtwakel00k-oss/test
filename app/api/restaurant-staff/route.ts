import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, isTenantMismatch } from "@/lib/tenant"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  try {
    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("restaurant_staff").select("*").order("name")
    if (error) {
      if (error.message.includes("does not exist") || error.code === "PGRST205") return NextResponse.json([])
      throw new Error(error.message)
    }
    return NextResponse.json(data || [])
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("restaurant-staff GET failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, role } = body
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("restaurant_staff").insert({
      name,
      role: role || "cashier",
      is_active: true,
    }).select().single()

    if (error) throw new Error(error.message)
    logger.info("Staff created", { id: data.id, name })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("restaurant-staff POST failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, role, is_active } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (role !== undefined) updates.role = role
    if (is_active !== undefined) updates.is_active = is_active
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("restaurant_staff").update(updates).eq("id", id).select().single()
    if (error) throw new Error(error.message)

    logger.info("Staff updated", { id })
    return NextResponse.json(data)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("restaurant-staff PATCH failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 })

    const sb = await supabaseForRequest(req)
    const { error } = await sb.from("restaurant_staff").delete().eq("id", id)
    if (error) throw new Error(error.message)

    logger.info("Staff deleted", { id })
    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("restaurant-staff DELETE failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
