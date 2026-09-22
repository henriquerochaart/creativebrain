"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LANG, t, type Dict, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Carries the language the server resolved into every client component below it. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): Dict {
  return t(useContext(LangContext));
}
