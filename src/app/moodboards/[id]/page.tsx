import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBoard } from "@/server/creative";
import { isUuid } from "@/server/references";
import { Thumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { DeleteBoard } from "@/components/board-actions";

export default async function MoodboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = isUuid(id) ? await getBoard(id) : null;
  if (!data) notFound();
  const { board, analysis, references } = data;
  return (
    <article className="mx-auto max-w-6xl space-y-10">
      <div className="flex items-center justify-between">
        <Link href="/moodboards" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Moodboards
        </Link>
        <DeleteBoard id={board.id} />
      </div>
      <header className="max-w-3xl">
        <p className="eyebrow">Moodboard · {board.brief}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{analysis.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{analysis.concept}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.tone.map((t) => (
            <Badge key={t} tone="accent">{t}</Badge>
          ))}
          {analysis.palette.map((p) => (
            <Badge key={p} tone="outline">{p}</Badge>
          ))}
        </div>
      </header>
      {analysis.directions.map((d, i) => (
        <section key={d.title}>
          <div className="mb-4 flex items-baseline gap-4">
            <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{d.title}</h2>
              <p className="text-sm text-ink-2">{d.rationale}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {d.referenceIds.map((rid) => references[rid]).filter(Boolean).map((r) => (
              <Link key={r.id} href={`/r/${r.id}`} className="group">
                <div className="overflow-hidden rounded-2xl border border-line bg-paper-2">
                  <Thumb reference={r} className="aspect-[4/5] object-cover transition-transform group-hover:scale-[1.02]" />
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-snug">{r.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {analysis.missing.length > 0 && (
        <section className="rounded-3xl border border-dashed border-line p-6">
          <h2 className="eyebrow mb-2">What this board lacks</h2>
          <ul className="space-y-1 text-sm text-ink-2">{analysis.missing.map((m) => <li key={m}>→ {m}</li>)}</ul>
        </section>
      )}
    </article>
  );
}
