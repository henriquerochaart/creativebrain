import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { collectionsOfReference, deleteReference, getReference, toPublic, updateReference } from "@/server/references";

export const runtime = "nodejs";
type P = { id: string };

export const GET = withAuth<P>(async (_req, { params }) => {
  const ref = await getReference(params.id);
  if (!ref) return bad("Not found", 404);
  const collections = await collectionsOfReference(ref.id);
  return Response.json({ reference: toPublic(ref), collections });
});

export const PATCH = withAuth<P>(async (req: NextRequest, { params }) => {
  const body = await readJson<{ saved?: boolean; userNote?: string | null; title?: string; tags?: string[]; subjects?: string[]; formats?: string[]; principles?: string[] }>(req);
  const ref = await updateReference(params.id, body);
  if (!ref) return bad("Not found", 404);
  return Response.json({ reference: toPublic(ref) });
});

export const DELETE = withAuth<P>(async (_req, { params }) => {
  const ok = await deleteReference(params.id);
  return ok ? new Response(null, { status: 204 }) : bad("Not found", 404);
});
