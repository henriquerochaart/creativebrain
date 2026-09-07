/**
 * Pre-flight check: verifies the configuration a deploy needs before you trust it.
 * Catches the failures that are otherwise silent — a storage driver that cannot persist on
 * serverless, an embedding width that no longer matches the database, a missing API key.
 *
 *   npm run preflight
 */
import { sql } from "drizzle-orm";
import { env } from "./server/env";
import { aiStatus } from "./server/ai/router";
import { ffmpegBinary } from "./server/pipeline/binaries";

type Level = "ok" | "warn" | "fail";
const rows: { level: Level; label: string; detail: string }[] = [];
const add = (level: Level, label: string, detail: string) => rows.push({ level, label, detail });

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    add("fail", "Database", "DATABASE_URL is not set. Use a Postgres with pgvector (Neon, or docker compose up -d).");
    return;
  }
  const redacted = env.databaseUrl.replace(/\/\/([^:]+):[^@]*@/, "//$1:***@");
  let db: typeof import("./server/db/client").db;
  let pool: typeof import("./server/db/client").pool;
  try {
    ({ db, pool } = await import("./server/db/client"));
    await db.execute(sql`SELECT 1`);
    add("ok", "Database", `reachable · ${redacted}`);
  } catch (err) {
    add("fail", "Database", `cannot connect to ${redacted} — ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  if (env.isServerless && !/sslmode=/.test(env.databaseUrl)) {
    add("warn", "Database TLS", "no sslmode in the connection string. Managed providers expect ?sslmode=require.");
  }
  try {
    const ext = await db.execute<{ extname: string }>(sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
    if (ext.rows.length) add("ok", "pgvector", "extension installed");
    else add("fail", "pgvector", "extension missing. Run npm run db:migrate (it creates it).");
  } catch {
    add("warn", "pgvector", "could not inspect extensions");
  }
  try {
    const t = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('references','collections','collection_items','reference_relations','conversations','boards','projects','project_references','reference_events')`);
    const n = t.rows[0]?.n ?? 0;
    if (n === 9) add("ok", "Schema", "all 9 tables present");
    else add("fail", "Schema", `${n} of 9 tables present. Run npm run db:migrate.`);
    if (n > 0) {
      const dim = await db.execute<{ t: string }>(sql`SELECT format_type(atttypid, atttypmod) AS t FROM pg_attribute WHERE attrelid = '"references"'::regclass AND attname = 'embedding_content'`);
      const found = Number(/vector\((\d+)\)/.exec(dim.rows[0]?.t ?? "")?.[1]);
      if (Number.isFinite(found)) {
        if (found === env.ai.embeddingDimensions) add("ok", "Embedding width", `${found} matches EMBEDDING_DIMENSIONS`);
        else add("fail", "Embedding width", `database has vector(${found}) but EMBEDDING_DIMENSIONS is ${env.ai.embeddingDimensions}. Every write will fail. Change the variable back, or migrate and re-embed.`);
      }
      const counts = await db.execute<{ status: string; n: number }>(sql`SELECT status, count(*)::int AS n FROM "references" GROUP BY status`);
      const summary = counts.rows.map((r) => `${r.n} ${r.status}`).join(", ") || "empty";
      add("ok", "References", summary);
    }
  } catch (err) {
    add("fail", "Schema", err instanceof Error ? err.message : String(err));
  }
  await pool.end().catch(() => undefined);
}

function checkStorage() {
  if (env.storage.driver === "s3") {
    const missing = (["bucket", "accessKeyId", "secretAccessKey"] as const).filter((k) => !env.storage.s3[k]);
    if (missing.length) add("fail", "Storage", `STORAGE_DRIVER=s3 but missing ${missing.map((m) => `S3_${m.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase()}`).join(", ")}`);
    else add("ok", "Storage", `s3 · ${env.storage.s3.bucket}${env.storage.s3.endpoint ? ` @ ${env.storage.s3.endpoint}` : ""}${env.storage.s3.publicUrl ? "" : " (no S3_PUBLIC_URL: media is served through /api/media)"}`);
  } else if (env.isServerless) {
    add("fail", "Storage", "STORAGE_DRIVER=local on a serverless host. The filesystem is read-only and not shared, so thumbnails and uploads are lost. Use s3 (Cloudflare R2 works).");
  } else {
    add("ok", "Storage", `local · ${env.storage.localDir}`);
  }
}

function checkAI() {
  const s = aiStatus();
  const line = (name: string, x: { provider: string; model: string; status: string }) => {
    if (x.provider === "none") {
      add("warn", name, "disabled. Video and audio references are understood from frames and metadata only.");
      return;
    }
    if (x.status === "ok") add(x.provider === "mock" ? "warn" : "ok", name, `${x.provider} · ${x.model}${x.provider === "mock" ? " (mock: deterministic placeholder output)" : ""}`);
    else if (x.status === "unconfigured") add(name === "Transcription" ? "warn" : "fail", name, `${x.provider} selected but its API key is missing`);
    else add("fail", name, `${x.provider} failed to initialise`);
  };
  line("Reasoning + vision", s.llm);
  line("Embeddings", s.embeddings);
  line("Transcription", s.transcription);
}

function checkApp() {
  if (!env.apiKey) add(env.isServerless ? "fail" : "warn", "API key", "BRAIN_API_KEY is empty, so /api/* is open to anyone who knows the URL.");
  else if (env.apiKey.length < 24) add("warn", "API key", "BRAIN_API_KEY is short. Use 32+ random characters.");
  else add("ok", "API key", "set");

  if (env.isServerless && /localhost|127\.0\.0\.1/.test(env.appUrl)) add("fail", "Public URL", `APP_URL is still ${env.appUrl}. Set it to the deployed origin so stored media and share links resolve.`);
  else add("ok", "Public URL", `${env.publicUrl}${env.basePath ? `  (BASE_PATH=${env.basePath} — the site at ${env.appUrl} must rewrite ${env.basePath}/* here)` : ""}`);

  if (env.processingMode === "inline") add("ok", "Processing", "inline · the API understands references in the background of the request (after())");
  else add("ok", "Processing", "worker · run npm run worker somewhere with the same DATABASE_URL");
  if (env.connectors.mediaFetcher === "yt-dlp" && env.isServerless) add("warn", "Media fetcher", "yt-dlp needs a binary that serverless does not provide. Use the external worker for it.");
}

async function checkBinaries() {
  const ffmpeg = await ffmpegBinary();
  if (ffmpeg) add("ok", "ffmpeg", ffmpeg.includes("node_modules") ? "bundled ffmpeg-static" : ffmpeg);
  else add("warn", "ffmpeg", "not found. Video frames, audio and transcription are skipped; everything else works.");
}

const ICON: Record<Level, string> = { ok: "✓", warn: "!", fail: "✗" };

async function main() {
  checkApp();
  await checkDatabase();
  checkStorage();
  checkAI();
  await checkBinaries();

  const width = Math.max(...rows.map((r) => r.label.length));
  console.log(`\nHenrique Brain — pre-flight${env.isServerless ? " (serverless)" : ""}\n`);
  for (const r of rows) console.log(`  ${ICON[r.level]}  ${r.label.padEnd(width)}  ${r.detail}`);
  const fails = rows.filter((r) => r.level === "fail").length;
  const warns = rows.filter((r) => r.level === "warn").length;
  console.log(`\n  ${fails ? `${fails} blocking` : "nothing blocking"}${warns ? `, ${warns} to look at` : ""}\n`);
  process.exit(fails ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
