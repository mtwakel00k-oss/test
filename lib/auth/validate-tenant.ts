import { type SupabaseClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { NextResponse } from "next/server"

// FIXED: Uses restaurant_users table (not restaurants) — tenants for slug lookup
export async function validateTenantAccess(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<{ hasAccess: boolean; role: string | null }> {
  const { data } = await supabase
    .from("restaurant_users")
    .select("role")
    .eq("user_id", userId)
    .eq("restaurant_id", tenantId)
    .single()

  return {
    hasAccess: !!data,
    role: data?.role ?? null,
  }
}

export function getRoleFromSession(req: Request): string | null {
  const cookie = req.headers.get("cookie") || ""
  const session = parseSession(cookie)
  return session.role || null
}

export function getSlugFromSession(req: Request): string | null {
  const cookie = req.headers.get("cookie") || ""
  const session = parseSession(cookie)
  return session.slug || null
}

export function requireRole(
  req: Request,
  allowedRoles: string[],
): { passed: boolean; response?: NextResponse } {
  const role = getRoleFromSession(req)
  if (!role || !allowedRoles.includes(role)) {
    return {
      passed: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }
  return { passed: true }
}
