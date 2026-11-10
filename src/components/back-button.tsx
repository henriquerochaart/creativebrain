"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * The reference screen's round glass back button. It returns to where the person came from (a
 * search, a collection, the graph) when that was inside the app, else to the library. Still a
 * link, so it works before hydration and opens in a new tab like any link.
 */
export function BackButton({ label, className }: { label: string; className?: string }) {
  const router = useRouter();
  return (
    <Link
      href="/"
      aria-label={label}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const fromApp = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin) && window.history.length > 1;
        if (!fromApp) return;
        e.preventDefault();
        router.back();
      }}
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
    </Link>
  );
}
