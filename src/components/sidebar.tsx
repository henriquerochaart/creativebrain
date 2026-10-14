import Link from "next/link";
import { Bookmark, Compass, Folder, FolderKanban, Hash, Inbox, LayoutDashboard, LayoutGrid, LineChart, Network, Smartphone, Sparkles, WandSparkles } from "lucide-react";
import { NavLink } from "./nav-link";
import { listCollections, statusCounts, facetCounts } from "@/server/references";
import { SUBJECTS } from "@/server/taxonomy";
import { dict } from "@/server/lang";
import { taxonomyLabel } from "@/lib/i18n";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function Sidebar() {
  const { lang, d } = await dict();
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
    // Position, width and mobile/desktop visibility all live on SidebarDrawer, the wrapper this
    // renders inside of. Kept here would double up with — and on the drawer's translated panel,
    // fight — the classes that make the off-canvas version work.
    <aside className="px-3 py-5 pt-14 lg:pt-5">
      <nav className="space-y-0.5">
        <NavLink href="/" label={d.nav.all} count={total} icon={<LayoutGrid />} />
        <NavLink href="/inbox" label={d.nav.inbox} count={inbox} accent={inbox > 0} icon={<Inbox />} />
        <NavLink href="/saved" label={d.nav.saved} icon={<Bookmark />} />
        <NavLink href="/discover" label={d.nav.discover} icon={<Compass />} />
      </nav>

      <div className="mt-6">
        <span className="eyebrow mb-1 block px-2.5">{d.nav.brain}</span>
        <nav className="space-y-0.5">
          <NavLink href="/think" label={d.nav.think} icon={<Sparkles />} />
          <NavLink href="/assist" label={d.nav.assistant} icon={<WandSparkles />} />
          <NavLink href="/moodboards" label={d.nav.moodboards} icon={<LayoutDashboard />} />
          <NavLink href="/projects" label={d.nav.projects} icon={<FolderKanban />} />
          <NavLink href="/graph" label={d.nav.graph} icon={<Network />} />
          <NavLink href="/patterns" label={d.nav.patterns} icon={<LineChart />} />
        </nav>
      </div>

      <div className="mt-6">
        <div className="mb-1 flex items-center justify-between px-2.5">
          <span className="eyebrow">{d.nav.collections}</span>
          <Link href="/collections" className="text-[13px] text-accent hover:opacity-80">
            {d.nav.seeAll}
          </Link>
        </div>
        <nav className="space-y-0.5">
          {collections.slice(0, 12).map((c) => (
            <NavLink key={c.id} href={`/collections/${c.slug}`} label={c.name} count={c.count} icon={c.emoji ? <span className="text-[15px] leading-none">{c.emoji}</span> : <Folder />} />
          ))}
          {!collections.length && <p className="px-2.5 py-1 text-[13px] text-ink-3">{d.nav.noCollections}</p>}
        </nav>
      </div>

      <div className="mt-6">
        <span className="eyebrow mb-1 block px-2.5">{d.nav.capture}</span>
        <nav className="space-y-0.5">
          <NavLink href="/share/setup" label={d.nav.shareFromPhone} icon={<Smartphone />} />
        </nav>
      </div>

      <div className="mt-6">
        <span className="eyebrow mb-1 block px-2.5">{d.nav.categories}</span>
        <nav className="space-y-0.5">
          {orderedSubjects.map((s) => (
            <NavLink key={s} href={`/c/subject/${encodeURIComponent(s)}`} label={taxonomyLabel(lang, "subjects", s)} count={subjectCount.get(s)} icon={<Hash />} />
          ))}
          {!orderedSubjects.length && <p className="px-2.5 py-1 text-[13px] text-ink-3">{d.nav.categoriesAppear}</p>}
        </nav>
      </div>
    </aside>
  );
}

