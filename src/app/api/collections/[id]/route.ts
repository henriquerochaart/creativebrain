import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { collectionReferences, deleteCollection, getCollection, toPublic, updateCollection } from "@/server/references";

export const runtime = "nodejs";
type P = { id: string };

export const GET = withAuth<P>(async (_req, { params }) => {
  const collection = await getCollection(params.id);
  if (!collection) return bad("Not found", 404);
  const refs = await collectionReferences(collection.id);
  return Response.json({ collection, references: refs.map(toPublic) });
});

export const PATCH = withAuth<P>(async (req: NextRequest, { params }) => {
  const collection = await getCollection(params.id);
  if (!collection) return bad("Not found", 404);
  const body = await readJson<{ name?: string; emoji?: string | null; description?: string | null; position?: number }>(req);
  return Response.json({ collection: await updateCollection(collection.id, body) });
});

export const DELETE = withAuth<P>(async (_req, { params }) => {
  const collection = await getCollection(params.id);
  if (!collection) return bad("Not found", 404);
  await deleteCollection(collection.id);
  return new Response(null, { status: 204 });
});
