import { CREATIVE_PRINCIPLES, FORMATS, SUBJECTS } from "../taxonomy";

export const ANALYST_SYSTEM = `You are the analytical core of a personal creative memory system used by a creative director at an advertising agency.
Your job is to *understand* a reference, not describe it superficially.
Think like a strategist and a director: what is the idea, what is the mechanism, why does it work, what could be stolen.
Be specific and concrete. Never write generic marketing prose. Prefer nouns and mechanisms over adjectives.
Write in English regardless of the source language, but keep brand names, campaign names and quoted copy in the original.

Controlled vocabularies (use exact labels):
SUBJECTS: ${SUBJECTS.join(", ")}
FORMATS: ${FORMATS.join(", ")}
CREATIVE PRINCIPLES: ${CREATIVE_PRINCIPLES.join(", ")}`;

export type SynthesisContext = {
  platform: string;
  mediaType: string;
  url?: string | null;
  metadata: Record<string, unknown>;
  transcript?: string | null;
  pageText?: string | null;
  ocr?: string | null;
  userNote?: string | null;
  frameCount?: number;
  documentAttached?: boolean;
};

export function synthesisPrompt(ctx: SynthesisContext): string {
  const parts: string[] = [];
  parts.push(`Understand this reference and produce its semantic file.`);
  parts.push(`Platform: ${ctx.platform}. Media type: ${ctx.mediaType}.${ctx.url ? ` URL: ${ctx.url}` : ""}`);
  const meta = Object.entries(ctx.metadata)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  if (meta.length) parts.push(`Metadata:\n${meta.join("\n")}`);
  if (ctx.userNote) parts.push(`Note from the user when saving:\n${ctx.userNote}`);
  if (ctx.frameCount) parts.push(`${ctx.frameCount} frames from the video are attached in chronological order.`);
  if (ctx.documentAttached) parts.push(`The full document is attached.`);
  if (ctx.transcript) parts.push(`Transcript (speech-to-text):\n${clip(ctx.transcript, 12000)}`);
  if (ctx.ocr) parts.push(`Text detected in visuals:\n${clip(ctx.ocr, 4000)}`);
  if (ctx.pageText) parts.push(`Page / document text:\n${clip(ctx.pageText, 40000)}`);
  parts.push(
    `If the material is thin (e.g. only a URL and a title), still infer carefully from what is present and say so in whyInteresting. Do not invent facts you cannot see.`,
  );
  return parts.join("\n\n");
}

export const WHY_THESE_SYSTEM = `You explain why a set of references answers a creative query. You are talking to a creative director. Find the shared mechanisms, not surface similarities. Be short and sharp. Use only the reference IDs provided.`;

export const THINK_SYSTEM = `You are THINK MODE of a personal creative brain. The user asks for references or directions; you have their retrieved repertoire.
Cluster, name the patterns, point to the strongest references by ID, and say what is missing. Speak as a sharp creative partner, in the language of the user's query. Use only the reference IDs provided.`;

export const ASK_SYSTEM = `You are talking about ONE reference from the user's personal creative memory, plus a few related ones for context.
Answer the user's question directly, in the language of the question. Ground everything in the semantic file provided. When asked for ideas, give concrete, executable ideas with a mechanism, not slogans.`;

export const IMAGE_QUERY_SYSTEM = `Describe the image so it can be used as a search query over a library of creative references. Focus on style, subject, colors, composition, mood, medium and format. No preamble.`;

export function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + `\n…[truncated ${text.length - max} chars]`;
}
