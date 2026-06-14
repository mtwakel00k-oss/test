import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, isTenantMismatch, parseSession } from "@/lib/tenant"
import { requireStaff, requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  try {
    const session = requireStaff(req)
    if (isErrorResponse(session)) return session

    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("delivery_men").select("*").order("name")
    if (error) {
      if (error.message.includes("does not exist") || error.code === "PGRST205") {
        return NextResponse.json([])
      }
      throw new Error(error.message)
    }
    return NextResponse.json(data || [])
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("delivery-men GET failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const body = await req.json()
    const { name, whatsapp_number } = body
    if (!name || !whatsapp_number) {
      return NextResponse.json({ error: "name and whatsapp_number required" }, { status: 400 })
    }

    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("delivery_men").insert({
      name,
      whatsapp_number,
      is_busy: false,
    }).select().single()

    if (error) throw new Error(error.message)
    logger.info("Delivery man created", { id: data.id, name })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("delivery-men POST failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const body = await req.json()
    const { id, name, whatsapp_number, is_busy } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number
    if (is_busy !== undefined) updates.is_busy = is_busy
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("delivery_men").update(updates).eq("id", id).select().single()
    if (error) throw new Error(error.message)

    logger.info("Delivery man updated", { id })
    return NextResponse.json(data)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("delivery-men PATCH failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 })

    const sb = await supabaseForRequest(req)
    const { error } = await sb.from("delivery_men").delete().eq("id", id)
    if (error) throw new Error(error.message)

    logger.info("Delivery man deleted", { id })
    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("delivery-men DELETE failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
