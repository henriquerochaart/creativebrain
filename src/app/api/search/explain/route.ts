import { NextRequest } from "next/server";
import { LIST_COLUMNS } from "@/server/db/columns";
import { useQuota } from "@/server/limits";
import { parseBody, explainBody } from "@/server/validate";
import { and, eq, inArray } from "drizzle-orm";
import { withAuth, bad } from "@/server/http";
import { db } from "@/server/db/client";
import { references } from "@/server/db/schema";
import { userId } from "@/server/tenant";
import { whyTheseReferences } from "@/server/search/explain";

import { getLang } from "@/server/lang";

export const runtime = "nodejs";

/** POST /api/search/explain { query, ids[] } — "Why these references?" */
export const POST = withAuth(async (req: NextRequest) => {
  await useQuota("ai");
  const parsed = await parseBody(req, explainBody);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.query || !body.ids?.length) return bad("`query` and `ids` are required");
  const rows = await db.select(LIST_COLUMNS).from(references).where(and(inArray(references.id, body.ids.slice(0, 16)), eq(references.userId, await userId())));
  const ordered = body.ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => Boolean(r));
  const why = await whyTheseReferences(body.query, ordered, await getLang());
  return Response.json(why);
});
