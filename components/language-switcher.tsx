"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { getScope, setScopedCookieLang } from "@/lib/i18n-scope"
import { useLang } from "@/lib/lang-context"
import type { Lang } from "@/lib/translations"
import { cn } from "@/lib/utils"

const LANGS: { code: Lang; label: string }[] = [
  { code: "ar", label: "AR" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
]

const DIR: Record<Lang, "rtl" | "ltr"> = { ar: "rtl", en: "ltr", fr: "ltr" }

export function LanguageSwitcher() {
  const router = useRouter()
  const current = useLang()

  const switchLang = useCallback((lang: Lang) => {
    setScopedCookieLang(lang, getScope())
    document.documentElement.lang = lang
    document.documentElement.dir = DIR[lang]
    document.documentElement.dataset.locale = lang
    window.dispatchEvent(new Event("langchange"))
    router.refresh()
  }, [router])

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/30 bg-muted/20 p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => switchLang(l.code)}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-bold tracking-wider transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            l.code === current
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground/50 hover:text-foreground"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
