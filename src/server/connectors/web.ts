import type { Connector, ConnectorResult } from "./types";
import { fetchWithTimeout } from "./types";
import { extractMeta, extractText } from "./html";
import { detectPlatform } from "./detect";
import type { Platform } from "../taxonomy";

/**
 * Generic connector for any URL: articles, Behance, Pinterest, app stores, and direct files.
 * Uses content-type to route direct media (image/pdf/video) so they get processed as files.
 */
export const webConnector: Connector = {
  platform: "website",
  matches() {
    return true;
  },
  async fetch(url): Promise<ConnectorResult> {
    const warnings: string[] = [];
    const detected = detectPlatform(url.toString());
    const platform: Platform = detected === "other" ? "website" : detected;
    let res: Response;
    try {
      res = await fetchWithTimeout(url.toString());
    } catch (err) {
      return {
        platform,
        mediaType: "website",
        canonicalUrl: url.toString(),
        metadata: { title: url.hostname, siteName: url.hostname },
        warnings: [`Fetch failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
    const ctype = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const finalUrl = res.url || url.toString();

    if (ctype.startsWith("image/")) {
      return { platform: "image", mediaType: "image", canonicalUrl: finalUrl, metadata: { title: fileName(finalUrl) }, mediaUrl: finalUrl, mediaMime: ctype, thumbnailUrl: finalUrl };
    }
    if (ctype === "application/pdf") {
      return { platform: "pdf", mediaType: "pdf", canonicalUrl: finalUrl, metadata: { title: fileName(finalUrl) }, mediaUrl: finalUrl, mediaMime: ctype };
    }
    if (ctype.startsWith("video/")) {
      return { platform: "video", mediaType: "video", canonicalUrl: finalUrl, metadata: { title: fileName(finalUrl) }, mediaUrl: finalUrl, mediaMime: ctype };
    }

    if (!res.ok) warnings.push(`Page returned ${res.status}`);
    const html = await res.text();
    const meta = extractMeta(html, finalUrl);
    const pageText = extractText(html);
    const isVideoPage = meta.type?.startsWith("video") || Boolean(meta.video);
    return {
      platform,
      mediaType: platform === "app" ? "website" : isVideoPage ? "video" : "website",
      canonicalUrl: meta.canonical ?? finalUrl,
      metadata: {
        title: meta.title ?? url.hostname,
        siteName: meta.siteName ?? url.hostname,
        author: meta.author ?? null,
        publishedAt: meta.publishedAt ?? null,
        language: meta.language ?? null,
        ogType: meta.type ?? null,
      },
      thumbnailUrl: meta.image ?? null,
      mediaUrl: meta.video && /\.(mp4|webm|mov)($|\?)/i.test(meta.video) ? meta.video : null,
      description: meta.description ?? null,
      pageText,
      warnings,
    };
  },
};

function fileName(u: string): string {
  try {
    const p = new URL(u).pathname;
    return decodeURIComponent(p.split("/").filter(Boolean).pop() ?? u);
  } catch {
    return u;
  }
}
