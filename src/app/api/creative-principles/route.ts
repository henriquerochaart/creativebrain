import { withAuth } from "@/server/http";
import { facetCounts } from "@/server/references";
import { CREATIVE_PRINCIPLES } from "@/server/taxonomy";
export const runtime = "nodejs";
export const GET = withAuth(async () => {
  const counts = await facetCounts("principles", 100);
  const byName = new Map(counts.map((c) => [c.value, c.count]));
  return Response.json({ principles: CREATIVE_PRINCIPLES.map((p) => ({ value: p, count: byName.get(p) ?? 0 })) });
});
