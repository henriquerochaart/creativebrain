import { NextRequest } from "next/server";
import { withAuth, bad, readJson } from "@/server/http";
import { captureInput, toPublic } from "@/server/references";
import { browse } from "@/server/search";

export const runtime = "nodejs";

/** GET /api/references — browse with filters. */
export const GET = withAuth(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  const rows = await browse(
    {
      status: p.get("status") ?? undefined,
      platform: p.get("platform") ?? undefined,
      subject: p.get("subject") ?? undefined,
      format: p.get("format") ?? undefined,
      principle: p.get("principle") ?? undefined,
      tag: p.get("tag") ?? undefined,
      brand: p.get("brand") ?? undefined,
      collectionId: p.get("collection") ?? undefined,
    },
    Math.min(Number(p.get("limit") ?? 60), 200),
    Number(p.get("offset") ?? 0),
  );
  return Response.json({ references: rows.map(toPublic) });
});

/** POST /api/references { input: url | text, note?, collectionId? } — capture anything. */
export const POST = withAuth(async (req: NextRequest) => {
  const body = await readJson<{ input?: string; note?: string; collectionId?: string }>(req);
  if (!body.input?.trim()) return bad("`input` is required (a URL or a piece of text)");
  const { reference, duplicate } = await captureInput(body.input, { note: body.note, collectionId: body.collectionId });
  return Response.json({ reference: toPublic(reference), duplicate }, { status: duplicate ? 200 : 201 });
});
