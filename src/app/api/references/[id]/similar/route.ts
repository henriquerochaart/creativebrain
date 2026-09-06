import { withAuth, bad } from "@/server/http";
import { getReference, relatedReferences, similarReferences } from "@/server/references";

export const runtime = "nodejs";

/** GET /api/references/:id/similar — visual, conceptual, strategic and execution similarity. */
export const GET = withAuth<{ id: string }>(async (req, { params }) => {
  const ref = await getReference(params.id);
  if (!ref) return bad("Not found", 404);
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 6), 20);
  const [byKind, related] = await Promise.all([similarReferences(ref.id, limit), relatedReferences(ref.id, limit)]);
  return Response.json({ byKind, related });
});
