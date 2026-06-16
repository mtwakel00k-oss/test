"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "./translations";

const LangCtx = createContext<Lang>("ar");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
