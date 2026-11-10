import { withAuth, bad } from "@/server/http";
import { useQuota } from "@/server/limits";
import { analyzeProject, getProject } from "@/server/projects";
import { getLang } from "@/server/lang";

export const runtime = "nodejs";
export const maxDuration = 180;

/** POST /api/projects/:id/analyze — references → concepts → patterns → directions → ideas. */
export const POST = withAuth<{ id: string }>(async (_req, { params }) => {
  await useQuota("ai");
  const project = await getProject(params.id);
  if (!project) return bad("Not found", 404);
  return Response.json(await analyzeProject(project, await getLang()));
});
