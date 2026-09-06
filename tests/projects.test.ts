import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { projectMarkdown, selectionSentence, selectionStats } from "@/server/projects";
import type { PublicReference } from "@/server/references";
import type { Project } from "@/server/db/schema";
import { MockLLM, MockEmbeddings } from "@/server/ai/providers/mock";
import { AutoCollectionsSchema, MoodboardSchema, NarrativeSchema, ProjectAnalysisSchema, ThinkSchema, UnderstandingSchema, WhyTheseSchema } from "@/server/ai/schemas";

function ref(over: Partial<PublicReference>): PublicReference {
  return {
    id: over.id ?? "00000000-0000-4000-8000-000000000001",
    originalUrl: null,
    canonicalUrl: null,
    sourcePlatform: "instagram",
    mediaType: "video",
    title: "Ref",
    brand: null,
    thumbnailUrl: null,
    mediaKey: null,
    mediaMime: null,
    mediaBytes: null,
    status: "understood",
    processingStep: null,
    error: null,
    metadata: {},
    content: {},
    ai: {},
    subjects: [],
    formats: [],
    tags: [],
    principles: [],
    concepts: [],
    saved: false,
    userNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    processedAt: null,
    ...over,
  } as PublicReference;
}

describe("project selection stats", () => {
  const refs = [
    ref({ id: "00000000-0000-4000-8000-000000000001", title: "A", principles: ["Participation", "Humor"], subjects: ["Advertising"], brand: "Nike" }),
    ref({ id: "00000000-0000-4000-8000-000000000002", title: "B", principles: ["Participation"], subjects: ["Culture"], brand: "Nike" }),
    ref({ id: "00000000-0000-4000-8000-000000000003", title: "C", principles: ["Transformation", "Participation"], subjects: ["Advertising"] }),
  ];
  it("counts principles and brands across the selection", () => {
    const s = selectionStats(refs);
    expect(s.total).toBe(3);
    expect(s.principles[0]).toEqual({ value: "Participation", count: 3 });
    expect(s.brands).toEqual([{ value: "Nike", count: 2 }]);
  });
  it("writes the 'you selected N references' sentence", () => {
    expect(selectionSentence(selectionStats(refs))).toBe("You selected 3 references. 3 with participation, 1 with humor, 1 with transformation.");
    expect(selectionSentence(selectionStats([]))).toBe("No references selected yet.");
  });
  it("renders the output markdown with and without analysis", () => {
    const project = { id: "p", name: "Campanha X", brief: "Lançar app", analysis: {}, analyzedAt: null } as unknown as Project;
    const md = projectMarkdown(project, refs, null);
    expect(md).toContain("# Campanha X");
    expect(md).toContain("- **A**");
    const withAnalysis = projectMarkdown(project, refs, {
      sentence: "You selected 3 references.",
      stats: selectionStats(refs),
      model: "m",
      analysis: {
        summary: "S",
        concepts: [{ name: "participation", referenceIds: [refs[0].id] }],
        patterns: [{ statement: "P", referenceIds: [] }],
        directions: [{ title: "D", rationale: "R", mechanism: "A → B", referenceIds: [refs[1].id] }],
        ideas: [{ title: "I", direction: "D", mechanism: "A → B", description: "Desc", referenceIds: [] }],
        combinationQuestion: "Q?",
      },
    });
    expect(withAnalysis).toContain("## Directions");
    expect(withAnalysis).toContain("References: B");
    expect(withAnalysis).toContain("Q?");
  });
});

describe("mock provider produces schema-valid output for every schema", () => {
  const llm = new MockLLM();
  const prompt = "Platform: youtube. Media type: video. URL: https://youtu.be/x\nMetadata:\n- title: Nike Run\n[00000000-0000-4000-8000-000000000001] A\n[00000000-0000-4000-8000-000000000002] B";
  it.each([
    ["understanding", UnderstandingSchema],
    ["why_these", WhyTheseSchema],
    ["think", ThinkSchema],
    ["moodboard", MoodboardSchema],
    ["auto_collections", AutoCollectionsSchema],
    ["narrative", NarrativeSchema],
    ["project_analysis", ProjectAnalysisSchema],
  ] as [string, z.ZodType][])("%s", async (schemaName, schema) => {
    const out = await llm.analyze({ system: "", prompt, schema: schema as z.ZodType<unknown>, schemaName });
    expect(schema.parse(out)).toBeTruthy();
  });
  it("understanding uses metadata title and author", async () => {
    const out = await llm.analyze({ system: "", prompt: `${prompt}\n- author: Nike`, schema: UnderstandingSchema, schemaName: "understanding" });
    expect(out.title).toBe("Nike Run");
    expect(out.brand).toBe("Nike");
  });
  it("mock embeddings are deterministic, normalised and reflect shared words", async () => {
    const e = new MockEmbeddings(256);
    const [a, b, c] = await e.embed(["nike running participation", "nike running participation", "typography grid minimal"]);
    expect(a).toEqual(b);
    const dot = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0);
    expect(dot(a, a)).toBeCloseTo(1, 5);
    expect(dot(a, c)).toBeLessThan(0.5);
  });
});
