"use client"

import { useMemo } from "react"

interface TenantConfig {
  url: string
  key: string
  slug: string
  name: string
  logo_url: string | null
  plan_type?: string
}

function getConfig(): TenantConfig | null {
  if (typeof window === "undefined") return null
  const el = document.getElementById("tenant-config")
  if (!el?.textContent) return null
  try { return JSON.parse(el.textContent) as TenantConfig } catch { return null }
}

export { getConfig as readTenantConfig }

/** Read the tenant slug from JSON script tag. Returns empty string if not set. */
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
