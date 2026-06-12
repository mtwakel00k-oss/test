export function getRoleFromUser(user: { user_metadata?: { role?: string } } | null): string | null {
  return user?.user_metadata?.role ?? null
}

const ROUTE_ROLES: Record<string, string[]> = {
  "pos": ["cashier", "admin", "owner"],
  "kitchen": ["chef", "admin"],
  "admin": ["admin", "owner"],
}

/** Get allowed roles for a path that may start with /:slug/... */
export function getAllowedRolesForRoute(pathname: string): string[] | null {
  const segments = pathname.split("/").filter(Boolean)
  // segments: ["burger-house", "pos"] or ["pos"] or ["admin"]
  if (segments.length < 1) return null

  // If first segment looks like a slug (not a known top-level route), skip it
  const first = segments[0]
  const second = segments[1]

  if (first in ROUTE_ROLES) {
    return ROUTE_ROLES[first]
  }
  if (second && second in ROUTE_ROLES) {
    return ROUTE_ROLES[second]
  }
  return null
}

/** Extract tenant slug from pathname, e.g. /burger-house/pos → burger-house */
export function extractSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length < 2) return null
  const first = segments[0]
  return first in ROUTE_ROLES ? null : first
}
