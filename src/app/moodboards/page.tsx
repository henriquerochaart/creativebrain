import Link from "next/link";
import { listBoards } from "@/server/creative";
import { MoodboardGenerator } from "@/components/moodboard-generator";
import { timeAgo } from "@/lib/utils";

export default async function MoodboardsPage() {
  const boards = await listBoards();
  return (
    <div className="space-y-10">
      <header className="text-center">
        <p className="eyebrow">Moodboard generator</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Give me a brief</h1>
      </header>
      <MoodboardGenerator />
      <section>
        <h2 className="eyebrow mb-3">Boards · {boards.length}</h2>
        <ul className="divide-y divide-line rounded-3xl border border-line">
          {boards.map((b) => (
            <li key={b.id}>
              <Link href={`/moodboards/${b.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper-2">
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium tracking-tight">{b.title}</p>
                  <p className="truncate text-[13px] text-ink-2">{b.brief}</p>
                </div>
                <span className="shrink-0 text-[12px] text-ink-3">{timeAgo(b.createdAt)}</span>
              </Link>
            </li>
          ))}
          {!boards.length && <li className="px-5 py-10 text-center text-sm text-ink-3">No boards yet.</li>}
        </ul>
      </section>
    </div>
  );
}
