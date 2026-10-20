import { isAdmin } from "./auth";

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

/** Null when the caller holds a valid admin session, otherwise the 401 to return. */
export async function denyUnlessAdmin(): Promise<Response | null> {
  return (await isAdmin()) ? null : fail("Faça login de novo.", 401);
}

/** Absolute base for links in e-mails: SITE_URL when set, else the host this request came in on. */
export function siteUrl(request: Request): string {
  return process.env.SITE_URL?.replace(/\/+$/, "") || new URL(request.url).origin;
}
