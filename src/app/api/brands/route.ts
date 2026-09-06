import { withAuth } from "@/server/http";
import { brandCounts } from "@/server/references";
export const runtime = "nodejs";
export const GET = withAuth(async () => Response.json({ brands: await brandCounts(200) }));
