/**
 * Object storage for reference media: originals, thumbnails and extracted frames.
 *
 * Three drivers behind one interface. `local` writes to a directory and serves through
 * /api/media — fine for a single long-lived box, useless on serverless where the disk is
 * recreated on every deploy. `s3` targets any S3-compatible bucket (AWS S3, Cloudflare R2).
 * `blob` is Vercel Blob, the plainest choice when the app itself runs on Vercel. Either of the
 * last two persists there; `local` does not, and thumbnails then fall back to the platforms'
 * own URLs, which expire within weeks.
 */
import { env } from "../env";
import type { Storage } from "./common";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import { BlobStorage } from "./blob";

export type { PutResult, Storage, StoredObject } from "./common";
export { extensionFor, mediaPath, mimeForKey } from "./common";

declare global {
  // eslint-disable-next-line no-var
  var __brainStorage: Storage | undefined;
}

/**
 * One driver per process. Misconfiguration throws here rather than at the first upload, so a
 * bucket that was never filled in fails loudly on boot instead of silently losing files.
 */
export function getStorage(): Storage {
  if (globalThis.__brainStorage) return globalThis.__brainStorage;

  if (env.storage.driver === "s3") {
    const { bucket, accessKeyId, secretAccessKey } = env.storage.s3;
    const missing = [
      !bucket && "S3_BUCKET",
      !accessKeyId && "S3_ACCESS_KEY_ID",
      !secretAccessKey && "S3_SECRET_ACCESS_KEY",
    ].filter(Boolean);
    if (missing.length) {
      throw new Error(`STORAGE_DRIVER=s3 but ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} not set.`);
    }
    globalThis.__brainStorage = new S3Storage(env.storage.s3);
  } else if (env.storage.driver === "blob") {
    if (!env.storage.blobToken) throw new Error("STORAGE_DRIVER=blob but BLOB_READ_WRITE_TOKEN is not set. Connect a Blob store to the project.");
    globalThis.__brainStorage = new BlobStorage(env.storage.blobToken);
  } else {
    globalThis.__brainStorage = new LocalStorage(env.storage.localDir);
  }

  return globalThis.__brainStorage;
}
