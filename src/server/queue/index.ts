import { PgBoss, type Job } from "pg-boss";
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
    void processReference(referenceId).finally(() => inflight.delete(referenceId));
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
