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

export async function signSession(userId: string, now = Date.now()): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ u: userId, e: now + SESSION_DAYS * 86_400_000 })));
  return `${payload}.${b64url(await hmac(payload))}`;
}

/** The account id a cookie vouches for, or null when it is missing, forged or expired. */
export async function readSession(token: string | null | undefined, now = Date.now()): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!sameBytes(fromB64url(sig), await hmac(payload))) return null;
    const { u, e } = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { u?: unknown; e?: unknown };
    return typeof u === "string" && typeof e === "number" && e > now ? u : null;
  } catch {
    return null;
  }
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

/** The single token of the days before per-account libraries; it still captures, for the owner. */
export async function legacyCaptureToken(): Promise<string> {
  return b64url(await hmac("capture")).slice(0, 32);
}
