import { NextRequest } from "next/server";
import { parseBody, collectionPatch } from "@/server/validate";
import { withAuth, bad } from "@/server/http";
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
  const parsed = await parseBody(req, collectionPatch);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  return Response.json({ collection: await updateCollection(collection.id, body) });
});

export const DELETE = withAuth<P>(async (_req, { params }) => {
  const collection = await getCollection(params.id);
  if (!collection) return bad("Not found", 404);
  await deleteCollection(collection.id);
  return new Response(null, { status: 204 });
});
