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
    // UISegmentedControl: a gray track, the selected segment a raised thumb.
    <div className={cn("flex h-8 items-center rounded-[9px] bg-fill p-0.5 text-[13px]", pending && "opacity-60")} role="group" aria-label={t(lang).header.language}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={l === lang}
          title={labels[l]}
          className={cn(
            "h-full min-w-9 rounded-[7px] px-2 font-semibold uppercase transition-colors",
            l === lang ? "bg-paper text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-fill-2" : "text-ink-2 hover:text-ink",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
