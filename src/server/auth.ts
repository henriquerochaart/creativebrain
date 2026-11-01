import { env } from "./env";

/**
 * API protection for external agents. When BRAIN_API_KEY is set, /api/* requires
 * `Authorization: Bearer <key>` or `x-api-key: <key>`. Same-origin browser requests from the UI
 * are allowed through by the `x-brain-ui` header set by our fetch wrapper, and only when the browser
 * itself vouches for the origin with `Sec-Fetch-Site: same-origin`.
 */
export function isAuthorized(req: Request): boolean {
  if (!env.apiKey) return true;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer && safeEqual(bearer, env.apiKey)) return true;
  const key = req.headers.get("x-api-key") ?? "";
  if (key && safeEqual(key, env.apiKey)) return true;
  // Browser UI: requests marked by our client wrapper that the browser reports as same-origin.
  // Sec-Fetch-Site is a forbidden header page scripts cannot set, so it is the part that proves
  // anything. A missing one must not count: curl or a Shortcut can send `x-brain-ui: 1` and simply
  // omit it, which used to walk straight past the key. Every current browser sends it (Safari since
  // 16.4).
  const site = req.headers.get("sec-fetch-site");
  if (req.headers.get("x-brain-ui") === "1" && site === "same-origin") return true;
  return false;
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
