"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "./lang-provider";
import { useSidebar } from "./sidebar-provider";
import { LangSwitch } from "./lang-switch";

/**
 * The toolbar, as an HIG bar: a translucent material over the content, the title in Headline
 * weight, one filled primary action. Regular width (lg+) shows the search field inline. Compact
 * width can't fit a usable field next to everything else, so search becomes a 44pt icon button
 * that expands the field across the bar with a Cancel, the way iOS does it.
 */
export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const d = useT();
  const { open, toggle } = useSidebar();
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
    <form onSubmit={submit} role="search" className="flex h-9 w-full items-center gap-1.5 rounded-[10px] bg-fill px-2.5 focus-within:ring-2 focus-within:ring-accent/40">
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
      <Link href="/" className="headline hidden shrink-0 lg:inline">
        {d.app.name}
      </Link>

      {/* Compact width, searching: the field takes the bar. */}
      <div className={cn("flex flex-1 items-center gap-3 lg:hidden", !searching && "hidden")}>
        {field(inputRef)}
        <button type="button" onClick={() => setSearching(false)} className="min-h-11 shrink-0 text-[17px] text-accent">
          {d.header.cancel}
        </button>
      </div>

      {/* Compact width, idle: title button, then trailing icon buttons. */}
      <div className={cn("flex flex-1 items-center gap-1 lg:hidden", searching && "hidden")}>
        <button type="button" onClick={toggle} aria-label={d.header.menu} aria-expanded={open} className="headline -ml-2 grid min-h-11 min-w-11 place-items-center rounded-full px-2 hover:bg-fill">
          {d.app.short}
        </button>
        <div className="flex-1" />
        <LangSwitch />
        <button type="button" onClick={() => setSearching(true)} aria-label={d.header.searchShort} className="grid h-11 w-11 place-items-center rounded-full text-accent hover:bg-fill">
          <Search className="h-[22px] w-[22px]" />
        </button>
        <Link href="/?add=1" aria-label={d.header.add} className="grid h-11 w-11 shrink-0 place-items-center">
          <span className="btn-filled h-8 w-8">
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
        </Link>
      </div>

      {/* Regular width: field centered, segmented control and the primary action trailing. */}
      <div className="mx-auto hidden w-full max-w-xl lg:block">{field()}</div>
      <div className="hidden items-center gap-3 lg:flex">
        <LangSwitch />
        <Link href="/?add=1" className="btn-filled h-9 shrink-0 px-4 text-sm">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> {d.header.add}
        </Link>
      </div>
    </header>
  );
}
