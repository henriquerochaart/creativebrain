import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "./db/client";
import { ownerId, userId } from "./tenant";

/**
 * Rate limits and daily quotas, counted in Postgres so every serverless instance shares them.
 *
 * - Sign-in, sign-up and password reset are limited per IP and per address: each try costs a
 *   scrypt hash, and unlimited tries would let anyone guess passwords.
 * - Every account has a daily quota of captures (the pipeline: a multimodal model call, frames,
 *   a transcription and four embeddings) and of AI requests (Think, Assist, Ask, moodboards,
 *   analyses), plus a per-minute burst limit so a loop cannot spend the day in a minute.
 *   The owner (who pays for the providers) has no daily quota. Defaults are set here and
 *   overridable with BRAIN_DAILY_CAPTURES and BRAIN_DAILY_AI.
 */

export class LimitError extends Error {
  constructor(
    readonly kind: "auth" | "capture" | "ai",
    readonly retryAfter: number,
  ) {
    super(`Limit reached: ${kind}`);
    this.name = "LimitError";
  }
}

/** One more hit on `key` in a window of `windowSec`: allowed while the count stays within `limit`. */
export async function hit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  const windowMs = windowSec * 1000;
  const start = Math.floor(Date.now() / windowMs) * windowMs;
  const res = await db.execute(sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${new Date(start).toISOString()}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count`);
  const count = Number((res.rows[0] as { count?: number } | undefined)?.count ?? 1);
  // Old windows are worthless; a small share of writes clears them so the table stays small.
  if (Math.random() < 0.02) void db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`).catch(() => undefined);
  return { ok: count <= limit, retryAfter: Math.max(1, Math.ceil((start + windowMs - Date.now()) / 1000)) };
}

const num = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const LIMITS = {
  capture: { perDay: () => num("BRAIN_DAILY_CAPTURES", 100), perMinute: 30 },
  ai: { perDay: () => num("BRAIN_DAILY_AI", 200), perMinute: 20 },
};

/** Throws LimitError when the signed-in account is over its burst limit or daily quota. */
export async function useQuota(kind: "capture" | "ai"): Promise<void> {
  const uid = await userId();
  const burst = await hit(`${kind}:min:${uid}`, LIMITS[kind].perMinute, 60);
  if (!burst.ok) throw new LimitError(kind, burst.retryAfter);
  if (uid === (await ownerId())) return;
  const day = await hit(`${kind}:day:${uid}`, LIMITS[kind].perDay(), 86_400);
  if (!day.ok) throw new LimitError(kind, day.retryAfter);
}

/** The caller's address as Vercel (or another proxy) reports it. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** The current count of `key` in its window, without adding to it. */
async function peek(key: string, windowSec: number): Promise<number> {
  const windowMs = windowSec * 1000;
  const start = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const res = await db.execute(sql`SELECT count FROM rate_limits WHERE key = ${key} AND window_start = ${start}`);
  return Number((res.rows[0] as { count?: number } | undefined)?.count ?? 0);
}

const AUTH_WINDOW = 900;
const PER_IP = { login: 30, register: 10, forgot: 10, reset: 20 };
const PER_EMAIL = { login: 10, register: 5, forgot: 3, reset: 10 };

/**
 * Sign-in style limits over 15 minutes, per normalised address (every attempt counts) and per IP.
 * For sign-in, the IP counts only failures (see `authFailed`): a whole office signs in from one
 * address, and its successful sign-ins must not lock it out. Returns false when over a limit.
 */
export async function allowAuthAttempt(action: keyof typeof PER_IP, email?: string): Promise<boolean> {
  const ip = await clientIp();
  const checks: Promise<boolean>[] = [];
  if (action === "login") checks.push(peek(`auth:login:fail:ip:${ip}`, AUTH_WINDOW).then((n) => n < PER_IP.login));
  else checks.push(hit(`auth:${action}:ip:${ip}`, PER_IP[action], AUTH_WINDOW).then((r) => r.ok));
  if (email) checks.push(hit(`auth:${action}:email:${email.trim().toLowerCase()}`, PER_EMAIL[action], AUTH_WINDOW).then((r) => r.ok));
  return (await Promise.all(checks)).every(Boolean);
}

/** A wrong password: counted against the caller's IP. */
export async function authFailed(): Promise<void> {
  await hit(`auth:login:fail:ip:${await clientIp()}`, PER_IP.login, AUTH_WINDOW);
}
