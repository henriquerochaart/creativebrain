import { NextRequest } from "next/server";
import { parseBody, projectCreate } from "@/server/validate";
import { withAuth, bad } from "@/server/http";
import { createProject, listProjects } from "@/server/projects";
export const runtime = "nodejs";
export const GET = withAuth(async () => Response.json({ projects: await listProjects() }));
export const POST = withAuth(async (req: NextRequest) => {
  const parsed = await parseBody(req, projectCreate);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.name?.trim()) return bad("`name` is required");
  return Response.json({ project: await createProject({ name: body.name, brief: body.brief ?? null }) }, { status: 201 });
});
