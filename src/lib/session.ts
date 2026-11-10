/**
 * Sessions as signed cookies, checked with Web Crypto so the same code runs in the middleware
 * (edge) and in route handlers and pages (Node). The cookie carries the account id and an expiry,
 * signed with HMAC-SHA256; nothing is stored server side, so signing out clears the cookie and
 * changing AUTH_SECRET signs everyone out.
 *
 * The secret is AUTH_SECRET, or, when that is unset, one derived from DATABASE_URL (already a
 * server-only secret), so a deploy works without a new variable. Set AUTH_SECRET to decouple them.
 */

export const SESSION_COOKIE = "brain_session";
/** Set once the welcome cards were seen or skipped: a signed-out visit then goes to Login. */
export const WELCOME_COOKIE = "brain_welcome";
/** A Home Screen app should not ask again for months. */
export const SESSION_DAYS = 180;

const enc = new TextEncoder();

function secret(): string {
  return process.env.AUTH_SECRET || `brain-session|${process.env.DATABASE_URL ?? ""}`;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * `version` is the account's session_version when the cookie was signed. Bumping it (a password
 * change, "sign out everywhere") retires every cookie signed before; the server checks it against
 * the database (server/tenant.ts). Cookies from before versions existed read as version 0.
 */
export async function signSession(userId: string, now = Date.now(), version = 0): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ u: userId, e: now + SESSION_DAYS * 86_400_000, v: version })));
  return `${payload}.${b64url(await hmac(payload))}`;
}

/** What a cookie vouches for, or null when it is missing, forged or expired. */
export async function readSessionClaims(token: string | null | undefined, now = Date.now()): Promise<{ userId: string; version: number } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!sameBytes(fromB64url(sig), await hmac(payload))) return null;
    const { u, e, v } = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { u?: unknown; e?: unknown; v?: unknown };
    if (typeof u !== "string" || typeof e !== "number" || e <= now) return null;
    return { userId: u, version: typeof v === "number" ? v : 0 };
  } catch {
    return null;
  }
}

/** The account id a cookie vouches for (signature and expiry only: the middleware's check). */
export async function readSession(token: string | null | undefined, now = Date.now()): Promise<string | null> {
  return (await readSessionClaims(token, now))?.userId ?? null;
}

/**
 * The token a Shortcut adds to the capture URL (`&token=`), since it cannot sign in: the account
 * id and a signature of it, so the capture lands in that account's library. Derived from the
 * session secret, so it is stable across deploys and changes with it.
 */
export async function captureToken(userId: string): Promise<string> {
  return `${userId}.${b64url(await hmac(`capture|${userId}`)).slice(0, 32)}`;
}

/** The account a capture token belongs to, or null when it is not one we signed. */
export async function readCaptureToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const uid = token.slice(0, dot);
  const expected = await captureToken(uid);
  return sameBytes(enc.encode(expected), enc.encode(token)) ? uid : null;
}

/** How long a password reset link works. */
export const RESET_MINUTES = 30;

/**
 * A password reset link's token: the account, an expiry, and a signature over both and the
 * account's current password hash. Changing the password changes the hash, so a link works once.
 */
export async function resetToken(userId: string, passwordHash: string, now = Date.now()): Promise<string> {
  const exp = now + RESET_MINUTES * 60_000;
  return `${userId}.${exp}.${b64url(await hmac(`reset|${userId}|${exp}|${passwordHash}`))}`;
}

/**
 * The account a reset token is for, or null when it is forged, expired or already used.
 * `hashOf` looks up the account's current password hash (null when there is no such account).
 */
export async function readResetToken(token: string | null | undefined, hashOf: (userId: string) => Promise<string | null>, now = Date.now()): Promise<string | null> {
  const [uid, exp, sig, extra] = (token ?? "").split(".");
  if (!uid || !exp || !sig || extra !== undefined || !/^\d+$/.test(exp) || Number(exp) <= now) return null;
  const hash = await hashOf(uid);
  if (!hash) return null;
  try {
    return sameBytes(fromB64url(sig), await hmac(`reset|${uid}|${exp}|${hash}`)) ? uid : null;
  } catch {
    return null;
  }
}

/** The single token of the days before per-account libraries; it still captures, for the owner. */
export async function legacyCaptureToken(): Promise<string> {
  return b64url(await hmac("capture")).slice(0, 32);
}
