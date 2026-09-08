/** Shared types and key helpers. Lives apart from index.ts so the drivers do not import their own barrel. */
import { withBase } from "../../lib/base-path";

export type StoredObject = { data: Buffer; mime: string };
export type PutResult = { key: string; url: string };

export interface Storage {
  /** Writes (or overwrites) an object and returns the key plus the URL to render it. */
  put(key: string, data: Buffer, mime: string): Promise<PutResult>;
  /** Reads an object back, or null when the key is unknown. */
  get(key: string): Promise<StoredObject | null>;
  /** Removes an object. Missing keys are not an error. */
  delete(key: string): Promise<void>;
  /** Public URL for a key, without touching the network. */
  url(key: string): string;
}

/** Keys are built from these, and `get` maps them back to a content type. */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/json": "json",
};

const EXT_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]),
);

/** File extension for a content type, e.g. "image/jpeg" → "jpg". Never returns an empty string. */
export function extensionFor(mime: string): string {
  const base = mime.split(";")[0]!.trim().toLowerCase();
  if (MIME_TO_EXT[base]) return MIME_TO_EXT[base];
  const subtype = base.split("/")[1]?.replace(/[^a-z0-9]/g, "");
  return subtype || "bin";
}

/** Inverse of `extensionFor`, used to serve a stored object with the right content type. */
export function mimeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

/** Path served by the app itself; also the fallback when an S3 bucket has no public URL. */
export function mediaPath(key: string): string {
  return withBase(`/api/media/${key}`);
}
