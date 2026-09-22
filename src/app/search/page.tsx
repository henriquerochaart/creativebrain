import Link from "next/link";
import { search, type SearchMode } from "@/server/search";
import { toPublic } from "@/server/references";
import { ReferenceGrid } from "@/components/reference-grid";
import { WhyThese } from "@/components/why-these";
import { cn } from "@/lib/utils";
import { dict } from "@/server/lang";

const MODES: SearchMode[] = ["hybrid", "keyword", "semantic", "conceptual", "visual"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { lang, d } = await dict();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const mode = (sp.mode as SearchMode) ?? "hybrid";
  const result = q ? await search(q, { mode, limit: 40 }) : null;
  const refs = result?.hits.map((h) => toPublic(h.reference)) ?? [];
  const titles = Object.fromEntries(refs.map((r) => [r.id, r.title ?? d.card.untitled]));
  const sourcesById: Record<string, string[]> = Object.fromEntries((result?.hits ?? []).map((h) => [h.reference.id, Object.keys(h.sources)]));
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{d.search.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{q || d.search.prompt}</h1>
        {result && (
          <p className="mt-1 text-sm text-ink-2">
            {d.search.references(result.total)}
            {result.degraded ? ` · ${result.degraded}` : ""}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-1">
          {MODES.map((m) => (
            <Link key={m} href={`/search?q=${encodeURIComponent(q)}&mode=${m}`} title={d.search.modes[m].hint} className={cn("rounded-full px-3 py-1 text-[13px]", mode === m ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2")}>
              {d.search.modes[m].label}
            </Link>
          ))}
        </div>
      </header>
      {q && refs.length > 0 && <WhyThese query={q} ids={refs.slice(0, 12).map((r) => r.id)} titles={titles} />}
      <ReferenceGrid references={refs} lang={lang} kindsById={sourcesById} empty={q ? d.search.emptyNoMatch : d.search.emptyType} />
    </div>
  );
}
