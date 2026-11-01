import { NextRequest } from "next/server";
import { withAuth, bad } from "@/server/http";
import { getReference, toPublic } from "@/server/references";
import { refreshThumbnail } from "@/server/pipeline/thumbnail";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * POST /api/references/:id/thumbnail — put the reference's own thumbnail back into storage.
 * No body: ask the platform again for the post's current picture. Multipart `file`: store that
 * picture (fetched from the post by someone who can reach it). `?force=1` replaces one already
 * stored. The understanding is never touched. 200 stored or kept, 422 when no picture came back.
 */
export const POST = withAuth<{ id: string }>(async (req: NextRequest, { params }) => {
  const ref = await getReference(params.id);
  if (!ref) return bad("Not found", 404);
  let image: { data: Buffer; mime: string } | undefined;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return bad("Multipart body without a `file` field");
    if (!file.type.startsWith("image/")) return bad(`Not an image: ${file.type || "unknown type"}`);
    if (file.size > MAX_BYTES) return bad("Image larger than 5 MB");
    image = { data: Buffer.from(await file.arrayBuffer()), mime: file.type };
  }
  const result = await refreshThumbnail(ref, { image, force: req.nextUrl.searchParams.get("force") === "1" });
  return Response.json({ status: result.status, reason: result.reason ?? null, reference: toPublic(result.reference) }, { status: result.status === "failed" ? 422 : 200 });
});
