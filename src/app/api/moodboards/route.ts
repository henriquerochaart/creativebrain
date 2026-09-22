import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { generateMoodboard, listBoards } from "@/server/creative";
import { getLang } from "@/server/lang";

export const runtime = "nodejs";
export const maxDuration = 120;
export const GET = withAuth(async () => Response.json({ boards: await listBoards() }));
/** POST /api/moodboards { brief } — "Monte um moodboard para uma campanha de moda futurista." */
export const POST = withAuth(async (req: NextRequest) => {
  const body = await readJson<{ brief?: string }>(req);
  if (!body.brief?.trim()) return bad("`brief` is required");
  return Response.json(await generateMoodboard(body.brief.trim(), await getLang()), { status: 201 });
});
