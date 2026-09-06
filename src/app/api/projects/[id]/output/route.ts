import { withAuth, bad } from "@/server/http";
import { getProject, projectMarkdown, projectReferenceList, type StoredAnalysis } from "@/server/projects";
export const runtime = "nodejs";
/** GET /api/projects/:id/output — the whole process as markdown. */
export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  const project = await getProject(params.id);
  if (!project) return bad("Not found", 404);
  const refs = await projectReferenceList(project.id);
  const stored = project.analyzedAt ? (project.analysis as unknown as StoredAnalysis) : null;
  return new Response(projectMarkdown(project, refs, stored), { headers: { "content-type": "text/markdown; charset=utf-8" } });
});
