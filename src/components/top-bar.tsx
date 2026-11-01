"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { useAdd } from "./add-sheet";
import { cn } from "@/lib/utils";
import { useT } from "./lang-provider";
import { useSidebar } from "./sidebar-provider";

/**
 * The toolbar, as an HIG bar: a translucent material over the content, the wordmark, one filled
 * primary action. Regular width (lg+) shows the search field inline. On a phone the tab bar carries
 * search and Add, so this bar keeps the wordmark and the menu button that opens the sidebar; on
 * /search it becomes the search field itself, with a Cancel, the way iOS does it. The language
 * lives in Settings.
 */
export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const d = useT();
  const { open, toggle } = useSidebar();
  const add = useAdd();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

  // Landing on results keeps the field open on a phone, so the query stays visible and editable.
  useEffect(() => {
    setSearching(pathname === "/search");
  }, [pathname]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const field = (ref?: React.Ref<HTMLInputElement>) => (
    <form onSubmit={submit} role="search" className="flex h-9 w-full items-center gap-1.5 rounded-[10px] bg-fill px-2.5 focus-within:ring-2 focus-within:ring-accent-ink/40">
      <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={d.header.search}
        aria-label={d.header.search}
        enterKeyHint="search"
        className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-ink-3 lg:text-sm"
      />
      {q && (
        <button type="button" onClick={() => setQ("")} aria-label={d.header.close} className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink-3/60 text-paper">
          <X className="h-3 w-3" strokeWidth={3} />
        </button>
      )}
    </form>
  );

  return (
    <header className="material sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line px-4 lg:gap-4 lg:px-6">
      {/* Below lg the sidebar is a drawer, not a fixed column, so the mark opens it instead of
          just linking home — otherwise there would be no way to reach it on a phone at all. */}
      <Link href="/" className="wordmark hidden shrink-0 text-[22px] lg:inline">
        {d.app.short}
      </Link>

      {/* Compact width, searching: the field takes the bar. */}
      <div className={cn("flex flex-1 items-center gap-3 lg:hidden", !searching && "hidden")}>
        {field(inputRef)}
        <button type="button" onClick={() => setSearching(false)} className="min-h-11 shrink-0 text-[17px] text-accent-ink">
          {d.header.cancel}
        </button>
      </div>

      {/* Compact width, idle: the wordmark, and the menu that opens the sidebar. */}
      <div className={cn("flex flex-1 items-center justify-between lg:hidden", searching && "hidden")}>
        <Link href="/" className="wordmark text-[26px]">
          {d.app.short}
        </Link>
        <MenuButton open={open} onClick={toggle} label={d.header.menu} />
      </div>

      {/* Regular width: field centered, segmented control and the primary action trailing. */}
      <div className="mx-auto hidden w-full max-w-xl lg:block">{field()}</div>
      <div className="hidden items-center gap-3 lg:flex">
        <button type="button" onClick={add.open} className="btn-filled h-9 shrink-0 px-4 text-sm">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> {d.header.add}
        </button>
      </div>
    </header>
  );
}

/**
 * The menu button: two rounded bars of different lengths on a soft fill, the short one flush
 * right. Open, they turn into an ×. 44pt target.
 */
function MenuButton({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-expanded={open} className="group -mr-1 grid h-11 w-11 place-items-center">
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-fill transition-colors group-hover:bg-fill-2">
        <span className={cn("absolute right-[11px] h-[2.5px] w-[18px] rounded-full bg-ink transition-transform duration-300", open ? "translate-y-0 rotate-45" : "-translate-y-[4px]")} />
        <span className={cn("absolute right-[11px] h-[2.5px] rounded-full bg-ink transition-[transform,width] duration-300", open ? "w-[18px] translate-y-0 -rotate-45" : "w-[11px] translate-y-[4px]")} />
      </span>
    </button>
  );
}
