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

type PageItem = { cover: string | null; desc: string | null; author: string | null; authorName: string | null; video: string | null };

/**
 * The post as its public page describes it, from the JSON the page rehydrates from: its cover
 * (a carousel's first picture), caption and author. oEmbed stopped returning a thumbnail, title or
 * author (it now answers with the player iframe alone), so this is where the post's own picture
 * comes from. Photo posts only carry the item when asked for under /video/, like oEmbed.
 */
export function tiktokPageItem(html: string): PageItem | null {
  const raw = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!raw) return null;
  try {
    const scope = JSON.parse(raw)?.__DEFAULT_SCOPE__;
    const item = scope?.["webapp.video-detail"]?.itemInfo?.itemStruct;
    if (!item) return null;
    const first = (x: unknown): string | null => (Array.isArray(x) && typeof x[0] === "string" ? x[0] : null);
    const cover =
      first(item.imagePost?.cover?.imageURL?.urlList) ??
      first(item.imagePost?.images?.[0]?.imageURL?.urlList) ??
      (typeof item.video?.originCover === "string" && item.video.originCover ? item.video.originCover : null) ??
      (typeof item.video?.cover === "string" && item.video.cover ? item.video.cover : null);
    const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : null);
    // The video's own file. TikTok serves it only to a client holding the cookies the page set.
    const video = str(item.video?.playAddr) ?? str(item.video?.downloadAddr);
    return { cover, desc: str(item.desc), author: str(item.author?.uniqueId), authorName: str(item.author?.nickname), video: item.imagePost ? null : video };
  } catch {
    return null;
  }
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
    // The public page: the cover oEmbed no longer gives, and for a video the file and the cookies
    // that unlock it, so the Brain can watch it where yt-dlp does not run.
    let page: PageItem | null = null;
    let cookie: string | null = null;
    if (!oembed?.thumbnail_url || !isPhoto) {
      try {
        const res = await fetchWithTimeout(target);
        cookie = cookieHeader(res.headers);
        if (res.ok) page = tiktokPageItem(await res.text());
        if (!page?.cover) warnings.push("TikTok page carried no cover");
      } catch {
        warnings.push("TikTok page fetch failed");
      }
    }
    const video = !isPhoto ? (page?.video ?? null) : null;
    const title = oembed?.title || page?.desc || null;
    const authorHandle = page?.author ?? null;
    return {
      platform: "tiktok",
      // A carousel is a set of images: its cover is the material to look at, not a video to fetch.
      mediaType: isPhoto ? "image" : "video",
      canonicalUrl: canonical,
      metadata: {
        title,
        author: oembed?.author_name ?? page?.authorName ?? authorHandle,
        authorUrl: oembed?.author_url ?? (authorHandle ? `https://www.tiktok.com/@${authorHandle}` : null),
        siteName: "TikTok",
        width: oembed?.thumbnail_width ?? null,
        height: oembed?.thumbnail_height ?? null,
      },
      thumbnailUrl: oembed?.thumbnail_url ?? page?.cover ?? null,
      mediaUrl: video,
      mediaMime: video ? "video/mp4" : null,
      mediaHeaders: video ? { referer: "https://www.tiktok.com/", ...(cookie ? { cookie } : {}) } : null,
      description: title,
      fetchableWithMediaFetcher: !isPhoto,
      warnings,
    };
  },
};

/** The cookies a response set, as a Cookie header for the next request (name=value pairs only). */
export function cookieHeader(headers: Headers): string | null {
  const all = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  const pairs = all.map((c) => c.split(";")[0].trim()).filter((c) => c.includes("="));
  return pairs.length ? pairs.join("; ") : null;
}
