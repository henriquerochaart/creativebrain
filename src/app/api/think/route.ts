import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { search } from "@/server/search";
import { think } from "@/server/search/explain";
import { toPublic } from "@/server/references";
import { db } from "@/server/db/client";
import { conversations } from "@/server/db/schema";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST /api/think { query, history? } — conversational retrieval over the whole repertoire. */
export const POST = withAuth(async (req: NextRequest) => {
  const body = await readJson<{ query?: string; history?: { role: "user" | "assistant"; content: string }[] }>(req);
  if (!body.query?.trim()) return bad("`query` is required");
  const result = await search(body.query, { mode: "hybrid", limit: 40 });
  const refs = result.hits.map((h) => h.reference);
  const analysis = await think(body.query, refs, body.history?.slice(-8));
  const byId = new Map(refs.map((r) => [r.id, toPublic(r)]));
  await db.insert(conversations).values({ mode: "think", question: body.query, answer: analysis.intro, payload: analysis as unknown as Record<string, unknown> });
  return Response.json({
    query: body.query,
    found: refs.length,
    degraded: result.degraded,
    analysis,
    references: Object.fromEntries(byId),
  });
});
