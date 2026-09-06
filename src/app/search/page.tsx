import Link from "next/link";
import { search, type SearchMode } from "@/server/search";
import { toPublic } from "@/server/references";
import { ReferenceGrid } from "@/components/reference-grid";
import { WhyThese } from "@/components/why-these";
import { cn } from "@/lib/utils";

const MODES: { value: SearchMode; label: string; hint: string }[] = [
  { value: "hybrid", label: "All", hint: "keyword + semantic + conceptual + visual" },
  { value: "keyword", label: "Keyword", hint: "exact words" },
  { value: "semantic", label: "Semantic", hint: "what it is about" },
  { value: "conceptual", label: "Conceptual", hint: "strategy and mechanism" },
  { value: "visual", label: "Visual", hint: "how it looks" },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const mode = (sp.mode as SearchMode) ?? "hybrid";
  const result = q ? await search(q, { mode, limit: 40 }) : null;
  const refs = result?.hits.map((h) => toPublic(h.reference)) ?? [];
  const titles = Object.fromEntries(refs.map((r) => [r.id, r.title ?? "Untitled"]));
  const sourcesById: Record<string, string[]> = Object.fromEntries((result?.hits ?? []).map((h) => [h.reference.id, Object.keys(h.sources)]));
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Search</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{q || "What are you looking for?"}</h1>
        {result && (
          <p className="mt-1 text-sm text-ink-2">
            {result.total} reference{result.total === 1 ? "" : "s"}
            {result.degraded ? ` · ${result.degraded}` : ""}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-1">
          {MODES.map((m) => (
            <Link key={m.value} href={`/search?q=${encodeURIComponent(q)}&mode=${m.value}`} title={m.hint} className={cn("rounded-full px-3 py-1 text-[13px]", mode === m.value ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2")}>
              {m.label}
            </Link>
          ))}
        </div>
      </header>
      {q && refs.length > 0 && <WhyThese query={q} ids={refs.slice(0, 12).map((r) => r.id)} titles={titles} />}
      <ReferenceGrid references={refs} kindsById={sourcesById} empty={q ? "Nothing matched. Try describing the idea rather than the brand." : "Type a brand, a mechanism, or a brief."} />
    </div>
  );
}
