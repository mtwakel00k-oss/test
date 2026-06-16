"use client"

import { useState, useCallback } from "react"
import { type Lang, t } from "./translations"
import { useLang } from "./lang-context"
import { getScope, getScopedCookieLang } from "./i18n-scope"

export function useTranslation() {
  const initialLang = useLang()
  const scope = getScope()
  const [lang] = useState<Lang>(() => getScopedCookieLang(scope) || initialLang)

  const _t = useCallback((key: string): string => t(key, lang), [lang])

  return { lang, t: _t, dir: lang === "ar" ? "rtl" : "ltr" as const }
}