import { NextRequest } from "next/server";
import { useQuota } from "@/server/limits";
import { parseBody, askBody } from "@/server/validate";
import { withAuth, bad, textStream } from "@/server/http";
import { getReference, relatedReferences } from "@/server/references";
import { getLLM } from "@/server/ai/router";
import { ASK_SYSTEM } from "@/server/ai/prompts";
import { referenceDigest } from "@/server/search/explain";
import { db } from "@/server/db/client";
import { conversations, type Reference } from "@/server/db/schema";
import { recordEvent } from "@/server/insights";

export const runtime = "nodejs";

/** POST /api/references/:id/ask { question, history? } — streams a grounded answer. */
export const POST = withAuth<{ id: string }>(async (req: NextRequest, { params }) => {
  await useQuota("ai");
  const ref = await getReference(params.id);
  if (!ref) return bad("Not found", 404);
  const parsed = await parseBody(req, askBody);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.question?.trim()) return bad("`question` is required");
  const related = await relatedReferences(ref.id, 4).catch(() => []);
  const context = [
    `THE REFERENCE:\n${referenceDigest(ref, { long: true })}`,
    related.length ? `RELATED REFERENCES:\n${related.map((r) => referenceDigest(r.reference as Reference)).join("\n\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  const chunks = getLLM().streamText({
    system: `${ASK_SYSTEM}\n\n${context}`,
    history: body.history?.slice(-10),
    prompt: body.question,
  });
  await recordEvent(ref.id, "ask");
  return textStream(chunks, async (answer) => {
    await db.insert(conversations).values({ userId: ref.userId, referenceId: ref.id, mode: "ask", question: body.question!, answer });
  });
});
