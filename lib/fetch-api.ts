"use client"

export function resetTenantClient() {
  if (typeof window === "undefined") return
  try {
    const key = "__simploo_tenant_client"
    const masterKey = "__simploo_master_client"
    ;(window as unknown as Record<string, unknown>)[key] = null
    ;(window as unknown as Record<string, unknown>)[masterKey] = null
  } catch { /* ignore */ }
}

function readTenantConfigFromDOM(): { slug?: string } | null {
  try {
    const el = document.getElementById("__TENANT_CONFIG__")
    if (!el) return null
    return JSON.parse(el.textContent || "{}")
  } catch { return null }
}

function getSlugFromClientURL(): string {
  if (typeof window === "undefined") return ""
  const m = window.location.pathname.match(/^\/([^/]+)\//)
  return m?.[1] || ""
}

export function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") return fetch(path, init)

  let slug = getSlugFromClientURL()
  if (!slug) {
    slug = readTenantConfigFromDOM()?.slug || ""
  }
  if (!slug || path.startsWith("/api/auth/")) return fetch(path, init)

  const headers = new Headers(init?.headers)
  headers.set("x-tenant-slug", slug)
  return fetch(path, { ...init, headers })
}
