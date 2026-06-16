"use client"

import Link from "next/link"
import { useTranslation } from "@/lib/use-translation"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function NotFoundPage() {
  const { t, lang } = useTranslation()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-lg text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-foreground mb-2">{t("notFound.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("notFound.description")}</p>
        <Link href="/login"
          className="inline-block rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
          {t("notFound.goHome")}
        </Link>
      </div>
    </div>
  )
}
