"use client";

import { BulkReprocess } from "./bulk-reprocess";
import { useT } from "./lang-provider";

/** Bulk-restarts references presumed dead (queued/processing well past the pipeline's own timeout). */
export function ReprocessStale({ ids }: { ids: string[] }) {
  const d = useT();
  return <BulkReprocess label={d.inbox.reprocessStaleAll(ids.length)} resolveIds={() => ids} progress={d.inbox.reprocessProgress} done={d.inbox.reprocessDone} />;
}
