import Link from "next/link";
import { brandCounts, facetCounts, platformCounts, statusCounts } from "@/server/references";
import { CREATIVE_PRINCIPLES } from "@/server/taxonomy";
import { trends } from "@/server/insights";
import { TasteNarrative } from "@/components/taste-narrative";
import { dict } from "@/server/lang";
import { platformLabel, taxonomyLabel, type TaxonomyKind } from "@/lib/i18n";

/**
 * MY PATTERNS — what the Brain notices about what you save.
 * V1 is deterministic aggregation over the understood repertoire; V2 layers narrative and auto-collections.
 */
export default async function PatternsPage() {
  const { lang, d } = await dict();
  const [principles, subjects, formats, concepts, tags, brands, platforms, status, risingTags, risingPrinciples, risingConcepts] = await Promise.all([
    facetCounts("principles", 30),
    facetCounts("subjects", 30),
    facetCounts("formats", 30),
    facetCounts("concepts", 40),
    facetCounts("tags", 60),
    brandCounts(30),
    platformCounts(),
    statusCounts(),
    trends("tags", 30, 90, 10),
    trends("principles", 30, 90, 6),
    trends("concepts", 30, 90, 10),
  ]);
  const understood = status.understood ?? 0;
  const pct = (n: number) => (understood ? Math.round((n / understood) * 100) : 0);
  const label = (kind: TaxonomyKind, v: string) => taxonomyLabel(lang, kind, v);
  const sentences: string[] = [];
  if (principles[0]) sentences.push(d.patterns.lead.principle(label("principles", principles[0].value), pct(principles[0].count)));
  if (subjects[0] && subjects[1]) sentences.push(d.patterns.lead.subjects(label("subjects", subjects[0].value), label("subjects", subjects[1].value)));
  if (formats[0]) sentences.push(d.patterns.lead.format(label("formats", formats[0].value)));
  if (brands[0]) sentences.push(d.patterns.lead.brand(brands[0].value, brands[0].count));
  if (concepts.length >= 3) sentences.push(d.patterns.lead.concepts(concepts.slice(0, 5).map((c) => c.value).join(", ")));

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <header>
        <p className="eyebrow">{d.patterns.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{d.patterns.title}</h1>
        <p className="mt-1 text-sm text-ink-2">{d.patterns.basedOn(understood)}</p>
      </header>

      {sentences.length > 0 ? (
        <ul className="space-y-3 text-xl font-medium tracking-tight">
          {sentences.map((s) => (
            <li key={s}>→ {s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-3">{d.patterns.emerge}</p>
      )}

      <TasteNarrative />

      <section>
        <h2 className="eyebrow mb-1">{d.patterns.trend}</h2>
        <p className="mb-4 text-sm text-ink-2">{d.patterns.trendSub}</p>
        {risingTags.length + risingPrinciples.length + risingConcepts.length === 0 ? (
          <p className="text-sm text-ink-3">{d.patterns.trendEmpty}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {(
              [
                [d.patterns.principles, risingPrinciples, (v: string) => `/c/principle/${encodeURIComponent(v)}`, "principles" as TaxonomyKind],
                [d.patterns.tags, risingTags, (v: string) => `/c/tag/${encodeURIComponent(v)}`, null],
                [d.patterns.concepts, risingConcepts, null, null],
              ] as [string, typeof risingTags, ((v: string) => string) | null, TaxonomyKind | null][]
            ).map(([title, items, href, kind]) => (
              <div key={title}>
                <p className="eyebrow mb-2">{title}</p>
                <ul className="space-y-1.5 text-sm">
                  {items.map((tr) => (
                    <li key={tr.value} className="flex items-baseline justify-between gap-3">
                      {href ? (
                        <Link href={href(tr.value)} className="truncate hover:underline">{kind ? label(kind, tr.value) : tr.value}</Link>
                      ) : (
                        <span className="truncate">{kind ? label(kind, tr.value) : tr.value}</span>
                      )}
                      <span className="shrink-0 font-mono text-[12px] text-ink-3">
                        {tr.recent} <span className={tr.lift >= 2 ? "text-accent" : ""}>×{tr.lift}</span>
                      </span>
                    </li>
                  ))}
                  {!items.length && <li className="text-ink-3">—</li>}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-4">{d.patterns.principles}</h2>
        <ul className="space-y-2">
          {CREATIVE_PRINCIPLES.map((p) => {
            const n = principles.find((x) => x.value === p)?.count ?? 0;
            return (
              <li key={p} className="grid grid-cols-[160px_1fr_48px] items-center gap-4 text-sm">
                <Link href={`/c/principle/${encodeURIComponent(p)}`} className="truncate hover:underline">
                  {label("principles", p)}
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
        <Facet title={d.patterns.subjects} items={subjects.map((s) => ({ ...s, display: label("subjects", s.value) }))} href={(v) => `/c/subject/${encodeURIComponent(v)}`} />
        <Facet title={d.patterns.formats} items={formats.map((f) => ({ ...f, display: label("formats", f.value) }))} href={(v) => `/c/format/${encodeURIComponent(v)}`} />
        <Facet title={d.patterns.brands} items={brands.map((b) => ({ ...b, display: b.value }))} href={(v) => `/c/brand/${encodeURIComponent(v)}`} />
        <Facet title={d.patterns.platforms} items={platforms.map((p) => ({ ...p, display: platformLabel(lang, p.value) }))} href={(v) => `/c/platform/${encodeURIComponent(v)}`} />
      </div>

      <section>
        <h2 className="eyebrow mb-4">{d.patterns.concepts}</h2>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {concepts.map((c) => (
            <span key={c.value} style={{ fontSize: `${Math.min(24, 12 + c.count * 2)}px` }} className="text-ink-2">
              {c.value}
            </span>
          ))}
        </p>
      </section>

      <section>
        <h2 className="eyebrow mb-4">{d.patterns.tags}</h2>
        <p className="flex flex-wrap gap-2">
          {tags.map((tg) => (
            <Link key={tg.value} href={`/c/tag/${encodeURIComponent(tg.value)}`} className="rounded-full bg-paper-2 px-2.5 py-0.5 text-[12px] text-ink-2 hover:bg-line">
              #{tg.value} <span className="text-ink-3">{tg.count}</span>
            </Link>
          ))}
        </p>
      </section>
    </div>
  );
}

function Facet({ title, items, href }: { title: string; items: { value: string; count: number; display: string }[]; href: (v: string) => string }) {
  return (
    <section>
      <h2 className="eyebrow mb-3">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {items.slice(0, 10).map((i) => (
          <li key={i.value} className="flex items-baseline justify-between gap-3">
            <Link href={href(i.value)} className="truncate hover:underline">
              {i.display}
            </Link>
            <span className="font-mono text-[12px] text-ink-3">{i.count}</span>
          </li>
        ))}
        {!items.length && <li className="text-ink-3">—</li>}
      </ul>
    </section>
  );
}
