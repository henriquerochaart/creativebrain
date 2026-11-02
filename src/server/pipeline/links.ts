import type { SiteMention } from "../ai/schemas";
import type { ReferenceLink } from "../db/schema";
import { fetchWithTimeout } from "../connectors/types";
import { extractMeta } from "../connectors/html";

/** At most this many sites are opened for one reference. */
const MAX_LINKS = 8;

/** Hosts that are where references come from, not where they point. */
const PLATFORM_HOSTS = /(^|\.)(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|facebook\.com|x\.com|twitter\.com|threads\.net|linktr\.ee)$/i;

/**
 * An address as a person writes it ("skillry.dev/ai-videos.", "https://Higgsfield.ai") turned
 * into a URL, or null when it is not one: no dot in the host, spaces, or not http(s).
 */
export function normalizeSiteUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  const text = raw.trim().replace(/[.,;:!?)\]}'"»”]+$/, "");
  if (!text || /\s/.test(text)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!/^https?:$/.test(url.protocol) || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

/** Letters and digits only, lower case: how a name is compared with a host or a page title. */
export function looseName(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Whether a page plausibly is the site the material named. An address the material spelled out
 * is trusted as it stands; one the model supplied from memory must open a page whose host or title
 * carries the name, so a guessed domain (parked, or someone else's) never becomes a link.
 */
export function confirmsName(site: Pick<SiteMention, "name" | "urlStated">, host: string, title: string | null): boolean {
  if (site.urlStated) return true;
  const name = looseName(site.name);
  if (name.length < 3) return false;
  return looseName(host).includes(name) || looseName(title ?? "").includes(name);
}

/**
 * Opens every site the material points at and keeps those that answer: the page's own title,
 * description and picture, plus what the material says about it. Runs in parallel with a short
 * timeout each, so a slow site costs seconds, not the reference. Never throws.
 */
export async function resolveLinks(sites: SiteMention[], ownUrl: string | null): Promise<ReferenceLink[]> {
  const ownHost = normalizeSiteUrl(ownUrl)?.hostname.replace(/^www\./, "") ?? null;
  const seen = new Set<string>();
  const candidates: { site: SiteMention; url: URL }[] = [];
  for (const site of sites) {
    const url = normalizeSiteUrl(site.url);
    if (!url) continue;
    const host = url.hostname.replace(/^www\./, "");
    const key = `${host}${url.pathname.replace(/\/$/, "")}`;
    if (host === ownHost || PLATFORM_HOSTS.test(host) || seen.has(key)) continue;
    seen.add(key);
    candidates.push({ site, url });
    if (candidates.length >= MAX_LINKS) break;
  }
  const opened = await Promise.all(
    candidates.map(async ({ site, url }): Promise<ReferenceLink | null> => {
      try {
        const res = await fetchWithTimeout(url.toString(), {}, 8000);
        if (!res.ok) {
          await res.body?.cancel();
          return null;
        }
        const finalUrl = res.url || url.toString();
        // A site is a page: an address that answers with an image or a file (a CDN link copied
        // from a caption) is not one.
        if (!(res.headers.get("content-type") ?? "").includes("html")) {
          await res.body?.cancel();
          return null;
        }
        const meta = extractMeta((await res.text()).slice(0, 500_000), finalUrl);
        const host = new URL(finalUrl).hostname.replace(/^www\./, "");
        const title = meta.title?.trim() || null;
        if (!confirmsName(site, host, title)) return null;
        return {
          url: finalUrl,
          host,
          name: site.name.trim() || host,
          title,
          description: meta.description?.trim() || null,
          image: meta.image ?? null,
          note: site.what.trim(),
          evidence: site.evidence,
        };
      } catch {
        return null;
      }
    }),
  );
  return opened.filter((l): l is ReferenceLink => l !== null);
}
