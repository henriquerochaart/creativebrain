import { env } from "./env";
import { ownerId, sessionUser } from "./tenant";
import { SESSION_COOKIE, legacyCaptureToken, readCaptureToken } from "@/lib/session";

/**
 * Who is calling /api/*, as the account whose library the call reads and writes, or null:
 * - the app itself: the session cookie of a signed-in account;
 * - agents (MCP, scripts): BRAIN_API_KEY as `Authorization: Bearer <key>` or `x-api-key`, acting
 *   as the owner (the first account);
 * - the iOS Shortcut, on /api/capture only: `?token=`, the account's capture token from Ajustes
 *   (the older single token still works, for the owner).
 * The middleware turns away page visits without a session before they get here.
 */
export async function authorizedUser(req: Request): Promise<string | null> {
  const session = await sessionUser(cookieValue(req, SESSION_COOKIE));
  if (session) return session;
  if (env.apiKey) {
    const auth = req.headers.get("authorization") ?? "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const key = req.headers.get("x-api-key") ?? "";
    if ((bearer && safeEqual(bearer, env.apiKey)) || (key && safeEqual(key, env.apiKey))) return ownerId();
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token && url.pathname.endsWith("/api/capture")) {
    const uid = await readCaptureToken(token);
    if (uid) return uid;
    if (safeEqual(token, await legacyCaptureToken())) return ownerId();
  }
  return null;
}

export async function isAuthorized(req: Request): Promise<boolean> {
  return (await authorizedUser(req)) !== null;
}

/** One cookie from the raw header, so this works on a plain Request as well as a NextRequest. */
export function cookieValue(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
