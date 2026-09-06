import Link from "next/link";
import { ReferenceGrid } from "@/components/reference-grid";
import { LiveRefresh } from "@/components/live-refresh";
import { StatusDot } from "@/components/status-dot";
import { db } from "@/server/db/client";
import { references } from "@/server/db/schema";
import { toPublic } from "@/server/references";
import { desc, inArray, sql } from "drizzle-orm";
import { ReprocessButton } from "@/components/reference-actions";

export default async function InboxPage() {
  const active = await db.select().from(references).where(inArray(references.status, ["queued", "processing", "failed"])).orderBy(desc(references.createdAt)).limit(100);
  const recent = await db
    .select()
    .from(references)
    .where(sql`${references.status} = 'understood' AND ${references.processedAt} > now() - interval '48 hours'`)
    .orderBy(desc(references.processedAt))
    .limit(60);
  const failed = active.filter((r) => r.status === "failed");
  const running = active.filter((r) => r.status !== "failed");
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-ink-2">Everything you just saved lands here while the Brain understands it.</p>
      </header>

      {running.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Processing · {running.length}</h2>
          <ReferenceGrid references={running.map(toPublic)} showStatus />
        </section>
      )}

      {failed.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Failed · {failed.length}</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {failed.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/r/${r.id}`} className="font-medium hover:underline">
                    {r.title ?? r.originalUrl ?? "Untitled"}
                  </Link>
                  <p className="truncate text-[12px] text-red-600">{r.error}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusDot status={r.status} />
                  <ReprocessButton id={r.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-3">Understood recently · {recent.length}</h2>
        <ReferenceGrid references={recent.map(toPublic)} empty="Nothing understood in the last 48 hours." />
      </section>
      <LiveRefresh active={running.length > 0} />
    </div>
  );
}
