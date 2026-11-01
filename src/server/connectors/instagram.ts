import type { Connector, ConnectorResult } from "./types";
import { fetchWithTimeout } from "./types";
import { fetchOEmbed } from "./oembed";
import { extractMeta } from "./html";
import { env } from "../env";

/**
 * The post's own picture from Instagram's public embed page (the frame its embed shows), for when
 * oEmbed has no token and the post page is a login wall. The <img class="EmbeddedMediaImage"> is
 * the plain case; the JSON blob inside the page's script carries the same picture as display_url,
 * with its slashes escaped twice.
 */
export function instagramEmbedImage(html: string): string | null {
  const img = /class="EmbeddedMediaImage"[^>]*\bsrc="([^"]+)"/.exec(html)?.[1];
  if (img) return img.replace(/&amp;/g, "&");
  const raw = /\\"display_url\\":\\"(.*?)\\"/.exec(html)?.[1];
  if (!raw) return null;
  const url = raw.replace(/\\+\//g, "/").replace(/\\+u0026/g, "&");
  return /^https:\/\//.test(url) ? url : null;
}

/** The shortcode in /p/, /reel/, /reels/ or /tv/ URLs: what the embed page is addressed by. */
export function instagramShortcode(pathname: string): string | null {
  return /\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(pathname)?.[1] ?? null;
}

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

    const shortcode = instagramShortcode(url.pathname);
    if (!thumbnailUrl && shortcode) {
      try {
        const res = await fetchWithTimeout(`https://www.instagram.com/p/${shortcode}/embed/captioned/`);
        if (res.ok) thumbnailUrl = instagramEmbedImage(await res.text());
        if (!thumbnailUrl) warnings.push("Instagram embed page had no image either");
      } catch {
        warnings.push("Instagram embed page fetch failed");
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
