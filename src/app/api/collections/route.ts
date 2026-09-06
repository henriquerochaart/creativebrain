import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { createCollection, listCollections } from "@/server/references";

export const runtime = "nodejs";

export const GET = withAuth(async () => Response.json({ collections: await listCollections() }));

export const POST = withAuth(async (req: NextRequest) => {
  const body = await readJson<{ name?: string; emoji?: string; description?: string }>(req);
  if (!body.name?.trim()) return bad("`name` is required");
  return Response.json({ collection: await createCollection(body as { name: string; emoji?: string; description?: string }) }, { status: 201 });
});
