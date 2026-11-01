/**
 * Vercel Blob driver. Objects are public, at fixed pathnames (no random suffix), so a key always
 * maps to the same blob and a re-ingest overwrites in place. That matches what /api/media already
 * exposes: every thumbnail is embedded in public pages.
 *
 * `url` stays the app's own /api/media path, so what the database records does not depend on the
 * driver; the route then redirects to the blob's CDN URL via `locate`.
 */
import { BlobNotFoundError, del, head, put } from "@vercel/blob";
import type { PutResult, Storage, StoredObject } from "./common";
import { mediaPath, mimeForKey } from "./common";

export class BlobStorage implements Storage {
  constructor(private readonly token: string) {}

  async put(key: string, data: Buffer, mime: string): Promise<PutResult> {
    await put(key, data, { access: "public", contentType: mime, addRandomSuffix: false, allowOverwrite: true, token: this.token });
    return { key, url: this.url(key) };
  }

  async locate(key: string): Promise<string | null> {
    try {
      return (await head(key, { token: this.token })).url;
    } catch (err) {
      if (err instanceof BlobNotFoundError) return null;
      throw err;
    }
  }

  /** For the pipeline, which needs the bytes (a stored video to transcribe, say). Pages use `locate`. */
  async get(key: string): Promise<StoredObject | null> {
    const url = await this.locate(key);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return { data: Buffer.from(await res.arrayBuffer()), mime: res.headers.get("content-type") || mimeForKey(key) };
  }

  async delete(key: string): Promise<void> {
    try {
      await del(key, { token: this.token });
    } catch (err) {
      if (!(err instanceof BlobNotFoundError)) throw err;
    }
  }

  url(key: string): string {
    return mediaPath(key);
  }
}
