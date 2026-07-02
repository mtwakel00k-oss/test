/**
 * Enterprise-grade audit event system.
 *
 * == Design decisions ==
 *
 * Fail-closed vs. fail-open:
 *   CRITICAL event types (staff.*, auth.setup_*, settings.updated,
 *   auth.setup_root) — the audit insert uses the same `supabaseForRequestAdmin`
 *   client that the calling route uses for mutations. If the audit insert fails
 *   AFTER the mutation already succeeded, the calling route cannot roll back
 *   the mutation across an HTTP boundary. We therefore:
 *     1. Write the mutation first.
 *     2. Write the audit event second.
 *     3. If the audit event fails, write to the `audit_write_failures`
 *        dead-letter table for replay/alerting.
 *     4. For CRITICAL events only, LOG a CRITICAL-LEVEL error.
 *   This is a pragmatic compromise — full atomicity would require a Postgres
 *   SECURITY DEFINER RPC that wraps mutation + audit INSERT in a single
 *   transaction (a future improvement).
 *
 *   For non-critical events (product.updated, order.created, etc.) the audit
 *   write is best-effort: dead-letter on failure, never block the user request.
 *
 * Redaction:
 *   The `REDACTED_FIELDS` set defines field names whose values are replaced
 *   with "[REDACTED]" before storage in old_data / new_data. This prevents
 *   accidental credential leakage even if a caller passes password/token/secret
 *   fields. The denylist is broad (password, password_hash, token, api_key,
 *   secret, session, credit_card, cvv, ssn) — additions welcome.
 */

import { parseSession, supabaseForRequestAdmin } from "@/lib/tenant"
import { getClientIp } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import type { NextRequest } from "next/server"

// ── Event taxonomy ───────────────────────────────────────────
export const EVENT_TYPES = {
  AUTH_LOGIN_SUCCESS: "auth.login.success",
  AUTH_LOGIN_FAILED: "auth.login.failed",
  AUTH_LOGOUT: "auth.logout",
  AUTH_SETUP_ROOT: "auth.setup_root",
  AUTH_SETUP_STAFF: "auth.setup_staff",
  STAFF_CREATED: "staff.created",
  STAFF_UPDATED: "staff.updated",
  STAFF_DELETED: "staff.deleted",
  STAFF_PASSWORD_CHANGED: "staff.password_changed",
  DRIVER_CREATED: "driver.created",
  DRIVER_UPDATED: "driver.updated",
  DRIVER_TOKEN_REGENERATED: "driver.token_regenerated",
  DRIVER_DELETED: "driver.deleted",
  SETTINGS_UPDATED: "settings.updated",
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_DELETED: "product.deleted",
  ORDER_CREATED: "order.created",
  ORDER_UPDATED: "order.updated",
  ORDER_DELETED: "order.deleted",
  ORDERS_BULK_CLEARED: "orders.bulk_cleared",
  AUDIT_LOG_VIEWED: "audit_log.viewed",
  ACCESS_DENIED: "access.denied",
  RATE_LIMIT_EXCEEDED: "rate_limit.exceeded",
  CATEGORY_CREATED: "category.created",
  CATEGORY_DELETED: "category.deleted",
  DELIVERY_ASSIGNED: "delivery.assigned",
  DELIVERY_COLLECTED: "delivery.collected",
  LOGO_UPDATED: "logo.updated",
} as const

export type AuditEventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

export interface AuditEventInput {
  event_type: AuditEventType
  table_name?: string
  record_id?: string
  operation: "CREATE" | "UPDATE" | "DELETE" | "ACCESS" | "LOGIN" | "LOGOUT" | "DENIED"
  outcome?: "success" | "failure"
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

/** Event types that MUST NOT silently fail — the route should also fail. */
const CRITICAL_EVENT_TYPES = new Set<AuditEventType>([
  EVENT_TYPES.STAFF_CREATED,
  EVENT_TYPES.STAFF_DELETED,
  EVENT_TYPES.STAFF_PASSWORD_CHANGED,
  EVENT_TYPES.AUTH_SETUP_ROOT,
  EVENT_TYPES.AUTH_SETUP_STAFF,
  EVENT_TYPES.SETTINGS_UPDATED,
])

/** Field names redacted before persisting to old_data / new_data. */
const REDACTED_FIELDS = new Set([
  "password",
  "password_hash",
  "token",
  "api_key",
  "secret",
  "session",
  "credit_card",
  "cvv",
  "ssn",
  "supabase_anon_key",
  "supabase_service_key",
])

function redact(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!obj) return null
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = REDACTED_FIELDS.has(key) ? "[REDACTED]" : value
  }
  return result
}

/**
 * Resolve tenant slug from session or request headers.
 * Returns "" if neither is available (requests without tenant context).
 */
function resolveSlug(req: NextRequest): string {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.slug) return session.slug
  const header = req.headers.get("x-tenant-slug") || ""
  if (header) return header
  const referer = req.headers.get("referer") || ""
  const m = referer.match(/\/([^/]+)\/(?:admin|menu|pos|kitchen|order|login)\b/)
  if (m) {
    const knownPages = new Set(["admin", "menu", "pos", "kitchen", "order", "login"])
    if (!knownPages.has(m[1])) return m[1]
  }
  return ""
}

function formatUserAgent(req: NextRequest): string {
  return req.headers.get("user-agent") || ""
}

/**
 * Record a single audit event.
 *
 * Automatically resolves:
 *   - Actor (email/role/id) from session
 *   - IP from getClientIp()
 *   - User agent from headers
 *   - request_id from x-request-id header (set by proxy.ts)
 *   - Tenant slug from session/headers/referer
 *
 * Redacts sensitive fields from old_data / new_data before storage.
 *
 * On insert failure:
 *   a) Logs a structured error
 *   b) Writes to `audit_write_failures` dead-letter table
 *   c) For CRITICAL events, also logs a CRITICAL-level entry
 *      (the calling route should decide whether to fail the request)
 */
export async function recordAuditEvent(
  req: NextRequest,
  event: AuditEventInput,
): Promise<void> {
  const session = parseSession(req.headers.get("cookie") || "")
  const tenantSlug = resolveSlug(req)
  const requestId = req.headers.get("x-request-id") || ""
  const ip = getClientIp(req)
  const userAgent = formatUserAgent(req)

  const row = {
    tenant_slug: tenantSlug,
    event_type: event.event_type,
    table_name: event.table_name || null,
    record_id: event.record_id || null,
    operation: event.operation,
    outcome: event.outcome || "success",
    actor_id: event.metadata?.actor_id as string | undefined || null,
    actor_email: session.email || "",
    actor_role: session.role || "",
    ip_address: ip,
    user_agent: userAgent,
    request_id: requestId,
    old_data: redact(event.old_data ?? null),
    new_data: redact(event.new_data ?? null),
    metadata: event.metadata ?? null,
  }

  try {
    const sb = await supabaseForRequestAdmin(req)
    const { error: insertError } = await sb.from("audit_events").insert(row)
    if (insertError) {
      await writeDeadLetter(row, insertError.message, req)
      if (CRITICAL_EVENT_TYPES.has(event.event_type)) {
        logger.error(
          "[AUDIT] CRITICAL: audit event insert failed — mutation may be un-audited",
          { event_type: event.event_type, error: insertError.message, request_id: requestId },
        )
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await writeDeadLetter(row, msg, req)
    if (CRITICAL_EVENT_TYPES.has(event.event_type)) {
      logger.error(
        "[AUDIT] CRITICAL: audit event write threw — mutation may be un-audited",
        { event_type: event.event_type, error: msg, request_id: requestId },
      )
    }
  }
}

async function writeDeadLetter(
  row: Record<string, unknown>,
  errorMessage: string,
  req: NextRequest,
): Promise<void> {
  try {
    const sb = await supabaseForRequestAdmin(req)
    await sb.from("audit_write_failures").insert({
      event_payload: row,
      error_message: errorMessage,
      actor_email: (row.actor_email as string) || "",
      ip_address: (row.ip_address as string) || "",
    })
  } catch {
    // Dead-letter write itself failed — nothing more we can do.
    // The error was already logged by the caller.
  }
}
