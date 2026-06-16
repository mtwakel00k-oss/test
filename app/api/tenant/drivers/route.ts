import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"

const masterClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface Driver {
  id: string
  name: string
  phone: string
  token: string
  is_active: boolean
  created_at: string
}

function getSlug(req: NextRequest): string | null {
  const header = req.headers.get("x-tenant-slug")
  if (header) return header
  const session = parseSession(req.headers.get("cookie") || "")
  return session.slug ?? null
}

export async function GET(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (!["admin", "owner", "cashier"].includes(session.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const { data, error } = await masterClient
    .from("tenants")
    .select("drivers")
    .eq("slug", slug)
    .single()

  if (error) {
    logger.error("Drivers GET failed: " + error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const drivers: Driver[] = Array.isArray(data?.drivers) ? data.drivers : []
  if (session.role === "cashier") {
    return NextResponse.json(drivers.map(({ token: _t, ...d }) => d))
  }
  return NextResponse.json(drivers)
}

export async function POST(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
  }

  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { name, phone } = body as { name?: string; phone?: string }
  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 })
  }

  const cleanPhone = phone.replace(/\D/g, "")
  if (cleanPhone.length < 9) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
  }

  const { data: tenant, error: fetchErr } = await masterClient
    .from("tenants").select("drivers").eq("slug", slug).single()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const drivers: Driver[] = Array.isArray(tenant?.drivers) ? tenant.drivers : []

  const newDriver: Driver = {
    id: randomUUID(),
    name: name.trim(),
    phone: cleanPhone,
    token: randomUUID(),
    is_active: true,
    created_at: new Date().toISOString(),
  }

  const { error: updateErr } = await masterClient
    .from("tenants")
    .update({ drivers: [...drivers, newDriver] })
    .eq("slug", slug)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  logger.info("Driver created", { slug, driverId: newDriver.id })
  return NextResponse.json(newDriver, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
  }

  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { id, name, phone, is_active, regenerate_token } = body as {
    id?: string
    name?: string
    phone?: string
    is_active?: boolean
    regenerate_token?: boolean
  }

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const { data: tenant, error: fetchErr } = await masterClient
    .from("tenants").select("drivers").eq("slug", slug).single()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const drivers: Driver[] = Array.isArray(tenant?.drivers) ? tenant.drivers : []
  const idx = drivers.findIndex(d => d.id === id)
  if (idx === -1) return NextResponse.json({ error: "Driver not found" }, { status: 404 })

  const updated = { ...drivers[idx] }
  if (name?.trim()) updated.name = name.trim()
  if (phone) updated.phone = phone.replace(/\D/g, "")
  if (is_active !== undefined) updated.is_active = is_active
  if (regenerate_token) updated.token = randomUUID()

  drivers[idx] = updated

  const { error: updateErr } = await masterClient
    .from("tenants").update({ drivers }).eq("slug", slug)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
  }

  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const { data: tenant, error: fetchErr } = await masterClient
    .from("tenants").select("drivers").eq("slug", slug).single()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const drivers: Driver[] = Array.isArray(tenant?.drivers) ? tenant.drivers : []
  const filtered = drivers.filter(d => d.id !== id)

  const { error: updateErr } = await masterClient
    .from("tenants").update({ drivers: filtered }).eq("slug", slug)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
