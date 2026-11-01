import Link from "next/link";
import type { PublicReference } from "@/server/references";
import { Thumb } from "./thumb";
import { StatusDot } from "./status-dot";
import { UnderstandingProgress } from "./understanding-progress";
import { BrainThink } from "./brain-think";
import { displayTitle, truncate, yearOf } from "@/lib/utils";
import { platformLabel, t, taxonomyLabel, type Lang } from "@/lib/i18n";

/**
 * Visual first. Hover (on a wide screen) reveals the understanding: summary + counts of concepts,
 * tags, relations.
 * Pure server component — no JS shipped for hundreds of cards.
 */
export function ReferenceCard({ reference, showStatus = false, kinds, lang = "pt" }: { reference: PublicReference; showStatus?: boolean; kinds?: string[]; lang?: Lang }) {
  const r = reference;
  const d = t(lang);
  const cats = [...r.formats.slice(0, 1).map((f) => taxonomyLabel(lang, "formats", f)), ...r.subjects.slice(0, 2).map((s) => taxonomyLabel(lang, "subjects", s))];
  // Two different questions: is it finished (the corner badge, which also says "failed"), and is
  // work actually under way (the progress bar — never for a failed reference, which isn't queued).
  const unfinished = r.status !== "understood";
  const inFlight = r.status === "queued" || r.status === "processing";
  const summary = r.ai.whyInteresting ?? r.ai.summary;
  return (
    // No card shell: the picture, rounded, and the words under it — the way a phone library shows
    // what you saved. The picture carries the weight; the type stays quiet.
    <Link href={`/r/${r.id}`} className="group block">
      <div className="relative overflow-hidden rounded-[22px] bg-fill">
        <Thumb reference={r} lang={lang} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        {r.mediaType === "video" && (
          <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-[11px] text-white backdrop-blur-md" aria-label={d.card.video}>
            ▶
          </span>
        )}
        {r.mediaType === "pdf" && <span className="absolute left-2.5 top-2.5 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-md">{d.card.pdf}</span>}
        {inFlight && (
          <span className="material absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full">
            <BrainThink className="text-[15px]" />
          </span>
        )}
        {unfinished && !inFlight && (
          <span className="material absolute right-2.5 top-2.5 rounded-full px-2.5 py-1">
            <StatusDot status={r.status} step={r.processingStep} lang={lang} />
          </span>
        )}
        {summary && (
          <div className="pointer-events-none absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
            <p className="text-[13px] leading-snug text-white/95">“{truncate(summary, 180)}”</p>
            <div className="mt-3 flex gap-3 text-[11px] text-white/70">
              <span>{r.concepts.length} {d.card.concepts}</span>
              <span>{r.tags.length} {d.card.tags}</span>
              {kinds?.length ? <span>{kinds.join(" · ")}</span> : null}
            </div>
          </div>
        )}
      </div>
      <div className="px-1 pt-2">
        <p className="text-[13px] leading-[18px] text-ink-3">
          {platformLabel(lang, r.sourcePlatform)}
          {yearOf(r.metadata.publishedAt ?? r.createdAt) ? ` · ${yearOf(r.metadata.publishedAt ?? r.createdAt)}` : ""}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-5">{displayTitle(r.title, d.card.untitled)}</h3>
        {cats.length > 0 && <p className="mt-1 line-clamp-1 text-[13px] leading-[18px] text-ink-2">{cats.join(" · ")}</p>}
        {showStatus && inFlight && <UnderstandingProgress step={r.processingStep} className="mt-2.5" />}
      </div>
    </Link>
  );
}
