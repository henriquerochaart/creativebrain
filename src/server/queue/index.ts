import { PgBoss, type Job } from "pg-boss";
import { after } from "next/server";
import { env } from "../env";
import { processReference } from "../pipeline/ingest";

export const INGEST_QUEUE = "ingest";

declare global {
  // eslint-disable-next-line no-var
  var __brainBoss: Promise<PgBoss> | undefined;
}

export async function getBoss(): Promise<PgBoss> {
  if (!globalThis.__brainBoss) {
    globalThis.__brainBoss = (async () => {
      const boss = new PgBoss({ connectionString: env.databaseUrl, schema: "pgboss" });
      boss.on("error", (err: unknown) => console.error("[queue]", err));
      await boss.start();
      await boss.createQueue(INGEST_QUEUE, { retryLimit: 2, retryDelay: 30, expireInSeconds: 60 * 30 });
      return boss;
    })();
  }
  return globalThis.__brainBoss;
}

const inflight = new Set<string>();

// A full pipeline run (frames, transcription, a multimodal synthesis call) is heavy; too many at
// once starve each other of CPU/network and risk a route's own maxDuration — the platform kills the
// run mid-synthesis with no chance for its try/catch to mark it failed, so the reference is left
// stuck at status=processing forever. This caps how many inline runs one Node process executes at a
// time; extras wait their turn instead of piling on. On a real single-server deployment (what
// "inline" is for — see README) this fully protects that process. On Vercel it only protects a warm
// instance handling several requests in a row: concurrent requests each get their own instance with
// their own counter, so a genuine simultaneous burst is not capped by this alone. Batch UI actions
// (see src/lib/reprocess.ts) throttle client-side for that reason; heavy video volume on Vercel wants
// PROCESSING_MODE=worker, whose concurrency is real because pg-boss serializes through Postgres.
const INLINE_CONCURRENCY = 3;
let inlineRunning = 0;
const inlineWaiting: (() => void)[] = [];

function acquireInlineSlot(): Promise<void> {
  if (inlineRunning < INLINE_CONCURRENCY) {
    inlineRunning++;
    return Promise.resolve();
  }
  return new Promise((resolve) => inlineWaiting.push(resolve));
}

function releaseInlineSlot() {
  const next = inlineWaiting.shift();
  if (next) next();
  else inlineRunning--;
}

/**
 * Queues a reference for understanding. In "worker" mode the job goes to Postgres (pg-boss)
 * and `npm run worker` picks it up. In "inline" mode we process in the background of this process.
 */
export async function enqueueIngest(referenceId: string): Promise<{ mode: "worker" | "inline" }> {
  if (env.processingMode === "worker") {
    const boss = await getBoss();
    await boss.send(INGEST_QUEUE, { referenceId }, { singletonKey: referenceId });
    return { mode: "worker" };
  }
  if (!inflight.has(referenceId)) {
    inflight.add(referenceId);
    const job = async () => {
      await acquireInlineSlot();
      try {
        await processReference(referenceId);
      } finally {
        releaseInlineSlot();
        inflight.delete(referenceId);
      }
    };
    // Inside a request, `after` keeps serverless functions (Vercel etc.) alive until the pipeline finishes.
    // Outside a request context (worker, scripts) it throws, so we fall back to a detached promise.
    try {
      after(job);
    } catch {
      void job();
    }
  }
  return { mode: "inline" };
}

export async function startWorker(concurrency = 2) {
  const boss = await getBoss();
  await boss.work<{ referenceId: string }>(INGEST_QUEUE, { batchSize: 1, pollingIntervalSeconds: 2 }, async (jobs: Job<{ referenceId: string }>[]) => {
    for (const job of jobs) {
      console.log(`[worker] understanding ${job.data.referenceId}`);
      const ref = await processReference(job.data.referenceId);
      console.log(`[worker] ${job.data.referenceId} → ${ref.status}${ref.error ? ` (${ref.error})` : ""}`);
    }
  });
  // pg-boss runs one poller per work() call; register `concurrency` pollers.
  for (let i = 1; i < concurrency; i++) {
    await boss.work<{ referenceId: string }>(INGEST_QUEUE, { batchSize: 1, pollingIntervalSeconds: 2 }, async (jobs: Job<{ referenceId: string }>[]) => {
      for (const job of jobs) await processReference(job.data.referenceId);
    });
  }
  return boss;
}
