import Link from "next/link";
import { listCollections } from "@/server/references";
import { NewCollection } from "@/components/collection-actions";
import { AutoCollections } from "@/components/auto-collections";
import { dict } from "@/server/lang";
import { Emoji } from "@/components/emoji";

export default async function CollectionsPage() {
  const { d } = await dict();
  const cols = await listCollections();
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="large-title">{d.collections.title}</h1>
          <p className="mt-1 text-sm text-ink-2">{d.collections.sub}</p>
        </div>
        <NewCollection />
      </header>
      {/* A grid of covers, like an app's library of lists. The cover is the newest saved picture in
          the collection; with none, its emoji stands in. */}
      {cols.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
          {cols.map((c) => (
            <Link key={c.id} href={`/collections/${c.slug}`} className="group block">
              <div className="relative aspect-square overflow-hidden rounded-[22px] bg-paper-2">
                {c.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <span className="grid h-full place-items-center text-[48px] leading-none">
                    <Emoji char={c.emoji || "📁"} />
                  </span>
                )}
                {c.cover && c.emoji ? (
                  <span className="material absolute left-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full text-[18px] leading-none">
                    <Emoji char={c.emoji} />
                  </span>
                ) : null}
              </div>
              <p className="mt-2 line-clamp-1 px-1 text-[15px] font-semibold leading-5">{c.name}</p>
              <p className="px-1 text-[13px] leading-[18px] text-ink-3">{d.category.references(c.count)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-[22px] bg-paper-2 px-5 py-10 text-center text-[15px] text-ink-2">{d.collections.empty}</p>
      )}
      <AutoCollections />
    </div>
  );
}
