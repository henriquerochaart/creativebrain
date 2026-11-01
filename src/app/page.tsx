import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { CaptureBox } from "@/components/capture-box";
import { ReferenceGrid } from "@/components/reference-grid";
import { LiveRefresh } from "@/components/live-refresh";
import { Thumb } from "@/components/thumb";
import { BrainThink } from "@/components/brain-think";
import { Emoji } from "@/components/emoji";
import { Thing } from "@/components/thing";
import { AddButton, AddCard } from "@/components/library-client";
import { facetCounts, kindCounts, listCollections, listReferences, toPublic, type PublicReference } from "@/server/references";
import { SUBJECTS } from "@/server/taxonomy";
import { dict } from "@/server/lang";
import { platformLabel, taxonomyLabel, type Dict, type Lang } from "@/lib/i18n";
import { PLATFORM_ICON, PLATFORM_ORDER, SUBJECT_ICON, TYPE_ICON, TYPE_ORDER } from "@/lib/emoji";
import { displayTitle } from "@/lib/utils";
import { Mascot } from "@/components/mascot";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** How many of the newest references the Recent row shows; the grid below starts after them. */
const RECENT = 14;

/**
 * The library, laid out like a phone app's home: quick filters, the newest references as a row
 * to flick through, categories, collections, then everything older in the masonry. Nothing appears
 * twice: the grid starts where the Recent row ends.
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
  const recent = refs.slice(0, RECENT);
  const earlier = refs.slice(RECENT);
  const processing = refs.some((r) => r.status === "queued" || r.status === "processing");
  const subjectCount = new Map(subjects.map((s) => [s.value, s.count]));
  const orderedSubjects = SUBJECTS.filter((s) => subjectCount.has(s)).sort((a, b) => (subjectCount.get(b) ?? 0) - (subjectCount.get(a) ?? 0));
  const chips = [
    ...TYPE_ORDER.filter((k) => kinds.type[k]).map((k) => ({ href: `/c/type/${k}`, icon: TYPE_ICON[k], label: d.home.kinds[k] ?? k })),
    ...PLATFORM_ORDER.filter((p) => kinds.platform[p]).map((p) => ({ href: `/c/platform/${p}`, icon: PLATFORM_ICON[p], label: platformLabel(lang, p) })),
  ];
  const row = "scroll-row -mx-4 scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0";

  if (!refs.length) {
    return (
      <div className="space-y-9">
        <h1 className="large-title">{d.app.short}</h1>
        <section className="hidden lg:block">
          <Suspense>
            <CaptureBox />
          </Suspense>
        </section>
        <div className="flex flex-col items-center gap-4 rounded-[28px] bg-paper-2 px-6 py-14 text-center">
          <Mascot pose="apontando" className="h-36 w-36" />
          <p className="max-w-sm text-[17px] leading-[22px] text-ink">{d.home.emptyTitle}</p>
          <AddButton className="mt-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-9">
      {/* The tab's large title, as on every tab: there is no header above it. */}
      <h1 className="large-title mb-5">{d.app.short}</h1>

      {/* On a wide screen the field stays right here, where files can be dropped. A phone adds through the tab bar's +. */}
      <section className="hidden lg:block">
        <Suspense>
          <CaptureBox />
        </Suspense>
      </section>

      {chips.length > 0 && (
        <nav className={`${row} gap-2`} aria-label={d.home.categories}>
          {chips.map((c) => (
            <Link key={c.href} href={c.href} className="chip pl-2.5">
              <Thing name={c.icon} className="h-7 w-7" />
              {c.label}
            </Link>
          ))}
        </nav>
      )}

      <Link href="/settings#instalar" className="flex min-h-16 items-center gap-3 rounded-[20px] bg-paper-2 px-4 py-2.5 transition-colors hover:bg-fill">
        <Thing name="smartphone" className="h-10 w-10" />
        <span className="flex-1 text-[17px] font-semibold leading-[22px]">{d.home.importBanner}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
      </Link>

      <section>
        <h2 className="title-2">{d.home.recent}</h2>
        <div className={`${row} mt-3 gap-3`}>
          {recent.map((r) => (
            <RecentCard key={r.id} reference={r} lang={lang} d={d} />
          ))}
          <div className="w-[150px] sm:w-[172px]">
            <AddCard />
          </div>
        </div>
      </section>

      {orderedSubjects.length > 0 && (
        <section>
          <h2 className="title-2">{d.home.categories}</h2>
          <div className={`${row} mt-3 gap-1`}>
            {orderedSubjects.map((s) => (
              <Link key={s} href={`/c/subject/${encodeURIComponent(s)}`} className="group flex w-[88px] flex-col items-center gap-2 text-center">
                <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-paper-2 transition-transform duration-150 group-hover:scale-[1.04] group-active:scale-95">
                  <Thing name={SUBJECT_ICON[s] ?? "ai-sparkle"} className="h-12 w-12" />
                </span>
                <span className="line-clamp-2 text-[13px] leading-4 text-ink-2">{taxonomyLabel(lang, "subjects", s)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="title-2">
          <Link href="/collections" className="inline-flex items-center gap-1 hover:opacity-70">
            {d.home.collections}
            <ChevronRight className="h-6 w-6 text-ink-3" strokeWidth={2.5} />
          </Link>
        </h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {collections.slice(0, 10).map((c) => (
            <Link key={c.id} href={`/collections/${c.slug}`} className="flex h-14 items-center gap-3 rounded-[18px] bg-paper-2 px-4 text-[16px] font-semibold transition-colors hover:bg-fill">
              {c.emoji ? (
                <span className="text-[22px] leading-none">
                  <Emoji char={c.emoji} />
                </span>
              ) : (
                <Thing name="folder" className="h-8 w-8" />
              )}
              {c.name}
            </Link>
          ))}
          <Link href="/collections" className="flex h-14 items-center gap-2 rounded-[18px] border-2 border-dashed border-line px-4 text-[16px] font-semibold text-ink-2 transition-colors hover:border-ink-3">
            + {d.home.newCollection}
          </Link>
        </div>
      </section>

      {earlier.length > 0 && (
        <section>
          <h2 className="title-2 mb-4">{d.home.earlier}</h2>
          <ReferenceGrid references={earlier} lang={lang} showStatus />
        </section>
      )}
      <LiveRefresh active={processing} />
    </div>
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
            <BrainThink className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-[18px] text-ink-3">{platformLabel(lang, r.sourcePlatform)}</p>
      <h3 className="line-clamp-2 text-[15px] font-semibold leading-5">{displayTitle(r.title, d.card.untitled)}</h3>
    </Link>
  );
}
