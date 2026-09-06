import { withAuth, bad } from "@/server/http";
import { analyzeProject, getProject } from "@/server/projects";
export const runtime = "nodejs";
export const maxDuration = 180;
/** POST /api/projects/:id/analyze — references → concepts → patterns → directions → ideas. */
export const POST = withAuth<{ id: string }>(async (_req, { params }) => {
  const project = await getProject(params.id);
  if (!project) return bad("Not found", 404);
  return Response.json(await analyzeProject(project));
});
