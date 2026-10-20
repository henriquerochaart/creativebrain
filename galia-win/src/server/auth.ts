import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * A single shared password (ADMIN_PASSWORD) for whoever reviews receipts and works the door. The
 * session cookie is an expiry signed with a key derived from that password, so changing the
 * password logs every device out.
 */
export const ADMIN_COOKIE = "gw_admin";
export const SESSION_SECONDS = 14 * 24 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 10;

export function adminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD ?? "";
  return password.length >= MIN_PASSWORD_LENGTH ? password : null;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function mac(expiry: string, password: string): Buffer {
  return createHmac("sha256", sha256("galia-win/session/" + password))
    .update(expiry)
    .digest();
}

export function signSession(password: string, now = Date.now()): string {
  const expiry = String(now + SESSION_SECONDS * 1000);
  return `${expiry}.${mac(expiry, password).toString("base64url")}`;
}

export function verifySession(value: string | undefined, password: string | null, now = Date.now()): boolean {
  if (!value || !password) return false;
  const [expiry, signature] = value.split(".");
  if (!expiry || !signature || !(Number(expiry) > now)) return false;
  const given = Buffer.from(signature, "base64url");
  const expected = mac(expiry, password);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function passwordMatches(input: string, password: string | null): boolean {
  if (!password) return false;
  return timingSafeEqual(sha256(input), sha256(password));
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(ADMIN_COOKIE)?.value, adminPassword());
}
