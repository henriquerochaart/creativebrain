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

export const MoodboardSchema = z.object({
  title: z.string().describe("Short board title, e.g. 'Futurist fashion — cold light, warm bodies'"),
  concept: z.string().describe("2-3 sentences: the visual/creative territory this board proposes."),
  tone: z.array(z.string()).describe("4-6 tone words."),
  palette: z.array(z.string()).describe("3-6 colour/material/light descriptors drawn from the references."),
  directions: z
    .array(
      z.object({
        title: z.string(),
        rationale: z.string().describe("1-2 sentences."),
        referenceIds: z.array(z.string()).describe("3-6 IDs from the provided set, strongest first."),
      }),
    )
    .describe("2-4 visual directions."),
  missing: z.array(z.string()).describe("What the board lacks and the user should go find. 0-3 items."),
});
export type Moodboard = z.infer<typeof MoodboardSchema>;

export const AutoCollectionsSchema = z.object({
  collections: z
    .array(
      z.object({
        name: z.string().describe("Collection name as the user would write it: short, personal, e.g. 'Data that becomes a ritual'"),
        emoji: z.string().describe("One emoji."),
        rationale: z.string().describe("One sentence: the pattern that holds these together."),
        referenceIds: z.array(z.string()).describe("4-20 IDs from the provided set."),
      }),
    )
    .describe("3-8 proposed collections that reveal real patterns, not categories the taxonomy already has."),
});
export type AutoCollections = z.infer<typeof AutoCollectionsSchema>;

export const NarrativeSchema = z.object({
  headline: z.string().describe("One sentence: what this person is drawn to."),
  observations: z.array(z.string()).describe("4-7 sharp observations, e.g. 'Henrique keeps saving ideas that turn data into experiences'."),
  blindSpots: z.array(z.string()).describe("2-3 things the repertoire avoids or lacks."),
  provocation: z.string().describe("One question or dare for the next month of collecting."),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export const ProjectAnalysisSchema = z.object({
  summary: z.string().describe("2-3 sentences: what this selection of references says about where the project is going."),
  concepts: z.array(z.object({ name: z.string(), referenceIds: z.array(z.string()) })).describe("5-10 concepts shared across the selection."),
  patterns: z.array(z.object({ statement: z.string(), referenceIds: z.array(z.string()) })).describe("3-6 pattern statements."),
  directions: z
    .array(
      z.object({
        title: z.string(),
        rationale: z.string(),
        mechanism: z.string().describe("Mechanism chain with arrows."),
        referenceIds: z.array(z.string()),
      }),
    )
    .describe("3-4 creative directions that combine the dominant elements."),
  ideas: z
    .array(
      z.object({
        title: z.string(),
        direction: z.string().describe("Title of the direction it belongs to."),
        mechanism: z.string(),
        description: z.string().describe("3-5 sentences. Concrete and executable."),
        referenceIds: z.array(z.string()),
      }),
    )
    .describe("5-8 ideas."),
  combinationQuestion: z.string().describe("e.g. 'Want to explore a direction that combines participation, humor and physical transformation?'"),
});
export type ProjectAnalysis = z.infer<typeof ProjectAnalysisSchema>;
