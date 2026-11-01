"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LibraryBig, Plus, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { tabOf } from "@/lib/sections";
import { useT } from "./lang-provider";
import { useAdd } from "./add-sheet";

type TabKey = "home" | "search" | "collections" | "settings";
type Tab = { href: string; key: TabKey; Icon: typeof House };

const TABS: Tab[] = [
  { href: "/", key: "home", Icon: House },
  { href: "/search", key: "search", Icon: Search },
  { href: "/collections", key: "collections", Icon: LibraryBig },
  { href: "/settings", key: "settings", Icon: Settings },
];

/**
 * The phone's tab bar and its only navigation: there is no header. A floating material capsule,
 * the way current iOS apps carry it, with Add as the raised button in the middle. A tab stays
 * selected on the screens reached through it (`tabOf`). Settings carries a badge while references
 * failed, since the Inbox that lists them lives there. Only below lg; the sidebar does this job on
 * a wide screen.
 */
export function TabBar({ failed }: { failed: number }) {
  const pathname = usePathname();
  const d = useT();
  const { open } = useAdd();
  const current = tabOf(pathname);
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];
  const item = (t: Tab) => {
    const on = current === t.key;
    return (
      <Link
        key={t.key}
        href={t.href}
        aria-current={on ? "page" : undefined}
        className={cn("relative flex h-12 min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[10px] font-semibold transition-colors", on ? "bg-accent/30 text-accent-ink" : "text-ink-3 hover:text-ink")}
      >
        <span className="relative">
          <t.Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.4 : 2} />
          {t.key === "settings" && failed > 0 && (
            <span className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white">{failed > 99 ? "99+" : failed}</span>
          )}
        </span>
        {d.tabs[t.key]}
      </Link>
    );
  };
  return (
    <nav aria-label={d.header.menu} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="material-thick pointer-events-auto flex h-[64px] w-full max-w-md items-center justify-between rounded-full border border-line/70 px-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
        {left.map(item)}
        <button type="button" onClick={open} aria-label={d.tabs.add} className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-[0_6px_16px_color-mix(in_srgb,var(--accent)_40%,transparent)] transition-transform active:scale-95">
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
        {right.map(item)}
      </div>
    </nav>
  );
}
