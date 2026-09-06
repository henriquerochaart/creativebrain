import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { collectionsOfReference, getReference, listCollections, relatedReferences, similarReferences, toPublic } from "@/server/references";
import { getStorage } from "@/server/storage";
import { Thumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { ReferenceGrid } from "@/components/reference-grid";
import { AskReference } from "@/components/ask-reference";
import { LiveRefresh } from "@/components/live-refresh";
import { CollectionPicker, DeleteButton, ReprocessButton, SaveToggle } from "@/components/reference-actions";
import { formatDuration, platformLabel, yearOf } from "@/lib/utils";
import { SIMILARITY_KINDS } from "@/server/taxonomy";
import { recordEvent } from "@/server/insights";
import { projectsOfReference, recentProjectsList } from "@/server/projects";
import { ProjectPicker } from "@/components/project-picker";

export default async function ReferencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const isVideoFile = mediaUrl && ref.mediaMime?.startsWith("video/");
  const isPdf = mediaUrl && ref.mediaMime === "application/pdf";
  const ai = ref.ai;
  const v = ref.content.visualAnalysis;
  const warnings = (ref.metadata as { warnings?: string[] }).warnings ?? [];
  const kindsById: Record<string, string[]> = Object.fromEntries(related.map((r) => [r.reference.id, r.kinds]));

  return (
    <article className="mx-auto max-w-5xl space-y-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {ref.canonicalUrl && (
            <a href={ref.canonicalUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:bg-paper-2">
              <ExternalLink className="h-3.5 w-3.5" /> Original
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
        {isVideoFile ? (
          <video src={mediaUrl!} controls playsInline poster={ref.thumbnailUrl ?? undefined} className="max-h-[70vh] w-full bg-black" />
        ) : isPdf ? (
          <iframe src={mediaUrl!} title={ref.title ?? "PDF"} className="h-[70vh] w-full" />
        ) : ref.mediaType === "text" && !ref.thumbnailUrl ? (
          <pre className="whitespace-pre-wrap p-8 font-sans text-base leading-relaxed">{ref.content.pageText}</pre>
        ) : (
          <Thumb reference={pub} className="max-h-[70vh] object-contain" />
        )}
      </div>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{ref.title ?? "Untitled"}</h1>
          {!understood && <StatusDot status={ref.status} step={ref.processingStep} />}
        </div>
        <p className="mt-2 text-sm text-ink-2">
          {[
            platformLabel(ref.sourcePlatform),
            ref.mediaType,
            ref.metadata.author ? `by ${ref.metadata.author}` : null,
            ref.metadata.durationSeconds ? formatDuration(ref.metadata.durationSeconds) : null,
            ref.metadata.pageCount ? `${ref.metadata.pageCount} pages` : null,
            yearOf(ref.metadata.publishedAt ?? ref.createdAt),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ref.brand && <Badge href={`/c/brand/${encodeURIComponent(ref.brand)}`} tone="accent">{ref.brand}</Badge>}
          {ref.formats.map((f) => (
            <Badge key={f} href={`/c/format/${encodeURIComponent(f)}`}>{f}</Badge>
          ))}
          {ref.subjects.map((s) => (
            <Badge key={s} href={`/c/subject/${encodeURIComponent(s)}`} tone="outline">{s}</Badge>
          ))}
        </div>
        {ref.status === "failed" && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{ref.error}</p>}
      </header>

      {understood && (
        <div className="grid gap-10 md:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <Section title="What it is">{ai.whatItIs}</Section>
            <Section title="Why it's interesting">{ai.whyInteresting}</Section>
            <Section title="Creative mechanism">
              <p className="text-lg font-medium tracking-tight">{ai.creativeMechanism}</p>
              {ai.coreIdea && <p className="mt-2 text-ink-2">{ai.coreIdea}</p>}
            </Section>
            {ai.creativePrinciples?.length ? (
              <Section title="Creative principles">
                <div className="flex flex-wrap gap-2">
                  {ai.creativePrinciples.map((p) => (
                    <Badge key={p} href={`/c/principle/${encodeURIComponent(p)}`} tone="accent">{p}</Badge>
                  ))}
                </div>
              </Section>
            ) : null}
            {(ai.strategicAttributes?.length || ai.emotionalAttributes?.length) && (
              <div className="grid gap-6 sm:grid-cols-2">
                {ai.strategicAttributes?.length ? (
                  <Section title="Strategic">
                    <ul className="space-y-1 text-sm text-ink-2">{ai.strategicAttributes.map((s) => <li key={s}>→ {s}</li>)}</ul>
                  </Section>
                ) : null}
                {ai.emotionalAttributes?.length ? (
                  <Section title="Emotional">
                    <p className="text-sm text-ink-2">{ai.emotionalAttributes.join(" · ")}</p>
                  </Section>
                ) : null}
              </div>
            )}
            {v && (
              <Section title={ref.mediaType === "video" ? "Video understanding" : "Visual analysis"}>
                <p className="text-sm text-ink-2">{v.description}</p>
                <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                  {(
                    [
                      ["Visual", [...(v.environment ?? []), ...(v.subjects ?? []), ...(v.colors ?? [])]],
                      ["Composition", [...(v.composition ?? []), ...(v.motion ?? []), ...(v.typography ?? [])]],
                      ["Audio", v.audio ?? []],
                      ["Text", v.onScreenText ?? []],
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
                <summary className="eyebrow cursor-pointer">Transcript</summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{ref.content.transcript}</p>
              </details>
            )}
            {ref.content.pageText && ref.mediaType !== "text" && (
              <details className="rounded-2xl border border-line p-4">
                <summary className="eyebrow cursor-pointer">Extracted text</summary>
                <p className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{ref.content.pageText.slice(0, 20000)}</p>
              </details>
            )}
            <AskReference id={ref.id} />
          </div>

          <aside className="space-y-8">
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {ref.tags.map((t) => (
                  <Badge key={t} href={`/c/tag/${encodeURIComponent(t)}`}>#{t}</Badge>
                ))}
              </div>
            </Section>
            {ref.concepts.length > 0 && (
              <Section title="Concepts">
                <p className="text-[13px] leading-relaxed text-ink-2">{ref.concepts.join(" · ")}</p>
              </Section>
            )}
            {ai.brands?.length || ai.people?.length ? (
              <Section title="Who">
                <p className="text-[13px] text-ink-2">{[...(ai.brands ?? []), ...(ai.people ?? [])].join(" · ")}</p>
              </Section>
            ) : null}
            {byKind && (
              <Section title="Similarity">
                <dl className="space-y-3 text-[13px]">
                  {SIMILARITY_KINDS.map((k) => (
                    <div key={k}>
                      <dt className="eyebrow mb-1">{k}</dt>
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
              <Section title="Your note">
                <p className="text-[13px] text-ink-2">{ref.userNote}</p>
              </Section>
            )}
            {warnings.length > 0 && (
              <Section title="Pipeline notes">
                <ul className="space-y-1 text-[12px] text-ink-3">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </Section>
            )}
            <p className="text-[11px] text-ink-3">Understood by {ai.model} · {ai.generatedAt ? new Date(ai.generatedAt).toLocaleString() : ""}</p>
          </aside>
        </div>
      )}

      {understood && related.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">Related</h2>
          <ReferenceGrid references={related.map((r) => r.reference)} kindsById={kindsById} />
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
