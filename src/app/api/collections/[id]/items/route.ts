import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { addToCollection, getCollection, getReference, removeFromCollection } from "@/server/references";
import { recordEvent } from "@/server/insights";

export const runtime = "nodejs";
type P = { id: string };

export const POST = withAuth<P>(async (req: NextRequest, { params }) => {
  const collection = await getCollection(params.id);
  if (!collection) return bad("Collection not found", 404);
  const body = await readJson<{ referenceId?: string }>(req);
  if (!body.referenceId || !(await getReference(body.referenceId))) return bad("Reference not found", 404);
  await addToCollection(collection.id, body.referenceId);
  await recordEvent(body.referenceId, "collect");
  return Response.json({ ok: true });
});

export const DELETE = withAuth<P>(async (req: NextRequest, { params }) => {
  const collection = await getCollection(params.id);
  if (!collection) return bad("Collection not found", 404);
  const referenceId = req.nextUrl.searchParams.get("referenceId") ?? (await readJson<{ referenceId?: string }>(req).catch(() => ({ referenceId: undefined }))).referenceId;
  if (!referenceId) return bad("`referenceId` is required");
  await removeFromCollection(collection.id, referenceId);
  return new Response(null, { status: 204 });
});
