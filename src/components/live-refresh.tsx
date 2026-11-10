"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-renders the server page while something is still being understood. It starts every `ms`
 * and backs off to `maxMs` (a long video can take minutes, and each refresh re-runs the page's
 * queries), and it waits while the tab is hidden, refreshing once on return.
 */
export function LiveRefresh({ active, ms = 3000, maxMs = 15_000 }: { active: boolean; ms?: number; maxMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let delay = ms;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (document.hidden) return;
      router.refresh();
      delay = Math.min(maxMs, Math.round(delay * 1.4));
      timer = setTimeout(tick, delay);
    };
    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      tick();
    };
    timer = setTimeout(tick, delay);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, ms, maxMs, router]);
  return null;
}
