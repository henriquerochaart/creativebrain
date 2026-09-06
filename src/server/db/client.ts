import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "../env";

declare global {
  // eslint-disable-next-line no-var
  var __brainPool: Pool | undefined;
}

/** One pool per process; survives Next.js hot reloads in dev. */
export const pool: Pool =
  globalThis.__brainPool ??
  new Pool({
    connectionString: env.databaseUrl,
    max: 10,
  });
if (process.env.NODE_ENV !== "production") globalThis.__brainPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export { schema };
