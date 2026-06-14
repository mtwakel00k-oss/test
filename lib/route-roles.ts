export const ROUTE_ROLES = {
  pos: ["cashier", "admin", "owner"],
  kitchen: ["chef", "admin", "owner"],
  admin: ["admin", "owner"],
} as const

export type AppPage = keyof typeof ROUTE_ROLES

export function getAllowedRolesForRoute(pathname: string): readonly string[] | null {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length < 1) return null

  const first = segments[0]
  const second = segments[1]

  if (first in ROUTE_ROLES) {
    return ROUTE_ROLES[first as AppPage]
  }
  if (second && second in ROUTE_ROLES) {
    return ROUTE_ROLES[second as AppPage]
  }
  return null
}

export function extractSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length < 2) return null
  const first = segments[0]
  return first in ROUTE_ROLES ? null : first
}
