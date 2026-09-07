import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "../env";

declare global {
  // eslint-disable-next-line no-var
  var __brainPool: Pool | undefined;
}

/**
 * On a serverless host every warm instance keeps its own pool, so a generous `max` multiplies
 * across instances and exhausts the database's connection limit (Neon's free tier especially).
 * Keep it small there; a long-lived server or the worker can hold more.
 */
function poolMax(): number {
  const override = Number(process.env.DB_POOL_MAX);
  if (Number.isFinite(override) && override >= 2) return override;
  return env.isServerless ? 3 : 10;
}

/** One pool per process; survives Next.js hot reloads in dev. */
export const pool: Pool =
  globalThis.__brainPool ??
  new Pool({
    connectionString: env.databaseUrl,
    max: poolMax(),
    idleTimeoutMillis: 10_000,
    // Fail fast instead of hanging a request forever when the database is unreachable.
    connectionTimeoutMillis: 15_000,
    // Lets one-shot scripts (migrate, preflight, worker shutdown) exit without an explicit end().
    allowExitOnIdle: true,
  });
if (process.env.NODE_ENV !== "production") globalThis.__brainPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export { schema };
