import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { getReference, toPublic } from "@/server/references";
import { UnderstandingSchema } from "@/server/ai/schemas";
import { processReference } from "@/server/pipeline/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/references/:id/understanding { understanding, model }
 *
 * Accepts an understanding written outside the app's own model call — an agent that read the
 * material itself — validated against the same schema the model is held to. Every other step still
 * runs here (resolve, metadata, thumbnail, embeddings, relations), so the reference ends up exactly
 * as if the pipeline had produced it. Synchronous: the caller gets the finished reference back,
 * 200 when understood, 422 when a later step (embeddings, say) failed it.
 */
export const POST = withAuth<{ id: string }>(async (req: NextRequest, { params }) => {
  const ref = await getReference(params.id);
  if (!ref) return bad("Not found", 404);
  const body = await readJson<{ understanding?: unknown; model?: string }>(req);
  const parsed = UnderstandingSchema.safeParse(body.understanding);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return bad(`Invalid understanding — ${issues.join("; ")}`);
  }
  const model = body.model?.trim().slice(0, 80) || "external";
  const done = await processReference(ref.id, { understanding: parsed.data, model });
  return Response.json({ reference: toPublic(done) }, { status: done.status === "understood" ? 200 : 422 });
});
