import { describe, expect, it } from "vitest";
import { CREATIVE_PRINCIPLES, SUBJECTS, canonical, normalizeTag, slugify } from "@/server/taxonomy";
import { toReferenceAI, buildSearchText } from "@/server/pipeline/ingest";
import { embeddingTexts } from "@/server/pipeline/embed";
import { synthesisPrompt } from "@/server/ai/prompts";
import { UnderstandingSchema, type Understanding } from "@/server/ai/schemas";
import { parseJsonLoose, jsonSchemaOf } from "@/server/ai/json";

describe("taxonomy helpers", () => {
  it("slugifies accents and spaces", () => {
    expect(slugify("Participação Cultural!")).toBe("participacao-cultural");
    expect(slugify("Social Post")).toBe("social-post");
  });
  it("normalises tags", () => {
    expect(normalizeTag("#Street Marketing")).toBe("streetmarketing");
  });
  it("maps free-form labels back to canonical vocabulary", () => {
    expect(canonical(CREATIVE_PRINCIPLES, "participation")).toBe("Participation");
    expect(canonical(CREATIVE_PRINCIPLES, "Data storytelling")).toBe("Data Storytelling");
    expect(canonical(SUBJECTS, "ux")).toBe("UX");
    expect(canonical(SUBJECTS, "Quantum")).toBeNull();
  });
});

const understanding: Understanding = {
  title: "Netflix — reactive street installation",
  brand: "Netflix",
  whatItIs: "A LED installation in a square that reacts to passers-by.",
  whyInteresting: "The audience becomes the media.",
  creativeMechanism: "Physical interaction → surprise → reaction → social sharing",
  coreIdea: "Make the street react to you.",
  summary: "Netflix activation. Installation reacts to people; reactions are filmed and shared.",
  concepts: ["Experiential", "street marketing", "shareability"],
  tags: ["#Netflix", "activation", "#StreetMarketing", "activation"],
  creativePrinciples: ["surprise", "participation", "Made-up principle"],
  emotionalAttributes: ["delight"],
  strategicAttributes: ["turns audience into media"],
  subjects: ["advertising", "culture", "Nope"],
  formats: ["activation", "Installation"],
  brands: ["Netflix"],
  people: [],
  audience: "urban 18-34",
  language: "pt",
  visualAnalysis: {
    description: "Urban square, red LED wall, crowd.",
    environment: ["urban"],
    subjects: ["people"],
    colors: ["red dominant"],
    typography: [],
    composition: ["fast cuts"],
    motion: [],
    audio: ["crowd ambience"],
    onScreenText: ["Everybody has a story"],
    narrative: ["1. Person approaches", "2. Installation reacts"],
  },
};

describe("understanding → reference AI", () => {
  it("validates against the schema and JSON schema is strict-friendly", () => {
    expect(UnderstandingSchema.parse(understanding)).toBeTruthy();
    const js = jsonSchemaOf(UnderstandingSchema) as { type: string; required?: string[] };
    expect(js.type).toBe("object");
    expect(js.required).toContain("creativeMechanism");
  });
  it("normalises tags, dedupes and maps vocabularies", () => {
    const ai = toReferenceAI(understanding, "test-model");
    expect(ai.tags).toEqual(["netflix", "activation", "streetmarketing"]);
    expect(ai.creativePrinciples).toEqual(["Surprise", "Participation"]);
    expect(ai.subjects).toEqual(["Advertising", "Culture"]);
    expect(ai.formats).toEqual(["Activation", "Installation"]);
    expect(ai.concepts).toContain("experiential");
    expect(ai.model).toBe("test-model");
  });
  it("builds four distinct embedding texts", () => {
    const ai = toReferenceAI(understanding, "m");
    const t = embeddingTexts({ title: understanding.title, brand: "Netflix", ai, content: { visualAnalysis: understanding.visualAnalysis, transcript: "hello" } });
    expect(t.content).toContain("Netflix");
    expect(t.visual).toContain("red dominant");
    expect(t.strategic).toContain("turns audience into media");
    expect(t.execution).toContain("Physical interaction");
    expect(new Set([t.content, t.visual, t.strategic, t.execution]).size).toBe(4);
  });
  it("search text includes on-screen text and mechanism", () => {
    const ai = toReferenceAI(understanding, "m");
    const text = buildSearchText({ ai, content: { ocr: "Everybody has a story" }, metadata: { author: "netflixbrasil" } });
    expect(text).toContain("Everybody has a story");
    expect(text).toContain("netflixbrasil");
    expect(text).toContain("Physical interaction");
  });
});

describe("prompts & json", () => {
  it("synthesis prompt includes only present material", () => {
    const p = synthesisPrompt({ platform: "instagram", mediaType: "video", url: "https://instagram.com/reel/x/", metadata: { author: "nike", title: null }, frameCount: 8, transcript: "run" });
    expect(p).toContain("8 frames");
    expect(p).toContain("- author: nike");
    expect(p).not.toContain("title:");
    expect(p).toContain("Transcript");
    expect(p).not.toContain("Page / document text");
  });
  it("parses fenced JSON leniently", () => {
    const out = parseJsonLoose('Here you go:\n```json\n{"description":"x","tags":["a"]}\n```', UnderstandingSchema.pick({ title: true }).extend({ description: UnderstandingSchema.shape.title, tags: UnderstandingSchema.shape.tags }).omit({ title: true }));
    expect(out.description).toBe("x");
  });
});
