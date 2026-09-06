import { withAuth } from "@/server/http";
import { discover } from "@/server/insights";
export const runtime = "nodejs";
/** GET /api/discover — personal taste: for you + something you have not thought of. */
export const GET = withAuth(async () => {
  const d = await discover();
  return Response.json(d ?? { signals: 0, favourites: { principles: [], subjects: [] }, forYou: [], unexpected: [] });
});
