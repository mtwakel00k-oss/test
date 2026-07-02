import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { parseSession } from "@/lib/tenant"
import { resolveTenantSlug } from "@/lib/api-auth"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { createDriverSchema, validationError } from "@/lib/validations"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"

export interface Driver {
  id: string
  name: string
  phone: string
  token: string
  is_active: boolean
  created_at: string
}

function getSlug(req: NextRequest): string | null {
  const session = parseSession(req.headers.get("cookie") || "")
  return resolveTenantSlug(req, session)
}

export async function GET(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (!["admin", "owner", "cashier", "chef"].includes(session.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: "Server config error" }, { status: 500 })
  const masterClient = createClient(url, key)

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

  // Check busy status from active orders
  let busyIds = new Set<string>()
  try {
    const { data: busyDrivers } = await masterClient
      .from("orders")
      .select("driver_id")
      .eq("status", "out_for_delivery")
      .not("driver_id", "is", null)
    busyIds = new Set((busyDrivers || []).map((o: { driver_id: string }) => o.driver_id))
  } catch {
    logger.warn("Drivers GET: could not query busy status")
  }

  const driversWithStatus = drivers.map(d => ({
    ...d,
    is_busy: busyIds.has(d.id),
  }))

  if (session.role === "cashier") {
    return NextResponse.json(driversWithStatus.map(({ token: _t, ...d }) => d))
  }
  return NextResponse.json(driversWithStatus)
}

export async function POST(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    const rl = await checkRateLimit(`tenant:drivers:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
  }

  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const rawBody = body as { name?: string; phone?: string }
  const parsed = createDriverSchema.safeParse({ name: rawBody.name, whatsapp_number: rawBody.phone })
  if (!parsed.success) return validationError(parsed.error)

  const name = parsed.data.name
  const cleanPhone = parsed.data.whatsapp_number.replace(/\D/g, "")
  if (cleanPhone.length < 9) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: "Server config error" }, { status: 500 })
  const masterClient = createClient(url, key)

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
  recordAuditEvent(req, { event_type: EVENT_TYPES.DRIVER_CREATED, operation: "CREATE", table_name: "drivers", record_id: newDriver.id, new_data: { name: newDriver.name, phone: newDriver.phone } }).catch(() => {})
  return NextResponse.json(newDriver, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    const rl = await checkRateLimit(`tenant:drivers:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

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

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: "Server config error" }, { status: 500 })
  const masterClient = createClient(url, key)

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

  if (regenerate_token) {
    recordAuditEvent(req, { event_type: EVENT_TYPES.DRIVER_TOKEN_REGENERATED, operation: "UPDATE", table_name: "drivers", record_id: updated.id }).catch(() => {})
  } else {
    recordAuditEvent(req, { event_type: EVENT_TYPES.DRIVER_UPDATED, operation: "UPDATE", table_name: "drivers", record_id: updated.id, new_data: { name: updated.name, is_active: updated.is_active } }).catch(() => {})
  }
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    const rl = await checkRateLimit(`tenant:drivers:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
  }

  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: "Server config error" }, { status: 500 })
  const masterClient = createClient(url, key)

  const { data: tenant, error: fetchErr } = await masterClient
    .from("tenants").select("drivers").eq("slug", slug).single()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const drivers: Driver[] = Array.isArray(tenant?.drivers) ? tenant.drivers : []
  const filtered = drivers.filter(d => d.id !== id)

  const { error: updateErr } = await masterClient
    .from("tenants").update({ drivers: filtered }).eq("slug", slug)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  recordAuditEvent(req, { event_type: EVENT_TYPES.DRIVER_DELETED, operation: "DELETE", table_name: "drivers", record_id: id }).catch(() => {})
  return NextResponse.json({ success: true })
}
