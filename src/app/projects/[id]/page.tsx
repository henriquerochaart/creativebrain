import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projectReferenceList, selectionSentence, selectionStats, type StoredAnalysis } from "@/server/projects";
import { Thumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { AnalyzeProject, CopyOutput, DeleteProject, ProjectBrief, ProjectPickerInline, ProjectsLink, RemoveFromProject } from "@/components/project-actions";

const STAGES = ["References", "Concepts", "Patterns", "Directions", "Ideas", "Output"];

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const refs = await projectReferenceList(project.id);
  const stats = selectionStats(refs);
  const stored = project.analyzedAt ? (project.analysis as unknown as StoredAnalysis) : null;
  const a = stored?.analysis;
  const title = (rid: string) => refs.find((r) => r.id === rid)?.title ?? null;
  const stageDone = [refs.length > 0, Boolean(a?.concepts.length), Boolean(a?.patterns.length), Boolean(a?.directions.length), Boolean(a?.ideas.length), Boolean(a)];

  return (
    <article className="mx-auto max-w-6xl space-y-10">
      <div className="flex items-center justify-between">
        <ProjectsLink />
        <div className="flex items-center gap-3">
          <CopyOutput id={project.id} />
          <DeleteProject id={project.id} />
        </div>
      </div>

      <header className="grid gap-6 md:grid-cols-[1fr_auto]">
        <ProjectBrief id={project.id} name={project.name} brief={project.brief} />
        <AnalyzeProject id={project.id} analyzed={Boolean(stored)} count={refs.length} />
      </header>

      <ol className="flex flex-wrap items-center gap-2 text-[12px]">
        {STAGES.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 ${stageDone[i] ? "bg-ink text-paper" : "border border-line text-ink-3"}`}>{s}</span>
            {i < STAGES.length - 1 && <span className="text-ink-3">↓</span>}
          </li>
        ))}
      </ol>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="eyebrow">References · {refs.length}</h2>
          <p className="text-[13px] text-ink-2">{selectionSentence(stats)}</p>
        </div>
        {stats.principles.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {stats.principles.slice(0, 8).map((p) => (
              <Badge key={p.value} tone="accent">
                {p.value} · {p.count}
              </Badge>
            ))}
            {stats.subjects.slice(0, 4).map((s) => (
              <Badge key={s.value} tone="outline">
                {s.value} · {s.count}
              </Badge>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {refs.map((r) => (
            <div key={r.id} className="group relative">
              <Link href={`/r/${r.id}`}>
                <div className="overflow-hidden rounded-2xl border border-line bg-paper-2">
                  <Thumb reference={r} className="aspect-[4/3] object-cover" />
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-snug">{r.title}</p>
              </Link>
              <RemoveFromProject projectId={project.id} referenceId={r.id} />
            </div>
          ))}
        </div>
        <div className="mt-5">
          <ProjectPickerInline projectId={project.id} memberIds={refs.map((r) => r.id)} />
        </div>
      </section>

      {a && (
        <>
          <section className="rounded-3xl bg-paper-2 p-6">
            <p className="text-xl font-medium tracking-tight">{a.summary}</p>
            <p className="mt-3 text-[15px] text-ink-2">{a.combinationQuestion}</p>
          </section>

          <Stage n="02" title="Concepts">
            <div className="flex flex-wrap gap-2">
              {a.concepts.map((c) => (
                <span key={c.name} className="rounded-full border border-line px-3 py-1 text-sm" title={c.referenceIds.map(title).filter(Boolean).join(", ")}>
                  {c.name} <span className="text-ink-3">{c.referenceIds.length}</span>
                </span>
              ))}
            </div>
          </Stage>

          <Stage n="03" title="Patterns">
            <ul className="space-y-2 text-[15px]">
              {a.patterns.map((p) => (
                <li key={p.statement}>
                  → {p.statement} <span className="text-[12px] text-ink-3">{p.referenceIds.map(title).filter(Boolean).slice(0, 3).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </Stage>

          <Stage n="04" title="Directions">
            <div className="grid gap-5 md:grid-cols-2">
              {a.directions.map((d) => (
                <div key={d.title} className="rounded-2xl border border-line p-5">
                  <h3 className="text-lg font-semibold tracking-tight">{d.title}</h3>
                  <p className="mt-1 text-sm text-ink-2">{d.rationale}</p>
                  <p className="mt-3 font-mono text-[12px] text-ink-3">{d.mechanism}</p>
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {d.referenceIds.map((rid) => refs.find((r) => r.id === rid)).filter(Boolean).map((r) => (
                      <Link key={r!.id} href={`/r/${r!.id}`} className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-2" title={r!.title ?? ""}>
                        <Thumb reference={r!} className="h-full w-full object-cover" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Stage>

          <Stage n="05" title="Ideas">
            <ol className="space-y-5">
              {a.ideas.map((i, idx) => (
                <li key={i.title} className="grid gap-3 md:grid-cols-[48px_1fr]">
                  <span className="font-mono text-sm text-ink-3">{String(idx + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">{i.title}</h3>
                    <p className="text-[12px] text-ink-3">
                      {i.direction} · {i.mechanism}
                    </p>
                    <p className="mt-2 text-[15px] leading-relaxed">{i.description}</p>
                    <p className="mt-1 text-[12px] text-ink-3">{i.referenceIds.map(title).filter(Boolean).join(" · ")}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Stage>

          <Stage n="06" title="Output">
            <p className="text-sm text-ink-2">The whole process as a document, ready for a deck or a doc.</p>
            <div className="mt-3">
              <CopyOutput id={project.id} />
            </div>
            <p className="mt-3 text-[11px] text-ink-3">Analysed by {stored.model} · {project.analyzedAt?.toLocaleString()}</p>
          </Stage>
        </>
      )}
    </article>
  );
}

function Stage({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-sm text-ink-3">{n}</span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
