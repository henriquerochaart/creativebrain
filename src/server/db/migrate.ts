/**
 * Applies SQL migrations from ./drizzle. Creates the pgvector extension first so the vector
 * columns and HNSW indexes can be created on a fresh database.
 *
 *   npm run db:migrate
 *
 * Also runs as part of `vercel-build`, where two deploys can build at once, so the whole
 * migration is serialised behind a Postgres advisory lock.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { db, pool } from "./client";

/** Arbitrary constant, unique to this app, so only Brain migrations contend for it. */
const MIGRATION_LOCK = 728_301_144;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Point it at a Postgres database with the pgvector extension available (e.g. Neon, or `docker compose up -d` locally).");
    process.exit(1);
  }
  // Hold the lock on its own connection so releasing it cannot land on a different pooled client.
  const lock = await pool.connect();
  try {
    await lock.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK]);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("migrations applied");
  } finally {
    await lock.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK]).catch(() => undefined);
    lock.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
