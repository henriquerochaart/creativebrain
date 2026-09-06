import Link from "next/link";
import { discover } from "@/server/insights";
import { ReferenceGrid } from "@/components/reference-grid";
import { Thumb } from "@/components/thumb";

/** "Henrique, me mostre algo que eu ainda não pensei, mas que combina com o que eu gosto." */
export default async function DiscoverPage() {
  const d = await discover(12).catch(() => null);
  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow">Discover · personal taste</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Something you haven’t thought of, but that fits what you like</h1>
        {d ? (
          <p className="mt-1 text-sm text-ink-2">
            Taste learned from {d.signals} reference{d.signals === 1 ? "" : "s"} you starred, collected, asked about, put in projects or opened.
            {d.favourites.principles.length ? ` You gravitate to ${d.favourites.principles.join(", ").toLowerCase()}.` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-2">The Brain learns your taste from what you star, collect, ask about and open. Start there.</p>
        )}
      </header>

      {d && d.unexpected.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">Unexpected · same taste, different angle</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {d.unexpected.map((u) => (
              <Link key={u.reference.id} href={`/r/${u.reference.id}`} className="group overflow-hidden rounded-2xl border border-line">
                <div className="overflow-hidden bg-paper-2">
                  <Thumb reference={u.reference} className="aspect-[4/3] object-cover transition-transform group-hover:scale-[1.02]" />
                </div>
                <div className="p-4">
                  <p className="text-[15px] font-semibold leading-snug tracking-tight">{u.reference.title}</p>
                  <p className="mt-1 text-[13px] text-ink-2">{u.because}</p>
                  <p className="mt-2 text-[11px] text-ink-3">{Math.round(u.score * 100)}% close to your taste · {u.reference.principles.join(" · ")}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {d && (
        <section>
          <h2 className="eyebrow mb-4">For you · closest to your taste, not yet touched</h2>
          <ReferenceGrid references={d.forYou.map((f) => f.reference)} empty="Everything close to your taste has already been touched. Save more." />
        </section>
      )}
    </div>
  );
}
