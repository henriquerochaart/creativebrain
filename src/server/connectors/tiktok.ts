import type { Connector, ConnectorResult } from "./types";
import { fetchOEmbed } from "./oembed";

export const tiktokConnector: Connector = {
  platform: "tiktok",
  matches(url) {
    const h = url.hostname.replace(/^www\./, "");
    return h === "tiktok.com" || h.endsWith(".tiktok.com");
  },
  async fetch(url): Promise<ConnectorResult> {
    const warnings: string[] = [];
    // TikTok's public oEmbed endpoint resolves short links (vm.tiktok.com) as well.
    const oembed = await fetchOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`);
    if (!oembed) warnings.push("TikTok oEmbed unavailable");
    return {
      platform: "tiktok",
      mediaType: "video",
      canonicalUrl: url.toString(),
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
      fetchableWithMediaFetcher: true,
      warnings,
    };
  },
};
