import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { cache } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "./db/client";
import { users } from "./db/schema";
import { SESSION_COOKIE, readSessionClaims } from "@/lib/session";

/**
 * Whose library a request reads and writes. Each account has its own: every owned table carries
 * user_id, and every query in server/* filters on `await userId()`.
 *
 * - Pages and server actions: the signed-in account, from the session cookie.
 * - API routes: whoever `withAuth` resolved (session, API key, capture token), set with `runAs`
 *   for the length of the handler.
 * - The pipeline never asks: it works on a reference row, which carries its own user_id.
 */
const current = new AsyncLocalStorage<string>();

export class NotSignedIn extends Error {
  constructor() {
    super("Not signed in");
  }
}

export function runAs<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  return current.run(uid, fn);
}

/**
 * Whether `version` is the account's current session_version. Memoised per request and per
 * (account, version): a server action that bumps the version and then re-renders the page in the
 * same request asks again with the new cookie's version, and must not get the stale answer.
 */
const isCurrentVersion = cache(async (uid: string, version: number): Promise<boolean> => {
  if (!/^[0-9a-f-]{36}$/i.test(uid)) return false;
  const [row] = await db.select({ v: users.sessionVersion }).from(users).where(eq(users.id, uid));
  return row !== undefined && row.v === version;
});

/**
 * The account a session cookie belongs to, or null: signed, not expired, the account still exists
 * and the cookie was signed with its current session_version (a password change retires the rest).
 */
export async function sessionUser(token: string | null | undefined): Promise<string | null> {
  const claims = await readSessionClaims(token);
  if (!claims) return null;
  return (await isCurrentVersion(claims.userId, claims.version)) ? claims.userId : null;
}

export async function userId(): Promise<string> {
  const forced = current.getStore();
  if (forced) return forced;
  const id = await sessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) throw new NotSignedIn();
  return id;
}

/** The first account: the Brain's owner, whom BRAIN_API_KEY (agents, MCP) acts as. */
export async function ownerId(): Promise<string | null> {
  const [row] = await db.select({ id: users.id }).from(users).orderBy(desc(users.isOwner), asc(users.createdAt)).limit(1);
  return row?.id ?? null;
}
