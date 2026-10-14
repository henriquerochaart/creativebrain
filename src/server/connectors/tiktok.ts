import type { Connector, ConnectorResult } from "./types";
import { fetchWithTimeout } from "./types";
import { fetchOEmbed } from "./oembed";

/**
 * What to ask TikTok's oEmbed for, given the post's resolved URL. Photo posts (carousels) live at
 * /@user/photo/<id>; oEmbed answers 400 for that path but accepts the same id under /video/, so a
 * carousel is asked for as a video and kept as a photo post everywhere else.
 */
export function tiktokOEmbedTarget(resolvedUrl: string): { target: string; isPhoto: boolean; canonical: string } {
  const canonical = resolvedUrl.split(/[?#]/)[0];
  const isPhoto = /\/photo\/\d+/.test(canonical);
  return { target: canonical.replace("/photo/", "/video/"), isPhoto, canonical };
}

export const tiktokConnector: Connector = {
  platform: "tiktok",
  matches(url) {
    const h = url.hostname.replace(/^www\./, "");
    return h === "tiktok.com" || h.endsWith(".tiktok.com");
  },
  async fetch(url): Promise<ConnectorResult> {
    const warnings: string[] = [];
    // Short links (vt./vm.tiktok.com) only say video or photo once followed, so resolve first.
    let resolved = url.toString();
    try {
      const res = await fetchWithTimeout(resolved);
      resolved = res.url || resolved;
      await res.body?.cancel();
    } catch {
      warnings.push("TikTok link could not be resolved; asked oEmbed with it as given");
    }
    const { target, isPhoto, canonical } = tiktokOEmbedTarget(resolved);
    const oembed = await fetchOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(target)}`);
    if (!oembed) warnings.push("TikTok oEmbed unavailable");
    return {
      platform: "tiktok",
      // A carousel is a set of images: its cover is the material to look at, not a video to fetch.
      mediaType: isPhoto ? "image" : "video",
      canonicalUrl: canonical,
      metadata: {
        title: oembed?.title ?? null,
        author: oembed?.author_name ?? null,
        authorUrl: oembed?.author_url ?? null,
        siteName: "TikTok",
        width: oembed?.thumbnail_width ?? null,
        height: oembed?.thumbnail_height ?? null,
      },
      thumbnailUrl: oembed?.thumbnail_url ?? null,
      description: oembed?.title ?? null,
      fetchableWithMediaFetcher: !isPhoto,
      warnings,
    };
  },
};
