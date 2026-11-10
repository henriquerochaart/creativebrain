import { NextRequest } from "next/server";
import { parseBody, collectionAccept } from "@/server/validate";
import { withAuth, bad } from "@/server/http";
import { acceptProposal } from "@/server/creative";
export const runtime = "nodejs";
export const POST = withAuth(async (req: NextRequest) => {
  const parsed = await parseBody(req, collectionAccept);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.name || !body.referenceIds?.length) return bad("`name` and `referenceIds` are required");
  return Response.json({ collection: await acceptProposal({ name: body.name, emoji: body.emoji, rationale: body.rationale, referenceIds: body.referenceIds ?? [] }) }, { status: 201 });
});
