import type { Reference, ReferenceAI, ReferenceContent } from "../db/schema";
import { getEmbedder } from "../ai/router";

/**
 * Four texts → four embeddings → four kinds of similarity.
 *   content   = what it is (conceptual similarity + semantic search)
 *   visual    = how it looks (visual similarity)
 *   strategic = what problem it solves (strategic similarity)
 *   execution = the mechanism (execution similarity)
 */
export function embeddingTexts(ref: Pick<Reference, "title" | "brand"> & { ai: ReferenceAI; content: ReferenceContent }) {
  const ai = ref.ai;
  const v = ref.content.visualAnalysis;
  const content = [
    ref.title,
    ref.brand,
    ai.summary,
    ai.whatItIs,
    ai.coreIdea,
    ai.concepts?.length ? `Concepts: ${ai.concepts.join(", ")}` : null,
    ai.tags?.length ? `Tags: ${ai.tags.join(", ")}` : null,
    ai.subjects?.length ? `Subjects: ${ai.subjects.join(", ")}` : null,
    ai.formats?.length ? `Formats: ${ai.formats.join(", ")}` : null,
    ref.content.transcript ? `Transcript: ${ref.content.transcript.slice(0, 3000)}` : null,
  ];
  const visual = v
    ? [
        v.description,
        v.environment?.length ? `Environment: ${v.environment.join(", ")}` : null,
        v.subjects?.length ? `Subjects: ${v.subjects.join(", ")}` : null,
        v.colors?.length ? `Colors: ${v.colors.join(", ")}` : null,
        v.typography?.length ? `Typography: ${v.typography.join(", ")}` : null,
        v.composition?.length ? `Composition: ${v.composition.join(", ")}` : null,
        v.motion?.length ? `Motion: ${v.motion.join(", ")}` : null,
        v.onScreenText?.length ? `On-screen text: ${v.onScreenText.join(" | ")}` : null,
      ]
    : [ai.summary];
  const strategic = [
    ai.whyInteresting,
    ai.strategicAttributes?.length ? `Strategic attributes: ${ai.strategicAttributes.join(", ")}` : null,
    ai.audience ? `Audience: ${ai.audience}` : null,
    ai.emotionalAttributes?.length ? `Emotions: ${ai.emotionalAttributes.join(", ")}` : null,
    ai.creativePrinciples?.length ? `Principles: ${ai.creativePrinciples.join(", ")}` : null,
  ];
  const execution = [
    ai.creativeMechanism,
    ai.formats?.length ? `Format: ${ai.formats.join(", ")}` : null,
    v?.narrative?.length ? `Narrative: ${v.narrative.join(" → ")}` : null,
    ai.creativePrinciples?.length ? `Principles: ${ai.creativePrinciples.join(", ")}` : null,
  ];
  const join = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join("\n");
  return { content: join(content), visual: join(visual), strategic: join(strategic), execution: join(execution) };
}

export async function embedReference(ref: Pick<Reference, "title" | "brand"> & { ai: ReferenceAI; content: ReferenceContent }) {
  const texts = embeddingTexts(ref);
  const [content, visual, strategic, execution] = await getEmbedder().embed([texts.content, texts.visual, texts.strategic, texts.execution]);
  return { content, visual, strategic, execution };
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await getEmbedder().embed([text]);
  return v;
}

export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}
