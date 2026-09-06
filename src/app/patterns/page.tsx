import Link from "next/link";
import { brandCounts, facetCounts, platformCounts, statusCounts } from "@/server/references";
import { CREATIVE_PRINCIPLES } from "@/server/taxonomy";
import { platformLabel } from "@/lib/utils";

/**
 * MY PATTERNS — what the Brain notices about what you save.
 * V1 is deterministic aggregation over the understood repertoire; V2 layers narrative and auto-collections.
 */
export default async function PatternsPage() {
  const [principles, subjects, formats, concepts, tags, brands, platforms, status] = await Promise.all([
    facetCounts("principles", 30),
    facetCounts("subjects", 30),
    facetCounts("formats", 30),
    facetCounts("concepts", 40),
    facetCounts("tags", 60),
    brandCounts(30),
    platformCounts(),
    statusCounts(),
  ]);
  const understood = status.understood ?? 0;
  const pct = (n: number) => (understood ? Math.round((n / understood) * 100) : 0);
  const sentences: string[] = [];
  if (principles[0]) sentences.push(`You keep coming back to ${principles[0].value.toLowerCase()} — it appears in ${pct(principles[0].count)}% of what you save.`);
  if (subjects[0] && subjects[1]) sentences.push(`Your repertoire leans ${subjects[0].value} and ${subjects[1].value}.`);
  if (formats[0]) sentences.push(`${formats[0].value} is your most collected format.`);
  if (brands[0]) sentences.push(`${brands[0].value} is the brand you have studied most (${brands[0].count}).`);
  if (concepts.length >= 3) sentences.push(`Recurring concepts: ${concepts.slice(0, 5).map((c) => c.value).join(", ")}.`);

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <header>
        <p className="eyebrow">My patterns</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Things you seem to like</h1>
        <p className="mt-1 text-sm text-ink-2">Based on {understood} understood reference{understood === 1 ? "" : "s"}.</p>
      </header>

      {sentences.length > 0 ? (
        <ul className="space-y-3 text-xl font-medium tracking-tight">
          {sentences.map((s) => (
            <li key={s}>→ {s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-3">Patterns emerge after a few dozen references are understood.</p>
      )}

      <section>
        <h2 className="eyebrow mb-4">Creative principles</h2>
        <ul className="space-y-2">
          {CREATIVE_PRINCIPLES.map((p) => {
            const n = principles.find((x) => x.value === p)?.count ?? 0;
            return (
              <li key={p} className="grid grid-cols-[160px_1fr_48px] items-center gap-4 text-sm">
                <Link href={`/c/principle/${encodeURIComponent(p)}`} className="truncate hover:underline">
                  {p}
                </Link>
                <div className="h-1.5 rounded-full bg-paper-2">
                  <div className="h-1.5 rounded-full bg-ink" style={{ width: `${pct(n)}%` }} />
                </div>
                <span className="text-right font-mono text-[12px] text-ink-3">{n}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-10 md:grid-cols-2">
        <Facet title="Subjects" items={subjects} href={(v) => `/c/subject/${encodeURIComponent(v)}`} />
        <Facet title="Formats" items={formats} href={(v) => `/c/format/${encodeURIComponent(v)}`} />
        <Facet title="Brands" items={brands} href={(v) => `/c/brand/${encodeURIComponent(v)}`} />
        <Facet title="Platforms" items={platforms.map((p) => ({ value: platformLabel(p.value), count: p.count, key: p.value }))} href={(v, key) => `/c/platform/${encodeURIComponent(key ?? v)}`} />
      </div>

      <section>
        <h2 className="eyebrow mb-4">Concepts</h2>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {concepts.map((c) => (
            <span key={c.value} style={{ fontSize: `${Math.min(24, 12 + c.count * 2)}px` }} className="text-ink-2">
              {c.value}
            </span>
          ))}
        </p>
      </section>

      <section>
        <h2 className="eyebrow mb-4">Tags</h2>
        <p className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link key={t.value} href={`/c/tag/${encodeURIComponent(t.value)}`} className="rounded-full bg-paper-2 px-2.5 py-0.5 text-[12px] text-ink-2 hover:bg-line">
              #{t.value} <span className="text-ink-3">{t.count}</span>
            </Link>
          ))}
        </p>
      </section>
    </div>
  );
}

function Facet({ title, items, href }: { title: string; items: { value: string; count: number; key?: string }[]; href: (v: string, key?: string) => string }) {
  return (
    <section>
      <h2 className="eyebrow mb-3">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {items.slice(0, 10).map((i) => (
          <li key={i.value} className="flex items-baseline justify-between gap-3">
            <Link href={href(i.value, i.key)} className="truncate hover:underline">
              {i.value}
            </Link>
            <span className="font-mono text-[12px] text-ink-3">{i.count}</span>
          </li>
        ))}
        {!items.length && <li className="text-ink-3">—</li>}
      </ul>
    </section>
  );
}
