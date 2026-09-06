import type { Reference } from "../db/schema";
import { getLLM } from "../ai/router";
import { ThinkSchema, WhyTheseSchema, type Think, type WhyThese } from "../ai/schemas";
import { THINK_SYSTEM, WHY_THESE_SYSTEM, clip } from "../ai/prompts";

/** Compact semantic file of a reference for prompting. */
export function referenceDigest(r: Reference, opts: { withId?: boolean; long?: boolean } = {}): string {
  const ai = r.ai;
  const lines = [
    `${opts.withId ? `[${r.id}] ` : ""}${r.title ?? "Untitled"}${r.brand ? ` — ${r.brand}` : ""} (${r.sourcePlatform} · ${r.mediaType})`,
    ai.summary ? `Summary: ${ai.summary}` : null,
    ai.creativeMechanism ? `Mechanism: ${ai.creativeMechanism}` : null,
    ai.creativePrinciples?.length ? `Principles: ${ai.creativePrinciples.join(", ")}` : null,
    ai.strategicAttributes?.length ? `Strategic: ${ai.strategicAttributes.join("; ")}` : null,
    r.subjects.length || r.formats.length ? `Categories: ${[...r.subjects, ...r.formats].join(", ")}` : null,
    r.tags.length ? `Tags: ${r.tags.slice(0, 12).join(", ")}` : null,
  ];
  if (opts.long) {
    lines.push(
      ai.whatItIs ? `What it is: ${ai.whatItIs}` : null,
      ai.whyInteresting ? `Why interesting: ${ai.whyInteresting}` : null,
      ai.coreIdea ? `Core idea: ${ai.coreIdea}` : null,
      ai.concepts?.length ? `Concepts: ${ai.concepts.join(", ")}` : null,
      ai.emotionalAttributes?.length ? `Emotions: ${ai.emotionalAttributes.join(", ")}` : null,
      ai.audience ? `Audience: ${ai.audience}` : null,
      r.content.visualAnalysis?.description ? `Visual: ${r.content.visualAnalysis.description}` : null,
      r.content.visualAnalysis?.narrative?.length ? `Narrative: ${r.content.visualAnalysis.narrative.join(" → ")}` : null,
      r.content.transcript ? `Transcript: ${clip(r.content.transcript, 3000)}` : null,
      r.content.ocr ? `On-screen text: ${clip(r.content.ocr, 800)}` : null,
      r.content.userNote ? `User note: ${r.content.userNote}` : null,
      r.canonicalUrl ? `URL: ${r.canonicalUrl}` : null,
    );
  }
  return lines.filter(Boolean).join("\n");
}

export async function whyTheseReferences(query: string, refs: Reference[]): Promise<WhyThese> {
  const digest = refs.slice(0, 16).map((r) => referenceDigest(r, { withId: true })).join("\n\n");
  return getLLM().analyze({
    system: WHY_THESE_SYSTEM,
    prompt: `Query: "${query}"\n\nReferences found:\n\n${digest}\n\nExplain why these references answer the query.`,
    schema: WhyTheseSchema,
    schemaName: "why_these",
  });
}

export async function think(query: string, refs: Reference[], history: { role: "user" | "assistant"; content: string }[] = []): Promise<Think> {
  const digest = refs.slice(0, 40).map((r) => referenceDigest(r, { withId: true })).join("\n\n");
  const past = history.length ? `Earlier in this conversation:\n${history.map((h) => `${h.role}: ${h.content}`).join("\n")}\n\n` : "";
  return getLLM().analyze({
    system: THINK_SYSTEM,
    prompt: `${past}Brief / question: "${query}"\n\nRetrieved repertoire (${refs.length} references):\n\n${digest || "(nothing retrieved)"}`,
    schema: ThinkSchema,
    schemaName: "think",
  });
}
