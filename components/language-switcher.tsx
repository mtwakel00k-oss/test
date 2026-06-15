"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getScope, setScopedCookieLang, getScopedCookieLang } from "@/lib/i18n-scope"
import type { Lang } from "@/lib/translations"

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "ar", flag: "🇸🇦", label: "العربية" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
]

const DIR: Record<Lang, "rtl" | "ltr"> = { ar: "rtl", en: "ltr", fr: "ltr" }

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [current, setCurrent] = useState<Lang>(() => getScopedCookieLang(getScope()) || "ar")

  const switchLang = useCallback((lang: Lang) => {
    setScopedCookieLang(lang, getScope())
    setCurrent(lang)
    setOpen(false)
    document.documentElement.lang = lang
    document.documentElement.dir = DIR[lang]
    document.documentElement.dataset.locale = lang
    window.dispatchEvent(new Event("langchange"))
    router.refresh()
  }, [router])

  const active = LANGS.find((l) => l.code === current) || LANGS[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-2.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors select-none"
      >
        <span>{active.flag}</span>
        <span className="hidden sm:inline">{active.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 end-0 z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => switchLang(l.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-start transition-colors hover:bg-secondary/50 ${
                  l.code === current ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}