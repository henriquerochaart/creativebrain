/**
 * Applies SQL migrations from ./drizzle. Creates the pgvector extension first so
 * the vector columns and HNSW indexes can be created on a fresh database.
 *
 *   npm run db:migrate
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("migrations applied");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
