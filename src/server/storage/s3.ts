/**
 * S3-compatible driver (AWS S3, Cloudflare R2). Path-style addressing is forced because R2
 * and most self-hosted gateways do not serve virtual-host style buckets.
 */
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { PutResult, Storage, StoredObject } from "./common";
import { mediaPath, mimeForKey } from "./common";

type S3Config = {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

export class S3Storage implements Storage {
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      region: config.region || "auto",
      endpoint: config.endpoint || undefined,
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(key: string, data: Buffer, mime: string): Promise<PutResult> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: data, ContentType: mime }),
    );
    return { key, url: this.url(key) };
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return { data: Buffer.from(bytes), mime: res.ContentType || mimeForKey(key) };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }

  /** With a public bucket the browser hits the CDN directly; without one we proxy via /api/media. */
  url(key: string): string {
    return this.config.publicUrl ? `${this.config.publicUrl}/${key}` : mediaPath(key);
  }
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NoSuchKey" || e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404;
}
