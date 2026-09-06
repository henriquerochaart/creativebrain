import { env } from "./env";

/**
 * API protection for external agents. When BRAIN_API_KEY is set, /api/* requires
 * `Authorization: Bearer <key>` or `x-api-key: <key>`. Same-origin browser requests from the UI
 * are allowed through by the `x-brain-ui` header set by our fetch wrapper.
 */
export function isAuthorized(req: Request): boolean {
  if (!env.apiKey) return true;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer && safeEqual(bearer, env.apiKey)) return true;
  const key = req.headers.get("x-api-key") ?? "";
  if (key && safeEqual(key, env.apiKey)) return true;
  // Browser UI: same-origin requests (Next sets sec-fetch-site) marked by our client wrapper.
  const site = req.headers.get("sec-fetch-site");
  if (req.headers.get("x-brain-ui") === "1" && (site === "same-origin" || site === null)) return true;
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
