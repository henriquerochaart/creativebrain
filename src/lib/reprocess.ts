import { api } from "./api";

// A full pipeline run — frames, transcription, a multimodal synthesis call — is heavy and slow.
// Firing many at once against a serverless function crowds CPU and network and risks the route's
// own 5-minute ceiling (maxDuration=300 on the reprocess and capture routes): the platform kills the
// run mid-synthesis, with no chance for the pipeline's own try/catch to mark it failed, so the
// reference is left stuck at status=processing forever. That is exactly how a batch of references
// can end up parked at "synthesis 77%" — do not go back to firing every id at once.
const CONCURRENCY = 2;
const POLL_MS = 4000;
const MAX_WAIT_MS = 6 * 60 * 1000; // a bit past maxDuration; past this a run is presumed dead

type Status = { reference: { status: string } };

async function waitUntilDone(id: string): Promise<void> {
  const start = Date.now();
  for (;;) {
    const status = await api<Status>(`/api/references/${id}`)
      .then((r) => r.reference.status)
      .catch(() => "failed");
    if (status === "understood" || status === "failed") return;
    if (Date.now() - start > MAX_WAIT_MS) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

/** Re-queues each id and waits for it to actually finish before starting more, a couple at a time. */
export async function reprocessThrottled(ids: string[], onProgress: (done: number, total: number) => void): Promise<void> {
  let done = 0;
  let cursor = 0;
  onProgress(0, ids.length);
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= ids.length) return;
      await api(`/api/references/${ids[i]}/reprocess`, { method: "POST" }).catch(() => null);
      await waitUntilDone(ids[i]);
      done++;
      onProgress(done, ids.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
}
