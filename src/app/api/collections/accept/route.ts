import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { acceptProposal } from "@/server/creative";
export const runtime = "nodejs";
export const POST = withAuth(async (req: NextRequest) => {
  const body = await readJson<{ name?: string; emoji?: string; rationale?: string; referenceIds?: string[] }>(req);
  if (!body.name || !body.referenceIds?.length) return bad("`name` and `referenceIds` are required");
  return Response.json({ collection: await acceptProposal({ name: body.name, emoji: body.emoji, rationale: body.rationale, referenceIds: body.referenceIds }) }, { status: 201 });
});
