import { ReferenceGrid } from "@/components/reference-grid";
import { LiveRefresh } from "@/components/live-refresh";
import { listReferences, toPublic } from "@/server/references";
import { dict } from "@/server/lang";

/** One page holds the whole library at this size; past it, this needs paging. */
const LIMIT = 500;

/**
 * Recentes: every reference, newest first, in one masonry to scroll through. Reached from the
 * Recentes heading on Início, which only shows the newest few.
 */
export default async function RecentPage() {
  const { lang, d } = await dict();
  const refs = (await listReferences({ limit: LIMIT })).map(toPublic);
  const processing = refs.some((r) => r.status === "queued" || r.status === "processing");
  return (
    <div className="space-y-6">
      <h1 className="large-title">{d.home.recent}</h1>
      <ReferenceGrid references={refs} lang={lang} showStatus mascot="apontando" empty={d.home.emptyTitle} />
      <LiveRefresh active={processing} />
    </div>
  );
}
