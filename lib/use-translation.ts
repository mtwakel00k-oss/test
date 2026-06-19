"use client"

import { useCallback } from "react"
import { t } from "./translations"
import { useLang } from "./lang-context"

export function useTranslation() {
  const lang = useLang()
  const _t = useCallback((key: string): string => t(key, lang), [lang])

  return { lang, t: _t, dir: lang === "ar" ? "rtl" : "ltr" as const }
}
