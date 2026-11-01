"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { useT } from "./lang-provider";

/**
 * The search field, under the Search tab's large title as in iOS. With no header it is the only
 * field: a phone reaches it from the tab bar, a wide screen from the sidebar. Empty, it takes focus.
 * Submitting keeps the mode the reader picked.
 */
export function SearchField({ initial, mode }: { initial: string; mode: string }) {
  const router = useRouter();
  const d = useT();
  const [q, setQ] = useState(initial);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (v) router.push(`/search?q=${encodeURIComponent(v)}${mode && mode !== "hybrid" ? `&mode=${mode}` : ""}`);
  };
  return (
    <form onSubmit={submit} role="search" className="flex h-11 w-full items-center gap-2 rounded-[10px] bg-fill px-3 focus-within:ring-2 focus-within:ring-accent-ink/40 lg:h-10 lg:max-w-xl">
      <Search className="h-[18px] w-[18px] shrink-0 text-ink-3" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={d.header.search}
        aria-label={d.header.search}
        enterKeyHint="search"
        autoFocus={!initial}
        className="h-full w-full min-w-0 bg-transparent text-[17px] outline-none placeholder:text-ink-3 lg:text-[15px] [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button type="button" onClick={() => setQ("")} aria-label={d.header.clear} className="grid h-6 w-6 shrink-0 place-items-center">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-ink-3/60 text-paper">
            <X className="h-3 w-3" strokeWidth={3} />
          </span>
        </button>
      )}
    </form>
  );
}
