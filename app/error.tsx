"use client"

import { useEffect, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/lib/use-translation"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { t, lang } = useTranslation()
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  const handleRetry = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 300)
    reset()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <div className={`w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-lg text-center ${shaking ? "animate-[shake_0.3s_ease-in-out]" : ""}`}>
        <style>{`@keyframes shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-6px) } 40% { transform: translateX(6px) } 60% { transform: translateX(-4px) } 80% { transform: translateX(4px) } }`}</style>
        <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-destructive/10 mx-auto">
          <svg className="size-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{t("error.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("error.description")}</p>
        <button onClick={handleRetry}
          className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
          {t("error.retry")}
        </button>
      </div>
    </div>
  )
}
