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

/** True once someone owns this Brain (the first account). */
export async function hasOwner(): Promise<boolean> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  return (row?.n ?? 0) > 0;
}

/**
 * Who may create an account, from BRAIN_SIGNUPS: unset or "open" lets anyone in (each account
 * gets its own, empty library); "closed" lets nobody in after the first account; anything else
 * is a comma-separated list of addresses or "@domain" endings, e.g. "@spinoff.digital,ana@x.com".
 * The very first account is always allowed: someone has to own the Brain.
 */
export function signupAllowed(email: string, policy = process.env.BRAIN_SIGNUPS ?? "", first = false): boolean {
  if (first) return true;
  const rule = policy.trim().toLowerCase();
  if (!rule || rule === "open") return true;
  if (rule === "closed") return false;
  const address = normalizeEmail(email);
  return rule
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .some((r) => (r.startsWith("@") ? address.endsWith(r) : address === r));
}

/** Whether the Register screen should be offered at all (an allowlist is checked per address). */
export async function signupsOpen(): Promise<boolean> {
  return !(await hasOwner()) || (process.env.BRAIN_SIGNUPS ?? "").trim().toLowerCase() !== "closed";
}

/**
 * Creates an account with its own library. The first account also adopts every row that predates
 * accounts (no user_id yet), so a Brain set up before logins keeps its library. Null when the
 * address is taken or not allowed by BRAIN_SIGNUPS.
 */
export async function registerUser(email: string, password: string): Promise<{ user: User | null; reason?: "taken" | "closed" }> {
  const address = normalizeEmail(email);
  const first = !(await hasOwner());
  if (!signupAllowed(address, undefined, first)) return { user: null, reason: "closed" };
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email: address, passwordHash }).onConflictDoNothing().returning();
  if (!user) return { user: null, reason: "taken" };
  if (first) {
    for (const table of ["references", "collections", "boards", "projects", "conversations"]) {
      await db.execute(sql`UPDATE ${sql.identifier(table)} SET user_id = ${user.id} WHERE user_id IS NULL`);
    }
  }
  return { user };
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
