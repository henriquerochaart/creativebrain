"use client";

import "./globals.css";
import { useEffect } from "react";
import { t, type Lang } from "@/lib/i18n";

/**
 * When the root layout itself fails, nothing above this renders: no providers, no shell. So the
 * language comes from the brain_lang cookie directly, and the page carries its own html and body.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] root failed", error.digest ?? "", error.message);
  }, [error]);
  const lang: Lang = typeof document !== "undefined" && /(?:^|; )brain_lang=en/.test(document.cookie) ? "en" : "pt";
  const d = t(lang);
  return (
    <html lang={lang === "en" ? "en" : "pt-BR"}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-ink">
        <h1 className="large-title">{d.errorPage.title}</h1>
        <button type="button" onClick={reset} className="btn-filled mt-6 h-11 px-6 text-[17px]">
          {d.errorPage.retry}
        </button>
      </body>
    </html>
  );
}
