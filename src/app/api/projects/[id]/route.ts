import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { deleteProject, getProject, projectReferenceList, updateProject } from "@/server/projects";
export const runtime = "nodejs";
type P = { id: string };
export const GET = withAuth<P>(async (_req, { params }) => {
  const project = await getProject(params.id);
  if (!project) return bad("Not found", 404);
  return Response.json({ project, references: await projectReferenceList(project.id) });
});
export const PATCH = withAuth<P>(async (req: NextRequest, { params }) => {
  const project = await getProject(params.id);
  if (!project) return bad("Not found", 404);
  const body = await readJson<{ name?: string; brief?: string | null; status?: string }>(req);
  return Response.json({ project: await updateProject(project.id, body) });
});
export const DELETE = withAuth<P>(async (_req, { params }) => {
  const project = await getProject(params.id);
  if (!project) return bad("Not found", 404);
  await deleteProject(project.id);
  return new Response(null, { status: 204 });
});
