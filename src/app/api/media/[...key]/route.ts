import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { references } from "@/server/db/schema";
import { getStorage } from "@/server/storage";
import { getReference } from "@/server/references";
import { NotSignedIn } from "@/server/tenant";

export const runtime = "nodejs";

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * Serves stored media (local driver, S3 without a public URL) or redirects to it (Vercel Blob),
 * only to the account whose library the reference is in: every key is references/<id>/…, and the
 * reference must be the signed-in account's. Cached privately, per browser, so a shared cache can
 * never hand one account's picture to another.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  // Next decodes each segment, so "..%2F" arrives as "../" inside one: every segment must be a plain
  // file or folder name, or the path could step out of the reference it names.
  if (!key.every((seg) => SAFE_SEGMENT.test(seg) && seg !== "." && seg !== "..")) return new Response("Not found", { status: 404 });
  const path = key.join("/");
  const id = /^references\/([0-9a-fA-F-]{36})\/[^/]+$/.exec(path)?.[1];
  try {
    if (!id || !(await getReference(id))) return new Response("Not found", { status: 404 });
  } catch (err) {
    if (err instanceof NotSignedIn) return new Response("Unauthorized", { status: 401 });
    throw err;
  }

  const storage = getStorage();
  // A driver with its own CDN (Vercel Blob): send the browser there. The browser keeps the redirect
  // for a day, so a page full of thumbnails does not cost a lookup per image per view.
  if (storage.locate) {
    const direct = await storage.locate(path);
    if (direct) return new Response(null, { status: 302, headers: { location: direct, "cache-control": "private, max-age=86400" } });
  }

  const obj = storage.locate ? null : await storage.get(path);
  if (obj) {
    return new Response(new Uint8Array(obj.data), {
      headers: {
        "content-type": obj.mime,
        "cache-control": "private, max-age=31536000, immutable",
        "content-length": String(obj.data.length),
        "x-content-type-options": "nosniff",
        // Opened on its own, an uploaded file must not run as a page of the app (an SVG with a
        // script, an HTML file). PDFs keep the browser's viewer, which a sandbox would block.
        ...(obj.mime === "application/pdf" ? {} : { "content-security-policy": "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'" }),
      },
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
