import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { asc, desc } from "drizzle-orm";
import { db } from "./db/client";
import { users } from "./db/schema";
import { SESSION_COOKIE, readSession } from "@/lib/session";

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

export async function userId(): Promise<string> {
  const forced = current.getStore();
  if (forced) return forced;
  const id = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) throw new NotSignedIn();
  return id;
}

/** The first account: the Brain's owner, whom BRAIN_API_KEY (agents, MCP) acts as. */
export async function ownerId(): Promise<string | null> {
  const [row] = await db.select({ id: users.id }).from(users).orderBy(desc(users.isOwner), asc(users.createdAt)).limit(1);
  return row?.id ?? null;
}
