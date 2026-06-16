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
        <div className="text-5xl mb-4">⚠️</div>
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
