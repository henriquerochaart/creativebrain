import { NextRequest } from "next/server";
import { parseBody, assistBody } from "@/server/validate";
import { withAuth, bad, textStream } from "@/server/http";
import { assistContext, assistStream, saveAssistConversation } from "@/server/creative";
export const runtime = "nodejs";
export const maxDuration = 180;
/** POST /api/assist { idea, history? } — "Use my repertoire to develop this idea." Streams markdown; reference ids in the X-References header. */
export const POST = withAuth(async (req: NextRequest) => {
  const parsed = await parseBody(req, assistBody);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.idea?.trim()) return bad("`idea` is required");
  const ctx = await assistContext(body.idea);
  const res = textStream(assistStream(body.idea, body.history ?? [], ctx.system), (answer) => saveAssistConversation(body.idea!, answer, ctx.refs.map((r) => r.id)));
  res.headers.set("x-references", ctx.refs.map((r) => r.id).join(","));
  if (ctx.degraded) res.headers.set("x-degraded", ctx.degraded);
  return res;
});
