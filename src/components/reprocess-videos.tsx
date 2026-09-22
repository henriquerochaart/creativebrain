"use client";

import { api } from "@/lib/api";
import { BulkReprocess } from "./bulk-reprocess";
import { useT } from "./lang-provider";

type Listed = { references: { id: string }[] };

/** Re-understands every video, two at a time, waiting for each to actually finish. See lib/reprocess.ts. */
export function ReprocessVideos() {
  const d = useT();
  return (
    <BulkReprocess
      label={d.inbox.reprocessVideos}
      resolveIds={async () => (await api<Listed>("/api/references?mediaType=video&status=understood&limit=200")).references.map((r) => r.id)}
      progress={d.inbox.reprocessProgress}
      done={d.inbox.reprocessDone}
    />
  );
}
