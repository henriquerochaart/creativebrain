import { NextRequest } from "next/server";
import { inArray } from "drizzle-orm";
import { withAuth, bad, readJson } from "@/server/http";
import { db } from "@/server/db/client";
import { references } from "@/server/db/schema";
import { whyTheseReferences } from "@/server/search/explain";

export const runtime = "nodejs";

/** POST /api/search/explain { query, ids[] } — "Why these references?" */
export const POST = withAuth(async (req: NextRequest) => {
  const body = await readJson<{ query?: string; ids?: string[] }>(req);
  if (!body.query || !body.ids?.length) return bad("`query` and `ids` are required");
  const rows = await db.select().from(references).where(inArray(references.id, body.ids.slice(0, 16)));
  const ordered = body.ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => Boolean(r));
  const why = await whyTheseReferences(body.query, ordered);
  return Response.json(why);
});
