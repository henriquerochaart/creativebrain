import { instagramEmbedImage, instagramShortcode } from "@/server/connectors/instagram";
import { describe, expect, it } from "vitest";
import { detectPlatform, isProbablyUrl, normalizeUrl } from "@/server/connectors/detect";
import { youtubeId } from "@/server/connectors/youtube";
import { tiktokOEmbedTarget, tiktokPageItem } from "@/server/connectors/tiktok";
import { connectorFor } from "@/server/connectors";
import { extractMeta, extractText } from "@/server/connectors/html";

describe("detectPlatform", () => {
  it.each([
    ["https://www.instagram.com/reel/Cxyz/", "instagram"],
    ["https://instagram.com/p/abc", "instagram"],
    ["https://www.tiktok.com/@nike/video/7255", "tiktok"],
    ["https://vm.tiktok.com/ZM123/", "tiktok"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube"],
    ["https://www.youtube.com/shorts/abc123def", "youtube"],
    ["https://www.behance.net/gallery/1/x", "behance"],
    ["https://br.pinterest.com/pin/1/", "pinterest"],
    ["https://pin.it/abc", "pinterest"],
    ["https://apps.apple.com/app/id123", "app"],
    ["https://example.com/deck.pdf?dl=1", "pdf"],
    ["https://cdn.example.com/a/b/img.webp", "image"],
    ["https://cdn.example.com/a/b/film.mp4", "video"],
    ["https://www.nytimes.com/2026/01/01/x.html", "website"],
    ["not a url", "other"],
  ])("%s → %s", (url, expected) => {
    expect(detectPlatform(url)).toBe(expected);
  });
});

describe("isProbablyUrl / normalizeUrl", () => {
  it("recognises bare domains and full urls", () => {
    expect(isProbablyUrl("nike.com/running")).toBe(true);
    expect(isProbablyUrl("https://x.com/a?b=1")).toBe(true);
    expect(isProbablyUrl("uma ideia para a campanha")).toBe(false);
    expect(isProbablyUrl("brand")).toBe(false);
  });
  it("strips tracking params and hash, adds scheme", () => {
    expect(normalizeUrl("instagram.com/reel/abc/?igsh=xyz&utm_source=ig#top")).toBe("https://instagram.com/reel/abc/");
    expect(normalizeUrl("https://youtu.be/id?si=track&t=10")).toBe("https://youtu.be/id?t=10");
  });
});

describe("youtubeId", () => {
  it.each([
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/abcdefgh123", "abcdefgh123"],
    ["https://www.youtube.com/embed/abcdefgh123", "abcdefgh123"],
  ])("%s", (url, id) => {
    expect(youtubeId(new URL(url))).toBe(id);
  });
});

describe("connectorFor", () => {
  it("routes to the platform connector or falls back to web", () => {
    expect(connectorFor(new URL("https://www.youtube.com/watch?v=x")).platform).toBe("youtube");
    expect(connectorFor(new URL("https://www.tiktok.com/@a/video/1")).platform).toBe("tiktok");
    expect(connectorFor(new URL("https://www.instagram.com/p/x/")).platform).toBe("instagram");
    expect(connectorFor(new URL("https://www.behance.net/gallery/1")).platform).toBe("website");
  });
});

describe("html helpers", () => {
  const html = `<!doctype html><html lang="pt-BR"><head>
    <title>Fallback &amp; Title</title>
    <meta property="og:title" content="Spotify Wrapped 2025" />
    <meta property="og:image" content="/img/wrapped.jpg">
    <meta name="description" content="Your year in music">
    <meta property="og:site_name" content="Spotify">
    <link rel="canonical" href="https://spotify.com/wrapped">
  </head><body><nav>menu</nav><script>var x=1</script><h1>Wrapped</h1><p>Personal data becomes <b>shareable</b> content.</p><footer>f</footer></body></html>`;
  it("extracts OpenGraph meta with absolute urls", () => {
    const meta = extractMeta(html, "https://spotify.com/x/y");
    expect(meta.title).toBe("Spotify Wrapped 2025");
    expect(meta.image).toBe("https://spotify.com/img/wrapped.jpg");
    expect(meta.description).toBe("Your year in music");
    expect(meta.siteName).toBe("Spotify");
    expect(meta.canonical).toBe("https://spotify.com/wrapped");
    expect(meta.language).toBe("pt-BR");
  });
  it("falls back to <title> and decodes entities", () => {
    expect(extractMeta("<title>A &amp; B</title>", "https://a.com").title).toBe("A & B");
  });
  it("extracts readable text without nav/script/footer", () => {
    const text = extractText(html);
    expect(text).toContain("Wrapped");
    expect(text).toContain("Personal data becomes shareable content.");
    expect(text).not.toContain("menu");
    expect(text).not.toContain("var x");
  });
});

describe("tiktokOEmbedTarget", () => {
  it("asks oEmbed for a photo post under /video/ and remembers it is a photo post", () => {
    expect(tiktokOEmbedTarget("https://www.tiktok.com/@anossarota/photo/7670302405119970580?_r=1&_t=ZS")).toEqual({
      target: "https://www.tiktok.com/@anossarota/video/7670302405119970580",
      isPhoto: true,
      canonical: "https://www.tiktok.com/@anossarota/photo/7670302405119970580",
    });
  });
  it("leaves a video post as it is, minus tracking params", () => {
    expect(tiktokOEmbedTarget("https://www.tiktok.com/@nike/video/7255?lang=pt")).toEqual({
      target: "https://www.tiktok.com/@nike/video/7255",
      isPhoto: false,
      canonical: "https://www.tiktok.com/@nike/video/7255",
    });
  });
});

describe("Instagram embed page", () => {
  it("reads the post's picture from the embed image, unescaping the HTML", () => {
    const html = `<img class="EmbeddedMediaImage" alt="Instagram post shared by &#064;x" src="https://scontent.cdninstagram.com/v/a.jpg?stp=1&amp;_nc_cat=1" />`;
    expect(instagramEmbedImage(html)).toBe("https://scontent.cdninstagram.com/v/a.jpg?stp=1&_nc_cat=1");
  });
  it("falls back to display_url inside the page's script, slashes escaped twice", () => {
    const html = String.raw`<script>s.handle("{\"display_url\":\"https:\\\/\\\/scontent.cdninstagram.com\\\/v\\\/b.jpg?x=1\\u0026y=2\",\"is_video\":true}")</script>`;
    expect(instagramEmbedImage(html)).toBe("https://scontent.cdninstagram.com/v/b.jpg?x=1&y=2");
  });
  it("returns null when the page has neither", () => {
    expect(instagramEmbedImage("<html>login</html>")).toBeNull();
  });
  it("finds the shortcode in post, reel and tv URLs", () => {
    expect(instagramShortcode("/reel/DfLCvb7SEB9/")).toBe("DfLCvb7SEB9");
    expect(instagramShortcode("/p/Cx_1-a/")).toBe("Cx_1-a");
    expect(instagramShortcode("/tv/AbC/")).toBe("AbC");
    expect(instagramShortcode("/someprofile/")).toBeNull();
  });
});

describe("TikTok page item", () => {
  const page = (item: unknown) =>
    `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify({ __DEFAULT_SCOPE__: { "webapp.video-detail": { statusCode: 0, itemInfo: { itemStruct: item } } } })}</script></html>`;
  it("reads a video's cover, caption and author", () => {
    const r = tiktokPageItem(page({ desc: "Standing Sushi Bar", author: { uniqueId: "rafbarreiraa", nickname: "RafBarreira" }, video: { cover: "https://p16.tiktokcdn-us.com/c.image", originCover: "https://p16.tiktokcdn-us.com/o.image" } }));
    expect(r).toEqual({ cover: "https://p16.tiktokcdn-us.com/o.image", desc: "Standing Sushi Bar", author: "rafbarreiraa", authorName: "RafBarreira" });
  });
  it("prefers a carousel's own cover picture", () => {
    const r = tiktokPageItem(page({ desc: "Boipeba", author: {}, video: { cover: "https://v.image" }, imagePost: { cover: { imageURL: { urlList: ["https://photo-cover.image"] } }, images: [{ imageURL: { urlList: ["https://photo-1.image"] } }] } }));
    expect(r?.cover).toBe("https://photo-cover.image");
  });
  it("returns null without the rehydration data or the item", () => {
    expect(tiktokPageItem("<html>captcha</html>")).toBeNull();
    expect(tiktokPageItem(`<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">{"__DEFAULT_SCOPE__":{}}</script>`)).toBeNull();
  });
});
