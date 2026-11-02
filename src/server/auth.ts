import { env } from "./env";
import { SESSION_COOKIE, captureToken, readSession } from "@/lib/session";

/**
 * Who may call /api/*. Since the Brain has accounts, nothing is open by default:
 * - the app itself, through the session cookie of a signed-in account;
 * - agents (MCP, scripts), with BRAIN_API_KEY as `Authorization: Bearer <key>` or `x-api-key`;
 * - the iOS Shortcut, which cannot sign in, on /api/capture only, with `?token=` (the capture
 *   token shown in Ajustes).
 * The middleware turns away page visits without a session before they get here.
 */
export async function isAuthorized(req: Request): Promise<boolean> {
  if (await readSession(cookieValue(req, SESSION_COOKIE))) return true;
  if (env.apiKey) {
    const auth = req.headers.get("authorization") ?? "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (bearer && safeEqual(bearer, env.apiKey)) return true;
    const key = req.headers.get("x-api-key") ?? "";
    if (key && safeEqual(key, env.apiKey)) return true;
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token && url.pathname.endsWith("/api/capture") && safeEqual(token, await captureToken())) return true;
  return false;
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
