import { withAuth } from "@/server/http";
import { recentVolume, trends } from "@/server/insights";
export const runtime = "nodejs";
/** GET /api/trends — what am I saving a lot lately? */
export const GET = withAuth(async () => {
  const [tags, principles, subjects, formats, concepts, volume] = await Promise.all([
    trends("tags"), trends("principles"), trends("subjects"), trends("formats"), trends("concepts"), recentVolume(30),
  ]);
  return Response.json({ tags, principles, subjects, formats, concepts, volume });
});
