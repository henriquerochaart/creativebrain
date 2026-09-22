import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { references } from "@/server/db/schema";
import { getStorage } from "@/server/storage";

export const runtime = "nodejs";

/** Serves stored media (local driver, or S3 without a public URL). Public: thumbnails are embedded in pages. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const path = key.join("/");

  const obj = await getStorage().get(path);
  if (obj) {
    return new Response(new Uint8Array(obj.data), {
      headers: { "content-type": obj.mime, "cache-control": "public, max-age=31536000, immutable", "content-length": String(obj.data.length) },
    });
  }

  // The object is gone: an ephemeral disk between deployments, a bucket that was emptied, a driver
  // switched after ingestion. Send the reader to the platform's own thumbnail rather than a hole in
  // the grid. Those URLs expire, which is why we persist a copy in the first place — this is the
  // degraded path, not the intended one.
  const origin = await sourceThumbnail(path);
  if (origin) return Response.redirect(origin, 302);

  return new Response("Not found", { status: 404 });
}

/** Only our own keys resolve, and only to an http(s) URL the connector recorded at ingestion. */
async function sourceThumbnail(path: string): Promise<string | null> {
  const id = /^references\/([0-9a-fA-F-]{36})\//.exec(path)?.[1];
  if (!id) return null;

  const [row] = await db.select({ metadata: references.metadata }).from(references).where(eq(references.id, id));
  const url = row?.metadata?.sourceThumbnailUrl;
  if (typeof url !== "string") return null;

  try {
    return ["http:", "https:"].includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}
