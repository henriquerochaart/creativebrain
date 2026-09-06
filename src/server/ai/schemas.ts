import { z } from "zod";

/**
 * The semantic file of a reference. This is what "understanding" means in the Brain.
 * Everything is required (nullable where empty) so structured-output modes stay strict.
 */
export const UnderstandingSchema = z.object({
  title: z.string().describe("Short, human title. Brand + what it is. e.g. 'Nike Running — reactive LED run club'"),
  brand: z.string().nullable().describe("Primary brand or author. null if none."),
  whatItIs: z.string().describe("2-3 sentences. What the reference concretely is."),
  whyInteresting: z.string().describe("2-4 sentences. Why a creative director should care. Be specific, not generic."),
  creativeMechanism: z
    .string()
    .describe("The mechanism as a chain, e.g. 'Physical interaction → surprise → reaction → social sharing'"),
  coreIdea: z.string().describe("One sentence. The idea stripped of execution."),
  summary: z.string().describe("Dense 3-5 sentence summary used for search. Include brand, format, mechanism, tone."),
  concepts: z.array(z.string()).describe("8-15 conceptual nouns: e.g. 'personalization', 'data storytelling', 'annual ritual'"),
  tags: z.array(z.string()).describe("8-15 lowercase hashtags without '#': brand, format, industry, tone, technique"),
  creativePrinciples: z.array(z.string()).describe("From the provided list only. 2-5 items."),
  emotionalAttributes: z.array(z.string()).describe("3-6 emotions the audience feels: e.g. 'delight', 'pride', 'curiosity'"),
  strategicAttributes: z
    .array(z.string())
    .describe("3-6 strategic moves: e.g. 'turns audience into media', 'borrows an existing behavior', 'owns a cultural moment'"),
  subjects: z.array(z.string()).describe("From the provided SUBJECT list only. 1-4 items."),
  formats: z.array(z.string()).describe("From the provided FORMAT list only. 1-3 items."),
  brands: z.array(z.string()).describe("All brands mentioned or shown."),
  people: z.array(z.string()).describe("Named people, creators, agencies, directors."),
  audience: z.string().nullable().describe("Who this speaks to."),
  language: z.string().nullable().describe("ISO 639-1 of the main spoken/written language, or null."),
  visualAnalysis: z.object({
    description: z.string().describe("What is seen, as a paragraph. If no visuals, describe the layout/document."),
    environment: z.array(z.string()),
    subjects: z.array(z.string()),
    colors: z.array(z.string()).describe("Dominant visual language: e.g. 'red dominant', 'monochrome', 'warm film grain'"),
    typography: z.array(z.string()),
    composition: z.array(z.string()).describe("e.g. 'fast cuts', 'close-ups of reactions', 'centered grid'"),
    motion: z.array(z.string()),
    audio: z.array(z.string()).describe("e.g. 'female voiceover', 'crowd ambience'. Empty if unknown."),
    onScreenText: z.array(z.string()).describe("Text visible on screen / in the image (OCR)."),
    narrative: z.array(z.string()).describe("Beat by beat. e.g. '1. Person approaches installation'"),
  }),
});
export type Understanding = z.infer<typeof UnderstandingSchema>;

export const WhyTheseSchema = z.object({
  headline: z.string().describe("One sentence answering the query with the pattern found."),
  mechanisms: z
    .array(
      z.object({
        name: z.string(),
        explanation: z.string().describe("One or two sentences."),
        referenceIds: z.array(z.string()).describe("IDs from the provided set that share this mechanism."),
      }),
    )
    .describe("2-4 shared mechanisms."),
  direction: z.string().describe("A short creative direction suggested by the set. 2-3 sentences."),
});
export type WhyThese = z.infer<typeof WhyTheseSchema>;

export const ThinkSchema = z.object({
  intro: z.string().describe("e.g. 'I found 47 relevant references. They cluster around:'"),
  clusters: z
    .array(
      z.object({
        title: z.string(),
        rationale: z.string(),
        referenceIds: z.array(z.string()),
      }),
    )
    .describe("2-5 clusters, ordered by strength."),
  strongest: z.array(z.string()).describe("Up to 6 reference IDs, strongest first."),
  patterns: z.array(z.string()).describe("3-6 short pattern statements, e.g. 'Technology becomes invisible'."),
  gaps: z.array(z.string()).describe("What the repertoire lacks for this brief. 0-3 items."),
  nextQuestions: z.array(z.string()).describe("2-3 follow-up questions the user could ask."),
});
export type Think = z.infer<typeof ThinkSchema>;

export const ImageQuerySchema = z.object({
  description: z.string().describe("Rich visual description usable as a search query: subject, style, colors, mood, format."),
  tags: z.array(z.string()),
});
export type ImageQuery = z.infer<typeof ImageQuerySchema>;
