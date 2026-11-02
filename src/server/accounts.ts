import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { users, type User } from "./db/schema";
import { SESSION_COOKIE, readSession } from "@/lib/session";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** Passwords are stored as scrypt(N=16384, r=8, p=1) with a 16-byte salt: `scrypt$<salt>$<hash>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validCredentials(email: string, password: string): "email" | "password" | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "email";
  if (password.length < 8) return "password";
  return null;
}

/** True once someone owns this Brain; registration closes then. */
export async function hasOwner(): Promise<boolean> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  return (row?.n ?? 0) > 0;
}

/**
 * Creates the owner, in one statement that inserts only into an empty table, so two people racing
 * to register cannot both win. Null when someone already owns the Brain.
 */
export async function registerOwner(email: string, password: string): Promise<User | null> {
  const passwordHash = await hashPassword(password);
  const rows = await db.execute<{ id: string }>(sql`
    INSERT INTO users (email, password_hash)
    SELECT ${normalizeEmail(email)}, ${passwordHash}
    WHERE NOT EXISTS (SELECT 1 FROM users)
    RETURNING id
  `);
  const id = rows.rows[0]?.id;
  if (!id) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  if (!user) {
    // Same work either way, so the response time does not say whether the address exists.
    await hashPassword(password);
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}

/** The signed-in account, for server components and actions. */
export async function currentUser(): Promise<User | null> {
  const id = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}
