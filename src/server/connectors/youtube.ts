import type { Connector, ConnectorResult } from "./types";
import { fetchWithTimeout } from "./types";
import { fetchOEmbed } from "./oembed";
import { env } from "../env";

export function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
  const v = url.searchParams.get("v");
  if (v) return v;
  const m = /\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{6,})/.exec(url.pathname);
  return m?.[2] ?? null;
}

function isoDurationToSeconds(iso?: string): number | null {
  if (!iso) return null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export const youtubeConnector: Connector = {
  platform: "youtube",
  matches(url) {
    const h = url.hostname.replace(/^www\./, "");
    return h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be";
  },
  async fetch(url): Promise<ConnectorResult> {
    const id = youtubeId(url);
    const canonicalUrl = id ? `https://www.youtube.com/watch?v=${id}` : url.toString();
    const warnings: string[] = [];
    const oembed = await fetchOEmbed(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`);
    if (!oembed) warnings.push("YouTube oEmbed unavailable");

    let description: string | null = null;
    let durationSeconds: number | null = null;
    let publishedAt: string | null = null;
    let tags: string[] = [];
    if (id && env.connectors.youtubeApiKey) {
      try {
        const res = await fetchWithTimeout(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${env.connectors.youtubeApiKey}`,
        );
        if (res.ok) {
          const json = (await res.json()) as {
            items?: { snippet?: { description?: string; publishedAt?: string; tags?: string[] }; contentDetails?: { duration?: string } }[];
          };
          const item = json.items?.[0];
          description = item?.snippet?.description ?? null;
          publishedAt = item?.snippet?.publishedAt ?? null;
          tags = item?.snippet?.tags ?? [];
          durationSeconds = isoDurationToSeconds(item?.contentDetails?.duration);
        }
      } catch {
        warnings.push("YouTube Data API request failed");
      }
    }

    const thumbnailUrl = id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : oembed?.thumbnail_url ?? null;
    return {
      platform: "youtube",
      mediaType: "video",
      canonicalUrl,
      metadata: {
        title: oembed?.title ?? null,
        author: oembed?.author_name ?? null,
        authorUrl: oembed?.author_url ?? null,
        publishedAt,
        durationSeconds,
        siteName: "YouTube",
        videoId: id,
        platformTags: tags,
      },
      thumbnailUrl,
      description,
      fetchableWithMediaFetcher: true,
      warnings,
    };
  },
};
