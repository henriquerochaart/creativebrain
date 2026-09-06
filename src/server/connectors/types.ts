import type { MediaType, Platform } from "../taxonomy";
import type { ReferenceMetadata } from "../db/schema";

/**
 * What a connector learns about a URL, within the platform's public APIs and terms.
 * If media cannot be retrieved, the connector still returns URL, metadata and thumbnail.
 */
export interface ConnectorResult {
  platform: Platform;
  mediaType: MediaType;
  canonicalUrl: string;
  metadata: ReferenceMetadata;
  thumbnailUrl?: string | null;
  /** Direct URL to a media file (image/video/pdf) that may be downloaded. */
  mediaUrl?: string | null;
  mediaMime?: string | null;
  /** Readable page text for websites / articles. */
  pageText?: string | null;
  /** Description/caption text from the platform. */
  description?: string | null;
  /** True when this platform's media can be fetched with the configured fetcher (yt-dlp). */
  fetchableWithMediaFetcher?: boolean;
  warnings?: string[];
}

export interface Connector {
  readonly platform: Platform;
  matches(url: URL): boolean;
  fetch(url: URL): Promise<ConnectorResult>;
}

export const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 HenriqueBrain/0.1",
  accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "accept-language": "en,pt-BR;q=0.9,pt;q=0.8",
};

export async function fetchWithTimeout(input: string, init: RequestInit = {}, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, headers: { ...DEFAULT_HEADERS, ...(init.headers ?? {}) }, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}
