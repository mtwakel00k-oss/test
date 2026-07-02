import { NextRequest, NextResponse } from "next/server"
import type { SessionData } from "@/lib/session-crypto"
import { parseSession } from "@/lib/tenant"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"

export const STAFF_ROLES = ["admin", "owner", "cashier", "chef"] as const
export const ADMIN_ROLES = ["admin", "owner"] as const
export const POS_ROLES = ["admin", "owner", "cashier"] as const

export function getSession(req: NextRequest): SessionData {
  return parseSession(req.headers.get("cookie") || "")
}

export function requireRoles(session: SessionData, roles: readonly string[]): NextResponse | null {
  if (!session.role || !roles.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export function requireStaff(req: NextRequest): SessionData | NextResponse {
  const session = getSession(req)
  const denied = requireRoles(session, STAFF_ROLES)
  if (denied) {
    recordAuditEvent(req, { event_type: EVENT_TYPES.ACCESS_DENIED, operation: "DENIED", outcome: "failure", metadata: { required_roles: STAFF_ROLES.join(","), actual_role: session.role || "none" } }).catch(() => {})
    return denied
  }
  return session
}

export function requireAdmin(req: NextRequest): SessionData | NextResponse {
  const session = getSession(req)
  const denied = requireRoles(session, ADMIN_ROLES)
  if (denied) {
    recordAuditEvent(req, { event_type: EVENT_TYPES.ACCESS_DENIED, operation: "DENIED", outcome: "failure", metadata: { required_roles: ADMIN_ROLES.join(","), actual_role: session.role || "none" } }).catch(() => {})
    return denied
  }
  return session
}

export function requireRootOwner(req: NextRequest): SessionData | NextResponse {
  const session = getSession(req)
  if (session.role !== "owner" || session.slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return session
}

/** Session slug wins; reject cross-tenant header/body overrides. */
export function resolveTenantSlug(
  req: NextRequest,
  session: SessionData,
  bodySlug?: string | null,
): string | null {
  const header = req.headers.get("x-tenant-slug")
  if (session.slug && header && session.slug !== header) return null
  if (session.slug && bodySlug && session.slug !== bodySlug) return null
  return session.slug || bodySlug || header || null
}

export function isErrorResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse
}
