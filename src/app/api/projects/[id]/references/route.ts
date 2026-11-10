import { NextRequest } from "next/server";
import { parseBody, referenceIdBody } from "@/server/validate";
import { withAuth, bad } from "@/server/http";
import { addReferenceToProject, getProject, removeReferenceFromProject } from "@/server/projects";
import { getReference } from "@/server/references";
export const runtime = "nodejs";
type P = { id: string };
export const POST = withAuth<P>(async (req: NextRequest, { params }) => {
  const project = await getProject(params.id);
  if (!project) return bad("Project not found", 404);
  const parsed = await parseBody(req, referenceIdBody);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
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
