import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ExternalLink, Play } from "lucide-react";
import { collectionsOfReference, getReference, listCollections, relatedReferences, similarReferences, toPublic, failStuck, STUCK_AFTER_MS } from "@/server/references";
import { getStorage } from "@/server/storage";
import { Thumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { ReferenceGrid } from "@/components/reference-grid";
import { AskReference } from "@/components/ask-reference";
import { LiveRefresh } from "@/components/live-refresh";
import { CollectionPicker, DeleteButton, ReprocessButton, SaveToggle } from "@/components/reference-actions";
import { displayTitle, formatDuration, localeOf, yearOf } from "@/lib/utils";
import { SIMILARITY_KINDS } from "@/server/taxonomy";
import { recordEvent } from "@/server/insights";
import { projectsOfReference, recentProjectsList } from "@/server/projects";
import { ProjectPicker } from "@/components/project-picker";
import { dict } from "@/server/lang";
import { UnderstandingProgress } from "@/components/understanding-progress";
import { platformLabel, taxonomyLabel } from "@/lib/i18n";
import { Thing } from "@/components/thing";
import type { ReferenceLink } from "@/server/db/schema";

export default async function ReferencePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { lang, d } = await dict();
  const { id } = await params;
  const sp = await searchParams;
  let ref = await getReference(id);
  if (!ref) notFound();
  // Still "processing" long after the last step: the run was cut off. Say so instead of polling.
  if (ref.status === "processing" && Date.now() - new Date(ref.updatedAt).getTime() > STUCK_AFTER_MS && (await failStuck()) > 0) ref = (await getReference(id)) ?? ref;
  const pub = toPublic(ref);
  const understood = ref.status === "understood";
  await recordEvent(ref.id, "view");
  const [member, all, related, byKind, inProjects, openProjects] = await Promise.all([
    collectionsOfReference(ref.id),
    listCollections(),
    understood ? relatedReferences(ref.id, 8).catch(() => []) : Promise.resolve([]),
    understood ? similarReferences(ref.id, 4).catch(() => null) : Promise.resolve(null),
    projectsOfReference(ref.id),
    recentProjectsList(8),
  ]);
  const mediaUrl = ref.mediaKey ? getStorage().url(ref.mediaKey) : null;
  const isPdf = mediaUrl && ref.mediaMime === "application/pdf";
  // A video is always its own thumbnail, and the thumbnail is the way to the video. One gesture for
  // every video, whether we hold the file or the platform kept it. An uploaded clip has no canonical
  // URL, so the stored file is its original.
  const isVideo = ref.mediaType === "video";
  const videoHref = isVideo ? ref.canonicalUrl ?? mediaUrl : null;
  const ai = ref.ai;
  const v = ref.content.visualAnalysis;
  const warnings = (ref.metadata as { warnings?: string[] }).warnings ?? [];
  const kindsById: Record<string, string[]> = Object.fromEntries(related.map((r) => [r.reference.id, r.kinds.map((k) => d.reference.kinds[k])]));

  return (
    <article className="mx-auto max-w-5xl space-y-10">
      {sp.shared && <p className="rounded-full bg-accent px-4 py-2 text-center text-[13px] font-medium text-on-accent">{d.reference.sharedBanner}</p>}
      {sp.dup && <p className="rounded-full bg-paper-2 px-4 py-2 text-center text-[13px] text-ink-2">{d.reference.dupBanner}</p>}
      <div className="relative overflow-hidden rounded-[28px] bg-paper-2">
        {/* Back as a round glass button floating on the picture, the way an app's detail screen does it. */}
        <Link href="/" aria-label={d.reference.back} className="material absolute left-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-ink shadow-sm transition-transform active:scale-95">
          <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
        </Link>
        {videoHref ? (
          <a href={videoHref} target="_blank" rel="noreferrer" aria-label={d.reference.openVideo} className="group relative block">
            <Thumb reference={pub} lang={lang} className="max-h-[70vh] object-contain" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform duration-300 group-hover:scale-110">
                <Play className="ml-1 h-6 w-6 fill-current" />
              </span>
            </span>
          </a>
        ) : isPdf ? (
          <iframe src={mediaUrl!} title={ref.title ?? "PDF"} className="h-[70vh] w-full" />
        ) : ref.mediaType === "text" && !ref.thumbnailUrl ? (
          <pre className="whitespace-pre-wrap p-8 font-sans text-base leading-relaxed">{ref.content.pageText}</pre>
        ) : (
          <Thumb reference={pub} lang={lang} className="max-h-[70vh] object-contain" />
        )}
      </div>

      <header>
        <p className="text-[15px] font-semibold text-ink-3">{platformLabel(lang, ref.sourcePlatform)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="large-title">{displayTitle(ref.title, d.card.untitled)}</h1>
          {ref.status === "failed" && <StatusDot status={ref.status} lang={lang} />}
        </div>
        <p className="mt-2 text-[15px] text-ink-2">
          {[
            ref.metadata.author ? `${ref.metadata.author}` : null,
            ref.metadata.durationSeconds ? formatDuration(ref.metadata.durationSeconds) : null,
            ref.metadata.pageCount ? `${ref.metadata.pageCount} p.` : null,
            yearOf(ref.metadata.publishedAt ?? ref.createdAt),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {(ref.status === "queued" || ref.status === "processing") && (
          <UnderstandingProgress step={ref.processingStep} className="mt-4 max-w-md rounded-[16px] bg-paper-2 p-4" />
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {ref.brand && <Badge href={`/c/brand/${encodeURIComponent(ref.brand)}`} tone="accent">{ref.brand}</Badge>}
          {ref.formats.map((f) => (
            <Badge key={f} href={`/c/format/${encodeURIComponent(f)}`}>{taxonomyLabel(lang, "formats", f)}</Badge>
          ))}
          {ref.subjects.map((s) => (
            <Badge key={s} href={`/c/subject/${encodeURIComponent(s)}`} tone="outline">{taxonomyLabel(lang, "subjects", s)}</Badge>
          ))}
        </div>
        {/* The actions, as a row of pills under the title: what you do with a saved thing. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {ref.canonicalUrl && (
            <a href={ref.canonicalUrl} target="_blank" rel="noreferrer" className="btn-filled h-11 px-4 text-[15px] lg:h-9 lg:text-[13px]">
              <ExternalLink className="h-4 w-4" /> {d.reference.original}
            </a>
          )}
          <SaveToggle id={ref.id} saved={ref.saved} />
          <CollectionPicker referenceId={ref.id} all={all.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, slug: c.slug }))} member={member} />
          <ProjectPicker referenceId={ref.id} projects={openProjects} member={inProjects} />
          <ReprocessButton id={ref.id} />
          <DeleteButton id={ref.id} />
        </div>
        {ref.status === "failed" && <p className="mt-4 rounded-2xl bg-danger/10 p-4 text-sm text-danger">{ref.error}</p>}
      </header>

      {understood && (
        <div className="grid gap-10 break-words md:grid-cols-[minmax(0,1fr)_280px] [&>*]:min-w-0">
          <div className="space-y-8">
            <Section title={d.reference.whatItIs}>{ai.whatItIs}</Section>
            {ai.links?.length ? (
              <Section title={d.reference.links}>
                <Links links={ai.links} />
              </Section>
            ) : null}
            <Section title={d.reference.whyInteresting}>{ai.whyInteresting}</Section>
            <Section title={d.reference.mechanism}>
              <p className="text-lg font-medium">{ai.creativeMechanism}</p>
              {ai.coreIdea && <p className="mt-2 text-ink-2">{ai.coreIdea}</p>}
            </Section>
            {ai.creativePrinciples?.length ? (
              <Section title={d.reference.principles}>
                <div className="flex flex-wrap gap-2">
                  {ai.creativePrinciples.map((p) => (
                    <Badge key={p} href={`/c/principle/${encodeURIComponent(p)}`} tone="accent">{taxonomyLabel(lang, "principles", p)}</Badge>
                  ))}
                </div>
              </Section>
            ) : null}
            {(ai.strategicAttributes?.length || ai.emotionalAttributes?.length) && (
              <div className="grid gap-6 sm:grid-cols-2">
                {ai.strategicAttributes?.length ? (
                  <Section title={d.reference.strategic}>
                    <ul className="space-y-1 text-sm text-ink-2">{ai.strategicAttributes.map((s) => <li key={s}>→ {s}</li>)}</ul>
                  </Section>
                ) : null}
                {ai.emotionalAttributes?.length ? (
                  <Section title={d.reference.emotional}>
                    <p className="text-sm text-ink-2">{ai.emotionalAttributes.join(" · ")}</p>
                  </Section>
                ) : null}
              </div>
            )}
            {v && (
              <Section title={ref.mediaType === "video" ? d.reference.videoUnderstanding : d.reference.visualAnalysis}>
                <p className="text-sm text-ink-2">{v.description}</p>
                <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                  {(
                    [
                      [d.reference.visual, [...(v.environment ?? []), ...(v.subjects ?? []), ...(v.colors ?? [])]],
                      [d.reference.composition, [...(v.composition ?? []), ...(v.motion ?? []), ...(v.typography ?? [])]],
                      [d.reference.audio, v.audio ?? []],
                      [d.reference.onScreenText, v.onScreenText ?? []],
                    ] as [string, string[]][]
                  )
                    .filter(([, items]) => items.length)
                    .map(([label, items]) => (
                      <div key={label}>
                        <dt className="eyebrow mb-1">{label}</dt>
                        <dd className="text-ink-2">{items.map((i) => `• ${i}`).join("  ")}</dd>
                      </div>
                    ))}
                </dl>
                {v.narrative?.length ? (
                  <ol className="mt-4 space-y-1 text-[13px] text-ink-2">
                    {v.narrative.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ol>
                ) : null}
              </Section>
            )}
            {ref.content.transcript && (
              <details className="rounded-[20px] bg-paper-2 p-4">
                <summary className="eyebrow cursor-pointer">{d.reference.transcript}</summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">{ref.content.transcript}</p>
              </details>
            )}
            {ref.content.pageText && ref.mediaType !== "text" && (
              <details className="rounded-[20px] bg-paper-2 p-4">
                <summary className="eyebrow cursor-pointer">{d.reference.extractedText}</summary>
                <p className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink">{ref.content.pageText.slice(0, 20000)}</p>
              </details>
            )}
            <AskReference id={ref.id} />
          </div>

          <aside className="space-y-8">
            <Section title={d.reference.tags}>
              <div className="flex flex-wrap gap-1.5">
                {ref.tags.map((tg) => (
                  <Badge key={tg} href={`/c/tag/${encodeURIComponent(tg)}`}>#{tg}</Badge>
                ))}
              </div>
            </Section>
            {ref.concepts.length > 0 && (
              <Section title={d.reference.concepts}>
                <p className="text-[13px] leading-relaxed text-ink">{ref.concepts.join(" · ")}</p>
              </Section>
            )}
            {ai.brands?.length || ai.people?.length ? (
              <Section title={d.reference.who}>
                <p className="text-[13px] text-ink-2">{[...(ai.brands ?? []), ...(ai.people ?? [])].join(" · ")}</p>
              </Section>
            ) : null}
            {byKind && (
              <Section title={d.reference.similarity}>
                <dl className="space-y-3 text-[13px]">
                  {SIMILARITY_KINDS.map((k) => (
                    <div key={k}>
                      <dt className="eyebrow mb-1">{d.reference.kinds[k]}</dt>
                      <dd className="space-y-0.5">
                        {byKind[k].length ? (
                          byKind[k].slice(0, 3).map((s) => (
                            <Link key={s.reference.id} href={`/r/${s.reference.id}`} className="block truncate text-ink-2 hover:text-ink">
                              <span className="font-mono text-[11px] text-ink-3">{Math.round(s.score * 100)}%</span> {s.reference.title}
                            </Link>
                          ))
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}
            {ref.userNote && (
              <Section title={d.reference.yourNote}>
                <p className="text-[13px] text-ink-2">{ref.userNote}</p>
              </Section>
            )}
            {warnings.length > 0 && (
              <Section title={d.reference.pipelineNotes}>
                <ul className="space-y-1 text-[12px] text-ink-3">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </Section>
            )}
            {ai.model && <p className="text-[11px] text-ink-3">{d.reference.understoodBy(ai.model, ai.generatedAt ? new Date(ai.generatedAt).toLocaleString(localeOf(lang)) : "")}</p>}
          </aside>
        </div>
      )}

      {understood && related.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">{d.reference.related}</h2>
          <ReferenceGrid references={related.map((r) => r.reference)} lang={lang} kindsById={kindsById} />
        </section>
      )}
      <LiveRefresh active={!understood && ref.status !== "failed"} />
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="eyebrow mb-2">{title}</h2>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * The sites the reference points at, said in the video, shown on its screens or written in its
 * caption, each opened and confirmed when the reference was understood (pipeline/links.ts). The
 * picture is the site's own OpenGraph image; without one, the website icon.
 */
function Links({ links }: { links: ReferenceLink[] }) {
  return (
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noreferrer" title={l.title ?? undefined} className="flex items-center gap-3 rounded-[18px] bg-paper-2 p-2.5 pr-3.5 transition-colors hover:bg-fill">
            {l.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.image} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-14 w-14 shrink-0 rounded-[12px] bg-fill object-cover" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[12px] bg-fill">
                <Thing name="website" className="h-9 w-9" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate text-[15px] font-semibold text-ink">{l.name}</span>
                {/* The host only when it adds something: "Skillry" then skillry.dev, not skillry.dev twice. */}
                {l.name.toLowerCase().replace(/^www\./, "") !== l.host && <span className="truncate text-[13px] text-ink-3">{l.host}</span>}
              </span>
              <span className="mt-0.5 line-clamp-2 text-[13px] leading-[18px] text-ink-2">{l.note}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
