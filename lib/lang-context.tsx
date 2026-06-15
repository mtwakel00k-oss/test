"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Lang } from "./translations";
import { getScopedCookieLang, getScope } from "./i18n-scope";

const LangCtx = createContext<Lang>("ar");

export function LangProvider({ lang: initialLang, children }: { lang: Lang; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    const handler = () => setLang(getScopedCookieLang(getScope()) || initialLang);
    window.addEventListener("langchange", handler);
    return () => window.removeEventListener("langchange", handler);
  }, [initialLang]);

  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
