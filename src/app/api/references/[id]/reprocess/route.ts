import { withAuth, bad } from "@/server/http";
import { getReference, reprocessReference } from "@/server/references";

export const runtime = "nodejs";

export const POST = withAuth<{ id: string }>(async (_req, { params }) => {
  const ref = await getReference(params.id);
  if (!ref) return bad("Not found", 404);
  const { mode } = await reprocessReference(ref.id);
  return Response.json({ ok: true, mode });
});
