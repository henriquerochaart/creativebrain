import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { addReferenceToProject, getProject, removeReferenceFromProject } from "@/server/projects";
import { getReference } from "@/server/references";
export const runtime = "nodejs";
type P = { id: string };
export const POST = withAuth<P>(async (req: NextRequest, { params }) => {
  const project = await getProject(params.id);
  if (!project) return bad("Project not found", 404);
  const body = await readJson<{ referenceId?: string; note?: string }>(req);
  if (!body.referenceId || !(await getReference(body.referenceId))) return bad("Reference not found", 404);
  await addReferenceToProject(project.id, body.referenceId, body.note);
  return Response.json({ ok: true });
});
export const DELETE = withAuth<P>(async (req: NextRequest, { params }) => {
  const project = await getProject(params.id);
  if (!project) return bad("Project not found", 404);
  const referenceId = req.nextUrl.searchParams.get("referenceId");
  if (!referenceId) return bad("`referenceId` is required");
  await removeReferenceFromProject(project.id, referenceId);
  return new Response(null, { status: 204 });
});
