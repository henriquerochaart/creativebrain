import { NextRequest } from "next/server";
import { getStorage } from "@/server/storage";

export const runtime = "nodejs";

/** Serves stored media (local driver, or S3 without a public URL). Public: thumbnails are embedded in pages. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const obj = await getStorage().get(key.join("/"));
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(obj.data), {
    headers: { "content-type": obj.mime, "cache-control": "public, max-age=31536000, immutable", "content-length": String(obj.data.length) },
  });
}
