import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { getLLM } from "@/server/ai/router";
import { ImageQuerySchema } from "@/server/ai/schemas";
import { IMAGE_QUERY_SYSTEM } from "@/server/ai/prompts";
import { embedQuery } from "@/server/pipeline/embed";
import { search } from "@/server/search";
import { toPublic } from "@/server/references";
import { downloadFile } from "@/server/pipeline/media";

export const runtime = "nodejs";

/**
 * POST /api/visual-search — multipart `image` or JSON { imageUrl } (or { referenceId } to search by an existing reference's look).
 * The image is described by the vision model, embedded, and matched against the visual embedding of every reference.
 */
export const POST = withAuth(async (req: NextRequest) => {
  let image: { mime: string; data: Buffer } | null = null;
  const ctype = req.headers.get("content-type") ?? "";
  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    const f = form.get("image");
    if (f instanceof File) image = { mime: f.type || "image/jpeg", data: Buffer.from(await f.arrayBuffer()) };
  } else {
    const body = await readJson<{ imageUrl?: string }>(req);
    if (body.imageUrl) image = await downloadFile(body.imageUrl, 8 * 1024 * 1024);
  }
  if (!image || !image.mime.startsWith("image/")) return bad("Provide an `image` file or an `imageUrl`");

  const described = await getLLM().analyze({
    system: IMAGE_QUERY_SYSTEM,
    prompt: "Describe this image as a search query.",
    images: [image],
    schema: ImageQuerySchema,
    schemaName: "image_query",
  });
  const queryText = `${described.description}\nTags: ${described.tags.join(", ")}`;
  const vec = await embedQuery(queryText);
  const result = await search(queryText, { mode: "visual", queryVector: vec, limit: 40 });
  return Response.json({
    description: described,
    hits: result.hits.map((h) => ({ reference: toPublic(h.reference), score: h.score })),
  });
});
