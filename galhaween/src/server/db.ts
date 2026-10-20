/**
 * One SQL code path for every environment: Postgres (pg) when DATABASE_URL is set, otherwise an
 * embedded Postgres (PGlite) persisted under .data/ for local development and single-server hosts.
 * Receipts are stored in the same table as bytea: one service to run, and a party's worth of
 * screenshots is a few hundred megabytes at most.
 */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

const MIGRATIONS = [
  `create table if not exists entries (
    id uuid primary key,
    name text not null,
    email text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamptz not null default now(),
    receipt_name text not null,
    receipt_type text not null,
    receipt_size integer not null,
    receipt_hash text not null,
    receipt bytea not null,
    reviewed_at timestamptz,
    note text,
    ticket_code text unique,
    ticket_token text unique,
    email_sent_at timestamptz,
    email_error text,
    checked_in_at timestamptz
  )`,
  `create index if not exists entries_receipt_hash_idx on entries (receipt_hash)`,
  `create index if not exists entries_created_at_idx on entries (created_at desc)`,
];

export async function migrate(db: Db): Promise<void> {
  for (const sql of MIGRATIONS) await db.query(sql);
}

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 3 });
    return { query: (sql, params) => pool.query(sql, params) as never };
  }
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is required on Vercel: its filesystem is not persistent, so entries and receipts would be lost.",
    );
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(process.env.DATA_DIR ?? ".data/db");
  return { query: (sql, params) => pg.query(sql, params) as never };
}

// Cached on globalThis so dev reloads reuse one connection; two PGlite instances on one directory
// would corrupt it.
const cache = globalThis as unknown as { __galhaweenDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  cache.__galhaweenDb ??= open()
    .then(async (db) => {
      await migrate(db);
      return db;
    })
    .catch((error) => {
      cache.__galhaweenDb = undefined;
      throw error;
    });
  return cache.__galhaweenDb;
}
