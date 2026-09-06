import type { Platform } from "../taxonomy";

/** Pure URL → platform classification. Kept side-effect free so it can be unit tested. */
export function detectPlatform(input: string): Platform {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "other";
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname.toLowerCase();
  if (host === "instagram.com" || host.endsWith(".instagram.com") || host === "instagr.am") return "instagram";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
  if (host === "behance.net" || host.endsWith(".behance.net")) return "behance";
  if (host === "pinterest.com" || host.endsWith(".pinterest.com") || /^pin\.it$|^pinterest\.[a-z.]+$/.test(host)) return "pinterest";
  if (host === "apps.apple.com" || host === "play.google.com") return "app";
  if (/\.pdf($|\?)/.test(path)) return "pdf";
  if (/\.(png|jpe?g|gif|webp|avif)($|\?)/.test(path)) return "image";
  if (/\.(mp4|mov|webm|m4v)($|\?)/.test(path)) return "video";
  return "website";
}

export function isProbablyUrl(input: string): boolean {
  const s = input.trim();
  if (/\s/.test(s)) return false;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    return /\./.test(u.hostname);
  } catch {
    return false;
  }
}

export function normalizeUrl(input: string): string {
  const s = input.trim();
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  const u = new URL(withScheme);
  // Strip common tracking params so the same reference is not duplicated.
  for (const p of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|igsh|igshid|_r|si)$/i.test(p) || /^utm_/i.test(p)) u.searchParams.delete(p);
  }
  u.hash = "";
  return u.toString();
}
