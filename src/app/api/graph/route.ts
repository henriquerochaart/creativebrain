import { withAuth } from "@/server/http";
import { graphData } from "@/server/insights";
export const runtime = "nodejs";
/** GET /api/graph — nodes (references, principle and brand hubs) and edges (similarity kinds). */
export const GET = withAuth(async (req) => Response.json(await graphData(Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 250), 600))));
