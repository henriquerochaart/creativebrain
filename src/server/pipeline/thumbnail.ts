import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { references, type Reference } from "../db/schema";
import { resolveUrl } from "../connectors";
import { extensionFor, getStorage, mediaPath } from "../storage";
import { downloadFile } from "./media";
import { MAX_IMAGE_BYTES } from "./ingest";

export type ThumbnailResult = { status: "stored" | "kept" | "failed"; reason?: string; reference: Reference };

/**
 * Puts a reference's own thumbnail back into storage, without touching its understanding. For
 * thumbnails lost to an ephemeral disk, whose fallback (the platform's signed CDN URL) has since
 * expired: the platform is asked again for the post's current picture, which is stored for good.
 *
 * `image` stores a picture someone else already fetched from the post itself (an agent that can
 * reach a platform the server cannot). It must be the material's own picture, never a stand-in.
 * Without `force`, a thumbnail already in storage is kept.
 */
export async function refreshThumbnail(ref: Reference, opts: { image?: { data: Buffer; mime: string }; force?: boolean } = {}): Promise<ThumbnailResult> {
  const storage = getStorage();
  const currentKey = storedKey(ref);
  if (!opts.force && !opts.image && currentKey && (await exists(currentKey))) return { status: "kept", reference: ref };

  let image = opts.image ?? null;
  let source: string | null = null;
  if (!image) {
    if (!ref.originalUrl) return { status: "failed", reason: "No original URL to ask the platform with", reference: ref };
    const resolved = await resolveUrl(ref.originalUrl);
    if (!resolved.thumbnailUrl) return { status: "failed", reason: resolved.warnings?.join("; ") || "The platform returned no picture", reference: ref };
    image = await downloadFile(resolved.thumbnailUrl, MAX_IMAGE_BYTES);
    source = resolved.thumbnailUrl;
  }
  if (!image || !image.mime.startsWith("image/")) return { status: "failed", reason: "The picture could not be downloaded", reference: ref };

  const stored = await storage.put(`references/${ref.id}/thumbnail.${extensionFor(image.mime)}`, image.data, image.mime);
  const metadata = { ...ref.metadata, ...(source ? { sourceThumbnailUrl: source } : {}) };
  const [updated] = await db.update(references).set({ thumbnailUrl: stored.url, metadata, updatedAt: new Date() }).where(eq(references.id, ref.id)).returning();
  return { status: "stored", reference: updated };

  async function exists(key: string): Promise<boolean> {
    if (storage.locate) return (await storage.locate(key)) !== null;
    return (await storage.get(key)) !== null;
  }
}

/** The storage key behind a thumbnail URL we serve ourselves (/api/media/<key>), or null for an outside URL. */
function storedKey(ref: Reference): string | null {
  const url = ref.thumbnailUrl;
  if (!url) return null;
  const prefix = mediaPath("");
  const i = url.indexOf(prefix);
  return i >= 0 ? url.slice(i + prefix.length) || null : null;
}
