"use client"

import { useState, useCallback, useEffect } from "react"
import { type Lang, t } from "./translations"
import { useLang } from "./lang-context"
import { getScope, getScopedCookieLang } from "./i18n-scope"

export function useTranslation() {
  const contextLang = useLang()
  const scope = getScope()
  const [lang, setLang] = useState<Lang>(() => getScopedCookieLang(scope) || contextLang)

  useEffect(() => {
    const handler = () => setLang(getScopedCookieLang(scope) || contextLang)
    window.addEventListener("langchange", handler)
    return () => window.removeEventListener("langchange", handler)
  }, [scope, contextLang])

  const _t = useCallback((key: string): string => t(key, lang), [lang])

  return { lang, t: _t, dir: lang === "ar" ? "rtl" : "ltr" as const }
}