import { NextRequest } from "next/server";
import { parseBody, moodboardBody } from "@/server/validate";
import { withAuth, bad } from "@/server/http";
import { generateMoodboard, listBoards } from "@/server/creative";
import { getLang } from "@/server/lang";

export const runtime = "nodejs";
export const maxDuration = 120;
export const GET = withAuth(async () => Response.json({ boards: await listBoards() }));
/** POST /api/moodboards { brief } — "Monte um moodboard para uma campanha de moda futurista." */
export const POST = withAuth(async (req: NextRequest) => {
  const parsed = await parseBody(req, moodboardBody);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.brief?.trim()) return bad("`brief` is required");
  return Response.json(await generateMoodboard(body.brief.trim(), await getLang()), { status: 201 });
});
