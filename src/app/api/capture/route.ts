import { NextRequest } from "next/server";
import { withAuth, bad } from "@/server/http";
import { inputFromShare } from "@/server/share";
import { captureInput, toPublic } from "@/server/references";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/capture?url=&text=&title= — share-sheet friendly capture (same auth as the rest of the API).
 * For tools that can only issue a GET with query params (some automation apps, bookmarklets with a key).
 */
export const GET = withAuth(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  const parsed = inputFromShare({ url: p.get("url"), text: p.get("text"), title: p.get("title") });
  if (!parsed) return bad("Nothing to capture: pass `url`, `text` or `title`");
  const { reference, duplicate } = await captureInput(parsed.input, { note: parsed.note ?? undefined });
  if (p.get("redirect") === "1") return Response.redirect(new URL(`/r/${reference.id}`, req.nextUrl.origin), 303);
  return Response.json({ reference: toPublic(reference), duplicate }, { status: duplicate ? 200 : 201 });
});
