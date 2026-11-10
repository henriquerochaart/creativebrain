import { NextRequest } from "next/server";
import { parseBody, collectionCreate } from "@/server/validate";
import { withAuth, bad } from "@/server/http";
import { createCollection, listCollections } from "@/server/references";

export const runtime = "nodejs";

export const GET = withAuth(async () => Response.json({ collections: await listCollections() }));

export const POST = withAuth(async (req: NextRequest) => {
  const parsed = await parseBody(req, collectionCreate);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.name?.trim()) return bad("`name` is required");
  return Response.json({ collection: await createCollection(body) }, { status: 201 });
});
