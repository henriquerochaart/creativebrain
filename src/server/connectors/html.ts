/** Tiny dependency-free HTML helpers: OpenGraph/meta extraction and readable text. */

export type PageMeta = {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  author?: string;
  publishedAt?: string;
  canonical?: string;
  type?: string;
  video?: string;
  language?: string;
};

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function extractMeta(html: string, baseUrl: string): PageMeta {
  const meta: Record<string, string> = {};
  const tagRe = /<meta\s+[^>]*>/gi;
  for (const tag of html.match(tagRe) ?? []) {
    const name = /(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (name && content !== undefined && !(name in meta)) meta[name] = decode(content);
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const canonical = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1];
  const lang = /<html[^>]+lang=["']([^"']+)["']/i.exec(html)?.[1];
  const abs = (u?: string) => {
    if (!u) return undefined;
    try {
      return new URL(u, baseUrl).toString();
    } catch {
      return undefined;
    }
  };
  return {
    title: meta["og:title"] ?? meta["twitter:title"] ?? (titleTag ? decode(titleTag.trim()) : undefined),
    description: meta["og:description"] ?? meta["twitter:description"] ?? meta["description"],
    image: abs(meta["og:image"] ?? meta["og:image:secure_url"] ?? meta["twitter:image"] ?? meta["twitter:image:src"]),
    siteName: meta["og:site_name"] ?? meta["application-name"],
    author: meta["author"] ?? meta["article:author"] ?? meta["twitter:creator"],
    publishedAt: meta["article:published_time"] ?? meta["og:updated_time"] ?? meta["date"],
    canonical: abs(canonical ?? meta["og:url"]),
    type: meta["og:type"],
    video: abs(meta["og:video"] ?? meta["og:video:url"] ?? meta["og:video:secure_url"]),
    language: lang,
  };
}

/** Strips scripts/styles/nav noise and returns readable text, collapsed. */
export function extractText(html: string, maxChars = 60000): string {
  let body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decode(body)
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}
