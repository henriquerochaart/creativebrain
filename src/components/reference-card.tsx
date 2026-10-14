import Link from "next/link";
import type { PublicReference } from "@/server/references";
import { Thumb } from "./thumb";
import { StatusDot } from "./status-dot";
import { UnderstandingProgress } from "./understanding-progress";
import { truncate, yearOf } from "@/lib/utils";
import { platformLabel, t, taxonomyLabel, type Lang } from "@/lib/i18n";

/**
 * Visual first. Hover reveals the understanding: summary + counts of concepts, tags, relations.
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
    <Link href={`/r/${r.id}`} className="group block overflow-hidden rounded-[20px] bg-surface shadow-[var(--card-shadow)] transition-shadow duration-300 hover:shadow-[var(--card-shadow-hover)]">
      <div className="relative overflow-hidden bg-paper-2">
        <Thumb reference={r} lang={lang} className="transition-transform duration-500 group-hover:scale-[1.02]" />
        {r.mediaType === "video" && (
          <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-md">▶ {d.card.video}</span>
        )}
        {r.mediaType === "pdf" && <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-md">{d.card.pdf}</span>}
        {unfinished && (
          <span className="material absolute right-3 top-3 rounded-full px-2.5 py-1">
            <StatusDot status={r.status} step={r.processingStep} lang={lang} />
          </span>
        )}
        {summary && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <p className="text-[13px] leading-snug text-white/95">“{truncate(summary, 180)}”</p>
            <div className="mt-3 flex gap-3 text-[11px] text-white/70">
              <span>{r.concepts.length} {d.card.concepts}</span>
              <span>{r.tags.length} {d.card.tags}</span>
              {kinds?.length ? <span>{kinds.join(" · ")}</span> : null}
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-5">{r.title ?? d.card.untitled}</h3>
        {cats.length > 0 && <p className="mt-1 text-[13px] text-ink-2">{cats.join(" / ")}</p>}
        {r.tags.length > 0 && (
          <p className="mt-2 line-clamp-1 text-[12px] text-ink-3">{r.tags.slice(0, 4).map((t2) => `#${t2}`).join(" ")}</p>
        )}
        <p className="mt-3 text-[12px] text-ink-3">
          {platformLabel(lang, r.sourcePlatform)} · {yearOf(r.metadata.publishedAt ?? r.createdAt)}
        </p>
        {showStatus && inFlight && <UnderstandingProgress step={r.processingStep} className="mt-3" />}
      </div>
    </Link>
  );
}
