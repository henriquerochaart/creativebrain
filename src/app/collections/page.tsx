import Link from "next/link";
import { listCollections } from "@/server/references";
import { NewCollection } from "@/components/collection-actions";

export default async function CollectionsPage() {
  const cols = await listCollections();
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My collections</h1>
          <p className="mt-1 text-sm text-ink-2">Manual shelves. A reference can live in many at once.</p>
        </div>
        <NewCollection />
      </header>
      <ol className="divide-y divide-line rounded-3xl border border-line">
        {cols.map((c, i) => (
          <li key={c.id}>
            <Link href={`/collections/${c.slug}`} className="flex items-center gap-5 px-5 py-4 hover:bg-paper-2">
              <span className="w-8 font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-2">
                {c.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover} alt="" className="h-full w-full object-cover" />
                ) : null}
              </span>
              <span className="flex-1 text-lg font-medium tracking-tight">
                {c.emoji ? `${c.emoji} ` : ""}
                {c.name}
              </span>
              <span className="text-sm text-ink-3">{c.count}</span>
            </Link>
          </li>
        ))}
        {!cols.length && <li className="px-5 py-10 text-center text-sm text-ink-3">No collections yet. Create one above, or from any reference page.</li>}
      </ol>
    </div>
  );
}
