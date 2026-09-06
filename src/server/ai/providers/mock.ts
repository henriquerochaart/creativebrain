import { createHash } from "node:crypto";
import type { AnalyzeInput, EmbeddingProvider, LLMProvider, StreamInput } from "../types";
import type { Understanding } from "../schemas";

/**
 * Deterministic, keyless providers for local development, demos and end-to-end tests.
 * Set LLM_PROVIDER=mock and EMBEDDING_PROVIDER=mock. Output is schema-valid but not intelligent.
 */
export class MockLLM implements LLMProvider {
  readonly name = "mock";
  readonly model = "mock-1";

  async analyze<T>(input: AnalyzeInput<T>): Promise<T> {
    const url = /URL: (\S+)/.exec(input.prompt)?.[1] ?? null;
    const title = /- title: (.+)/.exec(input.prompt)?.[1]?.trim() ?? titleFromUrl(url) ?? "Untitled reference";
    const platform = /Platform: (\w+)/.exec(input.prompt)?.[1] ?? "other";
    const words = keywords(input.prompt);
    let out: unknown;
    switch (input.schemaName) {
      case "understanding": {
        const u: Understanding = {
          title: title.slice(0, 80),
          brand: /- author: (.+)/.exec(input.prompt)?.[1]?.trim() ?? null,
          whatItIs: `A ${platform} reference captured by the Brain. ${title}.`,
          whyInteresting: "Mock analysis: configure LLM_PROVIDER (anthropic | openai | gemini) to get a real understanding.",
          creativeMechanism: "Capture → Understand → Classify → Connect",
          coreIdea: `Reference about ${words.slice(0, 3).join(", ") || "something"}.`,
          summary: `${title}. Platform ${platform}. Keywords: ${words.slice(0, 8).join(", ")}.${url ? ` Source ${url}.` : ""}`,
          concepts: words.slice(0, 8),
          tags: [platform, ...words.slice(0, 6)],
          creativePrinciples: ["Utility", "Simplicity"],
          emotionalAttributes: ["curiosity"],
          strategicAttributes: ["placeholder analysis"],
          subjects: ["Design"],
          formats: platform === "youtube" || platform === "tiktok" || platform === "instagram" ? ["Social Post"] : ["Website"],
          brands: [],
          people: [],
          audience: null,
          language: null,
          visualAnalysis: {
            description: "Mock provider does not look at pixels.",
            environment: [],
            subjects: [],
            colors: [],
            typography: [],
            composition: [],
            motion: [],
            audio: [],
            onScreenText: [],
            narrative: [],
          },
        };
        out = u;
        break;
      }
      case "why_these": {
        const ids = [...input.prompt.matchAll(/\[([0-9a-f-]{36})\]/g)].map((m) => m[1]);
        out = {
          headline: "Mock explanation — these references share the keywords of your query.",
          mechanisms: [{ name: "Keyword overlap", explanation: "Configure a real LLM provider for mechanism analysis.", referenceIds: ids.slice(0, 4) }],
          direction: "Enable an LLM provider to receive a creative direction.",
        };
        break;
      }
      case "think": {
        const ids = [...input.prompt.matchAll(/\[([0-9a-f-]{36})\]/g)].map((m) => m[1]);
        out = {
          intro: `I found ${ids.length} references (mock mode).`,
          clusters: ids.length ? [{ title: "Everything retrieved", rationale: "Mock clustering.", referenceIds: ids.slice(0, 6) }] : [],
          strongest: ids.slice(0, 3),
          patterns: ["Mock provider active — patterns need a real model."],
          gaps: [],
          nextQuestions: ["What mechanisms repeat here?"],
        };
        break;
      }
      case "image_query":
        out = { description: "mock image description", tags: ["mock"] };
        break;
      case "moodboard": {
        const ids = allIds(input.prompt);
        out = {
          title: "Mock moodboard",
          concept: "Mock provider: a real model would define the visual territory here.",
          tone: ["mock"],
          palette: ["neutral"],
          directions: ids.length ? [{ title: "Retrieved set", rationale: "Mock grouping.", referenceIds: ids.slice(0, 6) }] : [],
          missing: [],
        };
        break;
      }
      case "auto_collections": {
        const ids = allIds(input.prompt);
        out = { collections: ids.length >= 2 ? [{ name: "Mock pattern", emoji: "🧪", rationale: "Mock grouping of everything understood.", referenceIds: ids.slice(0, 20) }] : [] };
        break;
      }
      case "narrative":
        out = { headline: "Modo mock: configure um LLM real para ler seu repertório.", observations: ["Sem modelo, sem observações."], blindSpots: [], provocation: "Configure LLM_PROVIDER." };
        break;
      case "project_analysis": {
        const ids = allIds(input.prompt);
        out = {
          summary: "Mock analysis of the selection.",
          concepts: ids.length ? [{ name: "mock concept", referenceIds: ids.slice(0, 5) }] : [],
          patterns: ids.length ? [{ statement: "Mock pattern across the selection.", referenceIds: ids.slice(0, 5) }] : [],
          directions: ids.length ? [{ title: "Mock direction", rationale: "Mock.", mechanism: "A → B → C", referenceIds: ids.slice(0, 4) }] : [],
          ideas: ids.length ? [{ title: "Mock idea", direction: "Mock direction", mechanism: "A → B", description: "Configure a real model for ideas.", referenceIds: ids.slice(0, 2) }] : [],
          combinationQuestion: "Want to explore a direction that combines the dominant elements?",
        };
        break;
      }
      default:
        out = {};
    }
    return input.schema.parse(out);
  }

  async *streamText(input: StreamInput): AsyncIterable<string> {
    const text = `Mock answer to: "${input.prompt}". Configure LLM_PROVIDER to talk to a real model.`;
    for (const chunk of text.match(/.{1,12}/g) ?? []) {
      yield chunk;
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}

/** Hash-based embeddings: identical text → identical vector; shared words → some similarity. */
export class MockEmbeddings implements EmbeddingProvider {
  readonly name = "mock";
  readonly model = "mock-hash";
  constructor(readonly dimensions: number) {}
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => {
      const v = new Array<number>(this.dimensions).fill(0);
      for (const w of keywords(t, 200)) {
        const h = createHash("sha256").update(w).digest();
        for (let i = 0; i < 4; i++) {
          const idx = h.readUInt32BE(i * 4) % this.dimensions;
          v[idx] += (h[16 + i] & 1 ? 1 : -1) * 1;
        }
      }
      const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
      return v.map((x) => x / norm);
    });
  }
}

const STOP = new Set(["the", "and", "for", "with", "this", "that", "from", "https", "http", "www", "com", "platform", "media", "type", "metadata", "understand", "reference", "produce", "semantic", "file", "url", "title", "note", "user", "when", "saving", "text", "page", "document"]);
function keywords(text: string, max = 12): string[] {
  const counts = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-zÀ-ɏ]{4,}/g) ?? []) {
    if (STOP.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, max);
}
function allIds(prompt: string): string[] {
  return [...new Set([...prompt.matchAll(/\[([0-9a-f-]{36})\]/g)].map((m) => m[1]))];
}
function titleFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const tail = u.pathname.split("/").filter(Boolean).pop();
    return `${u.hostname.replace(/^www\./, "")}${tail ? ` · ${decodeURIComponent(tail)}` : ""}`;
  } catch {
    return null;
  }
}
