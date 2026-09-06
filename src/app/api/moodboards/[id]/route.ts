import { withAuth, bad } from "@/server/http";
import { deleteBoard, getBoard } from "@/server/creative";
import { isUuid } from "@/server/references";
export const runtime = "nodejs";
type P = { id: string };
export const GET = withAuth<P>(async (_req, { params }) => {
  const b = isUuid(params.id) ? await getBoard(params.id) : null;
  return b ? Response.json(b) : bad("Not found", 404);
});
export const DELETE = withAuth<P>(async (_req, { params }) => ((isUuid(params.id) && (await deleteBoard(params.id))) ? new Response(null, { status: 204 }) : bad("Not found", 404)));
