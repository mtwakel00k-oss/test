"use client"

import type { Lang } from "./translations"

export type I18nScope = "pos" | "kitchen" | "admin" | "menu" | "default"

export function getScope(): I18nScope {
  if (typeof window === "undefined") return "default"
  const p = window.location.pathname
  if (p.includes("/pos")) return "pos"
  if (p.includes("/kitchen")) return "kitchen"
  if (p.includes("/admin")) return "admin"
  if (p.includes("/menu")) return "menu"
  return "default"
}

export function scopedCookieKey(scope: I18nScope): string {
  return scope === "default" ? "lang" : `lang_${scope}`
}

export function getScopedCookieLang(scope: I18nScope): Lang | null {
  if (typeof document === "undefined") return null
  const key = scopedCookieKey(scope)
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`))
  const val = m?.[1]
  if (val === "en" || val === "fr") return val
  if (val === "ar") return "ar"
  return null
}

export function setScopedCookieLang(lang: Lang, scope: I18nScope) {
  const key = scopedCookieKey(scope)
  document.cookie = `${key}=${lang}; path=/; max-age=31536000; SameSite=Lax`
}

export function scopeFromPath(pathname: string): I18nScope {
  if (pathname.includes("/pos")) return "pos"
  if (pathname.includes("/kitchen")) return "kitchen"
  if (pathname.includes("/admin")) return "admin"
  if (pathname.includes("/menu")) return "menu"
  return "default"
}