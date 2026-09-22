import Link from "next/link";
import { discover } from "@/server/insights";
import { ReferenceGrid } from "@/components/reference-grid";
import { Thumb } from "@/components/thumb";
import { dict } from "@/server/lang";
import { taxonomyLabel } from "@/lib/i18n";

/** "Show me something I haven't thought of, but that fits what I like." */
export default async function DiscoverPage() {
  const { lang, d } = await dict();
  const data = await discover(12).catch(() => null);
  const list = (values: string[], kind: "principles" | "subjects") => values.slice(0, 2).map((v) => taxonomyLabel(lang, kind, v)).join(kind === "principles" ? " + " : " / ");
  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow">{d.discover.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{d.discover.title}</h1>
        {data ? (
          <p className="mt-1 text-sm text-ink-2">
            {d.discover.sub(data.signals)}
            {data.favourites.principles.length ? d.discover.gravitate(data.favourites.principles.map((p) => taxonomyLabel(lang, "principles", p)).join(", ").toLowerCase()) : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-2">{d.discover.subEmpty}</p>
        )}
      </header>

      {data && data.unexpected.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">{d.discover.unexpected}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.unexpected.map((u) => (
              <Link key={u.reference.id} href={`/r/${u.reference.id}`} className="group overflow-hidden rounded-2xl border border-line">
                <div className="overflow-hidden bg-paper-2">
                  <Thumb reference={u.reference} lang={lang} className="aspect-[4/3] object-cover transition-transform group-hover:scale-[1.02]" />
                </div>
                <div className="p-4">
                  <p className="text-[15px] font-semibold leading-snug tracking-tight">{u.reference.title}</p>
                  <p className="mt-1 text-[13px] text-ink-2">
                    {u.newPrinciples.length
                      ? d.discover.because.brings(list(u.newPrinciples, "principles").toLowerCase())
                      : u.newSubjects.length
                        ? d.discover.because.sameTaste(list(u.newSubjects, "subjects"))
                        : d.discover.because.other}
                  </p>
                  <p className="mt-2 text-[11px] text-ink-3">
                    {d.discover.closeness(Math.round(u.score * 100))} · {u.reference.principles.map((p) => taxonomyLabel(lang, "principles", p)).join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data && (
        <section>
          <h2 className="eyebrow mb-4">{d.discover.forYou}</h2>
          <ReferenceGrid references={data.forYou.map((f) => f.reference)} lang={lang} empty={d.discover.emptyForYou} />
        </section>
      )}
    </div>
  );
}
