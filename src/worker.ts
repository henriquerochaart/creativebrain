/**
 * Background worker: understands references queued by the app.
 *   PROCESSING_MODE=worker npm run worker
 */
import { startWorker } from "./server/queue";

startWorker(Number(process.env.WORKER_CONCURRENCY ?? 2))
  .then(() => console.log("[worker] listening for ingest jobs"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
