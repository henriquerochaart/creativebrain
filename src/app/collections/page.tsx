import Link from "next/link";
import { listCollections, listReferences, toPublic } from "@/server/references";
import type { Dict } from "@/lib/i18n";
import { NewCollection } from "@/components/collection-actions";
import { AutoCollections } from "@/components/auto-collections";
import { dict } from "@/server/lang";
import { Emoji } from "@/components/emoji";
import { Thing } from "@/components/thing";

export default async function CollectionsPage() {
  const { d } = await dict();
  const [cols, saved] = await Promise.all([listCollections(), listReferences({ saved: true, limit: 200 }).then((rows) => rows.map(toPublic))]);
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="large-title">{d.collections.title}</h1>
        </div>
        <NewCollection />
      </header>
      {/* A grid of covers, like an app's library of lists. Saved comes first: it is a collection
          the Save button fills. A cover is the newest picture in the collection; with none, its
          emoji or icon stands in. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
        <Cover href="/saved" name={d.saved.title} count={saved.length} cover={saved.find((r) => r.thumbnailUrl)?.thumbnailUrl ?? null} badge={<Thing name="bookmark" className="h-6 w-6" />} fallback={<Thing name="bookmark" className="h-20 w-20" />} d={d} />
        {cols.map((c) => (
          <Cover
            key={c.id}
            href={`/collections/${c.slug}`}
            name={c.name}
            count={c.count}
            cover={c.cover}
            badge={c.emoji ? <Emoji char={c.emoji} /> : null}
            fallback={c.emoji ? <Emoji char={c.emoji} /> : <Thing name="folder" className="h-20 w-20" />}
            d={d}
          />
        ))}
      </div>
      <AutoCollections />
    </div>
  );
}

function Cover({ href, name, count, cover, badge, fallback, d }: { href: string; name: string; count: number; cover: string | null; badge: React.ReactNode; fallback: React.ReactNode; d: Dict }) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[22px] bg-paper-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <span className="grid h-full place-items-center text-[48px] leading-none">{fallback}</span>
        )}
        {cover && badge ? <span className="material absolute left-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full text-[18px] leading-none">{badge}</span> : null}
      </div>
      <p className="mt-2 line-clamp-1 px-1 text-[15px] font-semibold leading-5">{name}</p>
      <p className="px-1 text-[13px] leading-[18px] text-ink-3">{d.category.references(count)}</p>
    </Link>
  );
}
