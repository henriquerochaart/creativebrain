/**
 * Where to go after signing in: only a path inside this app. `next` arrives in the URL, so it is
 * resolved the way a browser would and anything that leaves the origin (`//evil.com`, `/\evil.com`,
 * `/\t/evil.com`, a scheme) falls back to the library.
 */
export function safeNext(value: unknown): string {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(next)) return "/";
  try {
    const base = "http://brain.invalid";
    const url = new URL(next, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
