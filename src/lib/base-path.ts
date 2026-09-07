/**
 * The app can be served from the root of a domain or from a sub path of an existing site
 * (BASE_PATH=/brain → https://henriquerocha.art/brain).
 *
 * Next already prefixes `<Link href>`, `router.push`, route handlers and files in `public/`
 * with `basePath`. It does NOT prefix strings you build yourself, so use `withBase` for exactly
 * those: `fetch("/api/…")`, `redirect("/r/…")`, `new URL(…)`, and paths written into the manifest.
 * Never pass a `<Link href>` through it — that would double the prefix.
 */
export function normalizeBasePath(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** Inlined into the client bundle by next.config.ts, and read directly on the server. */
export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH);

export function withBase(path: string): string {
  if (!BASE_PATH || !path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}
