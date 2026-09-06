import { GoogleGenAI, type Part } from "@google/genai";
import type {
  AnalyzeInput,
  EmbeddingProvider,
  LLMProvider,
  StreamInput,
  TranscriptionProvider,
} from "../types";
import { AIConfigError } from "../types";
import { jsonSchemaOf, parseJsonLoose } from "../json";

function client(apiKey?: string): GoogleGenAI {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) throw new AIConfigError("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey: key });
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private ai: GoogleGenAI;
  constructor(
    readonly model: string,
    apiKey?: string,
  ) {
    this.ai = client(apiKey);
  }

  async analyze<T>(input: AnalyzeInput<T>): Promise<T> {
    const parts: Part[] = [];
    for (const doc of input.documents ?? []) parts.push({ inlineData: { mimeType: "application/pdf", data: doc.data.toString("base64") } });
    for (const img of input.images ?? []) parts.push({ inlineData: { mimeType: img.mime, data: img.data.toString("base64") } });
    const schema = JSON.stringify(jsonSchemaOf(input.schema));
    parts.push({ text: `${input.prompt}\n\nRespond with a single JSON object that validates against this JSON Schema:\n${schema}` });

    const res = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts }],
      config: { systemInstruction: input.system, responseMimeType: "application/json" },
    });
    return parseJsonLoose(res.text ?? "", input.schema);
  }

  async *streamText(input: StreamInput): AsyncIterable<string> {
    const contents = [];
    for (const turn of input.history ?? []) {
      contents.push({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] });
    }
    const parts: Part[] = [];
    for (const img of input.images ?? []) parts.push({ inlineData: { mimeType: img.mime, data: img.data.toString("base64") } });
    parts.push({ text: input.prompt });
    contents.push({ role: "user", parts });

    const stream = await this.ai.models.generateContentStream({
      model: this.model,
      contents,
      config: { systemInstruction: input.system },
    });
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) yield t;
    }
  }
}

export class GeminiEmbeddings implements EmbeddingProvider {
  readonly name = "gemini";
  private ai: GoogleGenAI;
  constructor(
    readonly model: string,
    readonly dimensions: number,
    apiKey?: string,
  ) {
    this.ai = client(apiKey);
  }
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const res = await this.ai.models.embedContent({
      model: this.model,
      contents: texts.map((t) => t.slice(0, 30000)),
      config: { outputDimensionality: this.dimensions },
    });
    return (res.embeddings ?? []).map((e) => e.values ?? []);
  }
}

export class GeminiTranscription implements TranscriptionProvider {
  readonly name = "gemini";
  private ai: GoogleGenAI;
  constructor(
    readonly model: string,
    apiKey?: string,
  ) {
    this.ai = client(apiKey);
  }
  async transcribe(audio: Buffer, mime: string): Promise<string> {
    const res = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mime, data: audio.toString("base64") } },
            { text: "Transcribe this audio verbatim in its original language. Output only the transcript." },
          ],
        },
      ],
    });
    return res.text ?? "";
  }
}
