import { withAuth, bad } from "@/server/http";
import { getReference, reprocessReference } from "@/server/references";

export const runtime = "nodejs";
// Inline processing runs in `after()`; the function must live long enough to understand a video.
export const maxDuration = 300;

export const POST = withAuth<{ id: string }>(async (_req, { params }) => {
  const ref = await getReference(params.id);
  if (!ref) return bad("Not found", 404);
  const { mode } = await reprocessReference(ref.id);
  return Response.json({ ok: true, mode });
});
