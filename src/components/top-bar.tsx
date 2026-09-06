"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, Plus, Sparkles } from "lucide-react";

export function TopBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-paper/85 px-6 backdrop-blur">
      <Link href="/" className="shrink-0 text-[13px] font-semibold uppercase tracking-[0.18em]">
        Henrique Brain
      </Link>
      <form
        className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-line bg-paper-2/60 px-4 focus-within:border-ink/30"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-ink-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anything… or ask: campaigns that make the audience participate"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
      </form>
      <Link href="/think" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-2 hover:bg-paper-2 md:inline-flex">
        <Sparkles className="h-4 w-4" /> Think
      </Link>
      <Link href="/?add=1" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper hover:opacity-90">
        <Plus className="h-4 w-4" /> Add
      </Link>
    </header>
  );
}
