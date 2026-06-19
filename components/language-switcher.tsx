"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getScope, setScopedCookieLang } from "@/lib/i18n-scope"
import { useLang } from "@/lib/lang-context"
import type { Lang } from "@/lib/translations"
import { motion, AnimatePresence } from "framer-motion"

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "ar", flag: "🇸🇦", label: "العربية" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
]

const DIR: Record<Lang, "rtl" | "ltr"> = { ar: "rtl", en: "ltr", fr: "ltr" }

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const current = useLang()

  const switchLang = useCallback((lang: Lang) => {
    setScopedCookieLang(lang, getScope())
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
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 px-3 rounded-xl bg-card/80 backdrop-blur-md border border-border/40 hover:bg-card/90 flex items-center gap-2 text-sm font-bold text-foreground transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md select-none"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-base">{active.flag}</span>
        <span className="hidden xs:inline font-medium">{active.label}</span>
        <svg
          className={`w-4 h-4 ml-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-full mt-2 end-0 z-50 min-w-[160px] rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden ring-1 ring-black/5"
          >
            <div className="py-2">
              {LANGS.map((l) => (
                <motion.button
                  key={l.code}
                  type="button"
                  onClick={() => switchLang(l.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 active:scale-[0.98] select-none ${
                    l.code === current
                      ? "bg-emerald-600/10 text-emerald-600 font-black"
                      : "text-foreground hover:bg-secondary/50 hover:text-emerald-600"
                  }`}
                  whileHover={{ backgroundColor: l.code === current ? "rgb(var(--emerald-600), 0.08)" : "rgb(var(--secondary), 0.5)" }}
                >
                  <span className="text-lg">{l.flag}</span>
                  <span>{l.label}</span>
                  {l.code === current && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="size-1.5 rounded-full bg-emerald-600 ml-auto"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}