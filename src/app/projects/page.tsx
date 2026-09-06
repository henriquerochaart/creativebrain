import Link from "next/link";
import { listProjects } from "@/server/projects";
import { NewProject } from "@/components/project-actions";
import { timeAgo } from "@/lib/utils";

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Projects</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your creative process, as an object</h1>
          <p className="mt-1 text-sm text-ink-2">References → Concepts → Patterns → Directions → Ideas → Output.</p>
        </div>
        <NewProject />
      </header>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`} className="block overflow-hidden rounded-2xl border border-line hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <div className="grid h-32 grid-cols-4 gap-px bg-paper-2">
                {p.covers.slice(0, 4).map((c, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={c} alt="" className="h-full w-full object-cover" />
                ))}
              </div>
              <div className="p-4">
                <p className="text-lg font-medium tracking-tight">{p.name}</p>
                {p.brief && <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{p.brief}</p>}
                <p className="mt-3 text-[12px] text-ink-3">
                  {p.count} reference{p.count === 1 ? "" : "s"} · {p.analyzed_at ? "analysed" : "not analysed"} · {timeAgo(p.updated_at)}
                </p>
              </div>
            </Link>
          </li>
        ))}
        {!projects.length && <li className="col-span-full rounded-2xl border border-dashed border-line p-12 text-center text-sm text-ink-3">Open a project and start dragging references into it.</li>}
      </ul>
    </div>
  );
}
