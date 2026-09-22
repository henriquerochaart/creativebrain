import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { collectionsOfReference, getReference, listCollections, relatedReferences, similarReferences, toPublic } from "@/server/references";
import { getStorage } from "@/server/storage";
import { Thumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { ReferenceGrid } from "@/components/reference-grid";
import { AskReference } from "@/components/ask-reference";
import { LiveRefresh } from "@/components/live-refresh";
import { CollectionPicker, DeleteButton, ReprocessButton, SaveToggle } from "@/components/reference-actions";
import { formatDuration, localeOf, yearOf } from "@/lib/utils";
import { SIMILARITY_KINDS } from "@/server/taxonomy";
import { recordEvent } from "@/server/insights";
import { projectsOfReference, recentProjectsList } from "@/server/projects";
import { ProjectPicker } from "@/components/project-picker";
import { dict } from "@/server/lang";
import { UnderstandingProgress } from "@/components/understanding-progress";
import { platformLabel, taxonomyLabel } from "@/lib/i18n";

export default async function ReferencePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { lang, d } = await dict();
  const { id } = await params;
  const sp = await searchParams;
  const ref = await getReference(id);
  if (!ref) notFound();
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
      {sp.shared && <p className="rounded-full bg-ink px-4 py-2 text-center text-[13px] text-paper">{d.reference.sharedBanner}</p>}
      {sp.dup && <p className="rounded-full bg-paper-2 px-4 py-2 text-center text-[13px] text-ink-2">{d.reference.dupBanner}</p>}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {d.reference.back}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {ref.canonicalUrl && (
            <a href={ref.canonicalUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:bg-paper-2">
              <ExternalLink className="h-3.5 w-3.5" /> {d.reference.original}
            </a>
          )}
          <SaveToggle id={ref.id} saved={ref.saved} />
          <CollectionPicker referenceId={ref.id} all={all.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, slug: c.slug }))} member={member} />
          <ProjectPicker referenceId={ref.id} projects={openProjects} member={inProjects} />
          <ReprocessButton id={ref.id} />
          <DeleteButton id={ref.id} />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-paper-2">
        {videoHref ? (
          <a href={videoHref} target="_blank" rel="noreferrer" aria-label={d.reference.openVideo} className="group relative block">
            <Thumb reference={pub} lang={lang} className="max-h-[70vh] object-contain" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform duration-300 group-hover:scale-110">
                <Play className="ml-1 h-6 w-6 fill-current" />
              </span>
            </span>
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[12px] text-white backdrop-blur">
              <ExternalLink className="h-3 w-3" /> {d.reference.openVideo}
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{ref.title ?? d.card.untitled}</h1>
          {ref.status === "failed" && <StatusDot status={ref.status} lang={lang} />}
        </div>
        <p className="mt-2 text-sm text-ink-2">
          {[
            platformLabel(lang, ref.sourcePlatform),
            ref.metadata.author ? `${ref.metadata.author}` : null,
            ref.metadata.durationSeconds ? formatDuration(ref.metadata.durationSeconds) : null,
            ref.metadata.pageCount ? `${ref.metadata.pageCount} p.` : null,
            yearOf(ref.metadata.publishedAt ?? ref.createdAt),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {(ref.status === "queued" || ref.status === "processing") && (
          <UnderstandingProgress step={ref.processingStep} className="mt-4 max-w-md rounded-2xl border border-line bg-paper-2 p-4" />
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
        {ref.status === "failed" && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{ref.error}</p>}
      </header>

      {understood && (
        <div className="grid gap-10 md:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <Section title={d.reference.whatItIs}>{ai.whatItIs}</Section>
            <Section title={d.reference.whyInteresting}>{ai.whyInteresting}</Section>
            <Section title={d.reference.mechanism}>
              <p className="text-lg font-medium tracking-tight">{ai.creativeMechanism}</p>
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
              <details className="rounded-2xl border border-line p-4">
                <summary className="eyebrow cursor-pointer">{d.reference.transcript}</summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{ref.content.transcript}</p>
              </details>
            )}
            {ref.content.pageText && ref.mediaType !== "text" && (
              <details className="rounded-2xl border border-line p-4">
                <summary className="eyebrow cursor-pointer">{d.reference.extractedText}</summary>
                <p className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{ref.content.pageText.slice(0, 20000)}</p>
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
                <p className="text-[13px] leading-relaxed text-ink-2">{ref.concepts.join(" · ")}</p>
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
