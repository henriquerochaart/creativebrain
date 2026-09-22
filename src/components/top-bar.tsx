"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useT } from "./lang-provider";
import { LangSwitch } from "./lang-switch";

export function TopBar() {
  const router = useRouter();
  const params = useSearchParams();
  const d = useT();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/85 px-6 backdrop-blur">
      <Link href="/" className="shrink-0 text-[13px] font-semibold uppercase tracking-[0.18em]">
        {d.app.name}
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
          placeholder={d.header.search}
          aria-label={d.header.search}
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
      </form>
      <LangSwitch />
      <Link href="/?add=1" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper hover:opacity-90">
        <Plus className="h-4 w-4" /> {d.header.add}
      </Link>
    </header>
  );
}
