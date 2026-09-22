import Link from "next/link";
import type { PublicReference } from "@/server/references";
import { Thumb } from "./thumb";
import { StatusDot } from "./status-dot";
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
  const processing = r.status !== "understood";
  const summary = r.ai.whyInteresting ?? r.ai.summary;
  return (
    <Link href={`/r/${r.id}`} className="group block overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <div className="relative overflow-hidden bg-paper-2">
        <Thumb reference={r} lang={lang} className="transition-transform duration-500 group-hover:scale-[1.02]" />
        {r.mediaType === "video" && (
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">▶ {d.card.video}</span>
        )}
        {r.mediaType === "pdf" && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">{d.card.pdf}</span>}
        {processing && (
          <span className="absolute right-3 top-3 rounded-full bg-paper/90 px-2 py-0.5 backdrop-blur">
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
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">{r.title ?? d.card.untitled}</h3>
        {cats.length > 0 && <p className="mt-1 text-[13px] text-ink-2">{cats.join(" / ")}</p>}
        {r.tags.length > 0 && (
          <p className="mt-2 line-clamp-1 text-[12px] text-ink-3">{r.tags.slice(0, 4).map((t2) => `#${t2}`).join(" ")}</p>
        )}
        <p className="mt-3 text-[12px] text-ink-3">
          {platformLabel(lang, r.sourcePlatform)} · {yearOf(r.metadata.publishedAt ?? r.createdAt)}
          {showStatus && processing ? " · " : ""}
          {showStatus && processing && <StatusDot status={r.status} step={r.processingStep} lang={lang} />}
        </p>
      </div>
    </Link>
  );
}
