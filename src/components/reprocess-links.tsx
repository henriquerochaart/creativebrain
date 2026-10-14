"use client";

import { api } from "@/lib/api";
import { BulkReprocess } from "./bulk-reprocess";
import { useT } from "./lang-provider";

type Listed = { references: { id: string; mediaType: string }[] };

/** Every reference that came from a link (not a typed-in text idea), paginating past the API's own 200 cap. */
async function allLinkIds(): Promise<string[]> {
  const ids = new Set<string>();
  for (const status of ["understood", "failed"]) {
    let offset = 0;
    const limit = 200;
    for (;;) {
      const { references } = await api<Listed>(`/api/references?status=${status}&limit=${limit}&offset=${offset}`);
      for (const r of references) if (r.mediaType !== "text") ids.add(r.id);
      if (references.length < limit) break;
      offset += limit;
    }
  }
  return [...ids];
}

/** Re-understands every captured link through the current model, two at a time. See lib/reprocess.ts. */
export function ReprocessLinks() {
  const d = useT();
  return <BulkReprocess label={d.inbox.reprocessLinks} resolveIds={allLinkIds} progress={d.inbox.reprocessProgress} done={d.inbox.reprocessDone} />;
}
