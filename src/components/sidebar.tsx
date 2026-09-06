import Link from "next/link";
import { listCollections, statusCounts, facetCounts } from "@/server/references";
import { SUBJECTS } from "@/server/taxonomy";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function Sidebar() {
  const [counts, collections, subjects] = await Promise.all([
    safe(statusCounts, {} as Record<string, number>),
    safe(listCollections, []),
    safe(() => facetCounts("subjects", 40), []),
  ]);
  const inbox = (counts.queued ?? 0) + (counts.processing ?? 0) + (counts.failed ?? 0);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const subjectCount = new Map(subjects.map((s) => [s.value, s.count]));
  const orderedSubjects = [...SUBJECTS].filter((s) => subjectCount.has(s)).sort((a, b) => (subjectCount.get(b) ?? 0) - (subjectCount.get(a) ?? 0));

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-r border-line px-4 py-6 text-[13px] lg:block">
      <nav className="space-y-0.5">
        <NavLink href="/" label="All" count={total} />
        <NavLink href="/inbox" label="Inbox" count={inbox} accent={inbox > 0} />
        <NavLink href="/saved" label="Saved" />
        <NavLink href="/discover" label="Discover" />
      </nav>

      <div className="mt-8">
        <span className="eyebrow mb-2 block px-2">Brain</span>
        <nav className="space-y-0.5">
          <NavLink href="/think" label="Think" />
          <NavLink href="/assist" label="Creative assistant" />
          <NavLink href="/moodboards" label="Moodboards" />
          <NavLink href="/projects" label="Projects" />
          <NavLink href="/graph" label="Knowledge graph" />
          <NavLink href="/patterns" label="My patterns" />
        </nav>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="eyebrow">Collections</span>
          <Link href="/collections" className="text-[11px] text-ink-3 hover:text-ink">
            all
          </Link>
        </div>
        <nav className="space-y-0.5">
          {collections.slice(0, 12).map((c, i) => (
            <NavLink key={c.id} href={`/collections/${c.slug}`} label={`${c.emoji ? `${c.emoji} ` : ""}${c.name}`} count={c.count} index={i + 1} />
          ))}
          {!collections.length && <p className="px-2 text-ink-3">No collections yet.</p>}
        </nav>
      </div>

      <div className="mt-8">
        <span className="eyebrow mb-2 block px-2">Capture</span>
        <nav className="space-y-0.5">
          <NavLink href="/share/setup" label="Share from your phone" />
        </nav>
      </div>

      <div className="mt-8">
        <span className="eyebrow mb-2 block px-2">Categories</span>
        <nav className="space-y-0.5">
          {orderedSubjects.map((s) => (
            <NavLink key={s} href={`/c/subject/${encodeURIComponent(s)}`} label={s} count={subjectCount.get(s)} />
          ))}
          {!orderedSubjects.length && <p className="px-2 text-ink-3">Categories appear as references are understood.</p>}
        </nav>
      </div>
    </aside>
  );
}

function NavLink({ href, label, count, accent, index }: { href: string; label: string; count?: number; accent?: boolean; index?: number }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">
      <span className="flex items-center gap-2 truncate">
        {index !== undefined && <span className="w-5 font-mono text-[11px] text-ink-3">{String(index).padStart(2, "0")}</span>}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && count > 0 && <span className={accent ? "text-accent" : "text-ink-3"}>{count}</span>}
    </Link>
  );
}
