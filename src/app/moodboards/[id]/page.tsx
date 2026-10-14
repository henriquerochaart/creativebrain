import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getBoard } from "@/server/creative";
import { isUuid } from "@/server/references";
import { Thumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { DeleteBoard } from "@/components/board-actions";
import { dict } from "@/server/lang";

export default async function MoodboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { lang, d } = await dict();
  const { id } = await params;
  const data = isUuid(id) ? await getBoard(id) : null;
  if (!data) notFound();
  const { board, analysis, references } = data;
  return (
    <article className="mx-auto max-w-6xl space-y-10">
      <div className="flex items-center justify-between">
        <Link href="/moodboards" className="-ml-1.5 inline-flex min-h-11 items-center gap-0.5 text-[17px] text-accent hover:opacity-70 lg:min-h-0">
          <ChevronLeft className="h-6 w-6" strokeWidth={2.25} /> {d.nav.moodboards}
        </Link>
        <DeleteBoard id={board.id} />
      </div>
      <header className="max-w-3xl">
        <p className="eyebrow">{d.moodboards.one} · {board.brief}</p>
        <h1 className="large-title mt-2">{analysis.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">{analysis.concept}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.tone.map((t) => (
            <Badge key={t} tone="accent">{t}</Badge>
          ))}
          {analysis.palette.map((p) => (
            <Badge key={p} tone="outline">{p}</Badge>
          ))}
        </div>
      </header>
      {analysis.directions.map((dir, i) => (
        <section key={dir.title}>
          <div className="mb-4 flex items-baseline gap-4">
            <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="title-2">{dir.title}</h2>
              <p className="text-sm text-ink-2">{dir.rationale}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {dir.referenceIds.map((rid) => references[rid]).filter(Boolean).map((r) => (
              <Link key={r.id} href={`/r/${r.id}`} className="group">
                <div className="overflow-hidden rounded-[16px] bg-paper-2">
                  <Thumb reference={r} lang={lang} className="aspect-[4/5] object-cover transition-transform group-hover:scale-[1.02]" />
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-snug">{r.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {analysis.missing.length > 0 && (
        <section className="rounded-3xl border border-dashed border-line p-6">
          <h2 className="eyebrow mb-2">{d.moodboards.lacks}</h2>
          <ul className="space-y-1 text-sm text-ink-2">{analysis.missing.map((m) => <li key={m}>→ {m}</li>)}</ul>
        </section>
      )}
    </article>
  );
}
