import { NextRequest } from "next/server";
import { withAuth } from "@/server/http";
import { search, type SearchMode } from "@/server/search";
import { toPublic } from "@/server/references";

export const runtime = "nodejs";

/** GET /api/search?q=&mode=hybrid|keyword|semantic|visual|conceptual&platform=&subject=&format=&principle=&tag=&brand=&collection= */
export const GET = withAuth(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  const q = p.get("q") ?? "";
  const result = await search(q, {
    mode: (p.get("mode") as SearchMode) ?? "hybrid",
    limit: Math.min(Number(p.get("limit") ?? 40), 100),
    filters: {
      platform: p.get("platform") ?? undefined,
      subject: p.get("subject") ?? undefined,
      format: p.get("format") ?? undefined,
      principle: p.get("principle") ?? undefined,
      tag: p.get("tag") ?? undefined,
      brand: p.get("brand") ?? undefined,
      collectionId: p.get("collection") ?? undefined,
    },
  });
  return Response.json({
    ...result,
    hits: result.hits.map((h) => ({ reference: toPublic(h.reference), score: h.score, sources: h.sources })),
  });
});
