"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Lang } from "./translations";
import { getScopedCookieLang, getScope } from "./i18n-scope";

const LangCtx = createContext<Lang>("ar");

function subscribeToLangChange(cb: () => void): () => void {
  window.addEventListener("langchange", cb);
  return () => window.removeEventListener("langchange", cb);
}

function getClientLang(initialLang: Lang): Lang {
  return getScopedCookieLang(getScope()) || initialLang;
}

export function LangProvider({ lang: initialLang, children }: { lang: Lang; children: ReactNode }) {
  const lang = useSyncExternalStore(
    subscribeToLangChange,
    () => getClientLang(initialLang),
    () => initialLang,
  );

  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
