import type { EmbeddingProvider } from "../types";
import { AIConfigError } from "../types";

/** Voyage AI embeddings (Anthropic's recommended embedding partner). Plain REST; no SDK needed. */
export class VoyageEmbeddings implements EmbeddingProvider {
  readonly name = "voyage";
  private key: string;
  constructor(
    readonly model: string,
    readonly dimensions: number,
    apiKey?: string,
  ) {
    const key = apiKey ?? process.env.VOYAGE_API_KEY;
    if (!key) throw new AIConfigError("VOYAGE_API_KEY is not set");
    this.key = key;
  }
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.key}` },
      body: JSON.stringify({ model: this.model, input: texts.map((t) => t.slice(0, 30000)), output_dimension: this.dimensions }),
    });
    if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}
