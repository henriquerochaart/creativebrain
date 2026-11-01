import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { CaptureBox } from "@/components/capture-box";
import { ReferenceGrid } from "@/components/reference-grid";
import { LiveRefresh } from "@/components/live-refresh";
import { Thumb } from "@/components/thumb";
import { BrainThink } from "@/components/brain-think";
import { AddButton, AddCard, AllCategoriesChip } from "@/components/library-client";
import { facetCounts, kindCounts, listCollections, listReferences, toPublic, type PublicReference } from "@/server/references";
import { SUBJECTS } from "@/server/taxonomy";
import { dict } from "@/server/lang";
import { platformLabel, taxonomyLabel, type Dict, type Lang } from "@/lib/i18n";
import { PLATFORM_EMOJI, PLATFORM_ORDER, SUBJECT_EMOJI, TYPE_EMOJI, TYPE_ORDER } from "@/lib/emoji";
import { displayTitle } from "@/lib/utils";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/**
 * The library, laid out like a phone app's home: quick filters, a way to set up capture from other
 * apps, what was saved last as a row to flick through, categories as bubbles, collections as pills,
 * and then everything, in the masonry.
 */
export default async function Home() {
  const { lang, d } = await dict();
  const [rows, kinds, subjects, collections] = await Promise.all([
    safe(() => listReferences({ limit: 120 }), []),
    safe(kindCounts, { type: {}, platform: {} }),
    safe(() => facetCounts("subjects", 40), []),
    safe(listCollections, []),
  ]);
  const refs = rows.map(toPublic);
  const processing = refs.some((r) => r.status === "queued" || r.status === "processing");
  const subjectCount = new Map(subjects.map((s) => [s.value, s.count]));
  const orderedSubjects = SUBJECTS.filter((s) => subjectCount.has(s)).sort((a, b) => (subjectCount.get(b) ?? 0) - (subjectCount.get(a) ?? 0));
  const chips = [
    ...TYPE_ORDER.filter((k) => kinds.type[k]).map((k) => ({ href: `/c/type/${k}`, emoji: TYPE_EMOJI[k], label: d.home.kinds[k] ?? k })),
    ...PLATFORM_ORDER.filter((p) => kinds.platform[p]).map((p) => ({ href: `/c/platform/${p}`, emoji: PLATFORM_EMOJI[p], label: platformLabel(lang, p) })),
  ];

  return (
    <div className="space-y-9">
      <h1 className="sr-only">{d.app.name}</h1>

      {/* On a wide screen the field stays right here, where files can be dropped. A phone adds through the tab bar's +. */}
      <section className="hidden lg:block">
        <Suspense>
          <CaptureBox />
        </Suspense>
      </section>

      {refs.length > 0 && (
        <>
          {chips.length > 0 && (
            <nav className="scroll-row scroll-px-4 sm:scroll-px-6 lg:scroll-px-0 -mx-4 gap-2 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" aria-label={d.home.categories}>
              {chips.map((c) => (
                <Link key={c.href} href={c.href} className="chip">
                  <span className="text-[20px] leading-none" aria-hidden>
                    {c.emoji}
                  </span>
                  {c.label}
                </Link>
              ))}
              <AllCategoriesChip />
            </nav>
          )}

          <Link href="/share/setup" className="flex min-h-16 items-center gap-4 rounded-[20px] bg-paper-2 px-5 py-3 transition-colors hover:bg-fill">
            <span className="text-[26px] leading-none" aria-hidden>
              📲
            </span>
            <span className="flex-1 text-[17px] font-semibold leading-[22px]">{d.home.importBanner}</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
          </Link>

          <section>
            <SectionTitle title={d.home.recent} href="#tudo" />
            <div className="scroll-row scroll-px-4 sm:scroll-px-6 lg:scroll-px-0 -mx-4 mt-3 gap-3 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {refs.slice(0, 14).map((r) => (
                <RecentCard key={r.id} reference={r} lang={lang} d={d} />
              ))}
              <div className="w-[150px] sm:w-[172px]">
                <AddCard />
              </div>
            </div>
          </section>

          {orderedSubjects.length > 0 && (
            <section>
              <SectionTitle title={d.home.categories} />
              <div className="scroll-row scroll-px-4 sm:scroll-px-6 lg:scroll-px-0 -mx-4 mt-3 gap-1 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                {orderedSubjects.map((s) => (
                  <Link key={s} href={`/c/subject/${encodeURIComponent(s)}`} className="group flex w-[88px] flex-col items-center gap-2 text-center">
                    <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-paper-2 text-[34px] leading-none transition-transform duration-150 group-hover:scale-[1.04] group-active:scale-95" aria-hidden>
                      {SUBJECT_EMOJI[s] ?? "✨"}
                    </span>
                    <span className="line-clamp-2 text-[13px] leading-4 text-ink-2">{taxonomyLabel(lang, "subjects", s)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle title={d.home.collections} href="/collections" />
            <div className="mt-3 flex flex-wrap gap-2.5">
              {collections.slice(0, 10).map((c) => (
                <Link key={c.id} href={`/collections/${c.slug}`} className="flex h-14 items-center gap-3 rounded-[18px] bg-paper-2 px-4 text-[16px] font-semibold transition-colors hover:bg-fill">
                  <span className="text-[22px] leading-none" aria-hidden>
                    {c.emoji || "📁"}
                  </span>
                  {c.name}
                </Link>
              ))}
              <Link href="/collections" className="flex h-14 items-center gap-2 rounded-[18px] border-2 border-dashed border-line px-4 text-[16px] font-semibold text-ink-2 transition-colors hover:border-ink-3">
                + {d.home.newCollection}
              </Link>
            </div>
          </section>
        </>
      )}

      <section id="tudo" className="scroll-mt-24">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="title-2">{d.home.allReferences}</h2>
          <span className="text-[13px] text-ink-3">{refs.length}</span>
        </div>
        {refs.length ? (
          <ReferenceGrid references={refs} lang={lang} showStatus />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-[28px] bg-paper-2 px-6 py-14 text-center">
            <span className="text-[56px] leading-none" aria-hidden>
              🧠
            </span>
            <p className="max-w-md text-[17px] leading-[22px] text-ink">{d.home.emptyTitle}</p>
            <p className="text-[15px] text-ink-2">{d.home.emptySub}</p>
            <AddButton className="mt-2" />
          </div>
        )}
      </section>
      <LiveRefresh active={processing} />
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  if (!href) return <h2 className="title-2">{title}</h2>;
  return (
    <h2 className="title-2">
      <Link href={href} className="inline-flex items-center gap-1 hover:opacity-70">
        {title}
        <ChevronRight className="h-6 w-6 text-ink-3" strokeWidth={2.5} />
      </Link>
    </h2>
  );
}

function RecentCard({ reference: r, lang, d }: { reference: PublicReference; lang: Lang; d: Dict }) {
  const inFlight = r.status === "queued" || r.status === "processing";
  return (
    <Link href={`/r/${r.id}`} className="group block w-[150px] sm:w-[172px]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] bg-fill">
        <Thumb reference={r} lang={lang} sizes="172px" className="aspect-auto h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        {r.mediaType === "video" && (
          <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-[11px] text-white backdrop-blur-md" aria-hidden>
            ▶
          </span>
        )}
        {inFlight && (
          <span className="material absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-full">
            <BrainThink className="text-[15px]" />
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-[18px] text-ink-3">{platformLabel(lang, r.sourcePlatform)}</p>
      <h3 className="line-clamp-2 text-[15px] font-semibold leading-5">{displayTitle(r.title, d.card.untitled)}</h3>
    </Link>
  );
}
