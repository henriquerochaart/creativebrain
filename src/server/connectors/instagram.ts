import type { Connector, ConnectorResult } from "./types";
import { fetchWithTimeout } from "./types";
import { fetchOEmbed } from "./oembed";
import { extractMeta } from "./html";
import { env } from "../env";

export const instagramConnector: Connector = {
  platform: "instagram",
  matches(url) {
    const h = url.hostname.replace(/^www\./, "");
    return h === "instagram.com" || h.endsWith(".instagram.com") || h === "instagr.am";
  },
  async fetch(url): Promise<ConnectorResult> {
    const warnings: string[] = [];
    const isVideo = /\/(reel|reels|tv)\//.test(url.pathname);
    const canonicalUrl = `https://www.instagram.com${url.pathname.replace(/\/$/, "")}/`;
    let title: string | null = null;
    let author: string | null = null;
    let authorUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    let description: string | null = null;

    if (env.connectors.instagramOembedToken) {
      const oembed = await fetchOEmbed(
        `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(canonicalUrl)}&access_token=${env.connectors.instagramOembedToken}`,
      );
      if (oembed) {
        title = oembed.title ?? null;
        author = oembed.author_name ?? null;
        authorUrl = oembed.author_url ?? null;
        thumbnailUrl = oembed.thumbnail_url ?? null;
      } else warnings.push("Instagram oEmbed failed (check INSTAGRAM_OEMBED_TOKEN)");
    }

    if (!thumbnailUrl) {
      // OpenGraph fallback. Instagram frequently serves a login wall; we degrade gracefully.
      try {
        const res = await fetchWithTimeout(canonicalUrl);
        if (res.ok) {
          const meta = extractMeta(await res.text(), canonicalUrl);
          title = title ?? meta.title ?? null;
          description = meta.description ?? null;
          thumbnailUrl = meta.image ?? null;
          if (!thumbnailUrl) warnings.push("Instagram returned no OpenGraph image (login wall)");
        } else warnings.push(`Instagram page fetch returned ${res.status}`);
      } catch {
        warnings.push("Instagram page fetch failed");
      }
    }

    const handle = /^\/([A-Za-z0-9_.]+)\/?$/.exec(url.pathname)?.[1];
    return {
      platform: "instagram",
      mediaType: isVideo ? "video" : "image",
      canonicalUrl,
      metadata: { title, author: author ?? handle ?? null, authorUrl, siteName: "Instagram" },
      thumbnailUrl,
      description,
      fetchableWithMediaFetcher: true,
      warnings,
    };
  },
};
