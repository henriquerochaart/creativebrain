import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { createProject, listProjects } from "@/server/projects";
export const runtime = "nodejs";
export const GET = withAuth(async () => Response.json({ projects: await listProjects() }));
export const POST = withAuth(async (req: NextRequest) => {
  const body = await readJson<{ name?: string; brief?: string }>(req);
  if (!body.name?.trim()) return bad("`name` is required");
  return Response.json({ project: await createProject({ name: body.name, brief: body.brief ?? null }) }, { status: 201 });
});
