"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LANGS, LANG_COOKIE, t, type Lang } from "@/lib/i18n";
import { useLang } from "./lang-provider";
import { BASE_PATH } from "@/lib/base-path";
import { cn } from "@/lib/utils";

/**
 * Writes the choice to a cookie the server reads on the next render, then refreshes so every
 * server component re-renders in the new language. No reload, no flash of the old one.
 */
export function LangSwitch() {
  const router = useRouter();
  const lang = useLang();
  const [pending, start] = useTransition();
  const labels = t(lang).langName;

  function choose(next: Lang) {
    if (next === lang) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=${BASE_PATH || "/"}; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  }

  return (
    <div className={cn("flex items-center rounded-full border border-line p-0.5 text-[12px]", pending && "opacity-60")} role="group" aria-label={t(lang).header.language}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={l === lang}
          title={labels[l]}
          className={cn("rounded-full px-2 py-1 font-medium uppercase tracking-wide transition-colors", l === lang ? "bg-ink text-paper" : "text-ink-3 hover:text-ink")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
