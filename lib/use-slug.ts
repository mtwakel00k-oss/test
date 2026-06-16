"use client"

import { useMemo } from "react"

interface TenantConfig {
  url: string
  key: string
  slug: string
  name: string
  logo_url: string | null
}

function getConfig(): TenantConfig | null {
  if (typeof window === "undefined") return null
  return (window as unknown as Record<string, unknown>).__TENANT_CONFIG__ as TenantConfig | null ?? null
}

/** Read the tenant slug from __TENANT_CONFIG__. Returns empty string if not set. */
export function useSlug(): string {
  return useMemo(() => {
    return getConfig()?.slug || ""
  }, [])
}

/** Build a full path with the tenant slug: /<slug>/<path> */
export function slugPath(path: string): string {
  const slug = getConfig()?.slug || ""
  return slug ? `/${slug}${path.startsWith("/") ? path : "/" + path}` : path
}
