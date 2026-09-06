import { withAuth } from "@/server/http";
import { facetCounts } from "@/server/references";
export const runtime = "nodejs";
export const GET = withAuth(async () => Response.json({ tags: await facetCounts("tags", 300) }));
