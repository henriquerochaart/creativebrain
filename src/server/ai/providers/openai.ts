import OpenAI, { toFile } from "openai";
import type {
  AnalyzeInput,
  EmbeddingProvider,
  LLMProvider,
  StreamInput,
  TranscriptionProvider,
  AIImage,
} from "../types";
import { AIConfigError } from "../types";
import { jsonSchemaOf, parseJsonLoose } from "../json";

function dataUrl(img: AIImage): string {
  return `data:${img.mime};base64,${img.data.toString("base64")}`;
}

function client(apiKey?: string): OpenAI {
  if (!apiKey && !process.env.OPENAI_API_KEY) throw new AIConfigError("OPENAI_API_KEY is not set");
  return new OpenAI(apiKey ? { apiKey } : {});
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  private client: OpenAI;
  constructor(
    readonly model: string,
    apiKey?: string,
  ) {
    this.client = client(apiKey);
  }

  async analyze<T>(input: AnalyzeInput<T>): Promise<T> {
    const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    for (const doc of input.documents ?? []) {
      parts.push({
        type: "file",
        file: { filename: doc.name ?? "document.pdf", file_data: `data:application/pdf;base64,${doc.data.toString("base64")}` },
      });
    }
    for (const img of input.images ?? []) parts.push({ type: "image_url", image_url: { url: dataUrl(img) } });
    parts.push({ type: "text", text: input.prompt });

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: parts },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: input.schemaName ?? "output", schema: jsonSchemaOf(input.schema) },
      },
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return parseJsonLoose(text, input.schema);
  }

  async *streamText(input: StreamInput): AsyncIterable<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: input.system }];
    for (const turn of input.history ?? []) messages.push({ role: turn.role, content: turn.content });
    const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    for (const img of input.images ?? []) parts.push({ type: "image_url", image_url: { url: dataUrl(img) } });
    parts.push({ type: "text", text: input.prompt });
    messages.push({ role: "user", content: parts });

    const stream = await this.client.chat.completions.create({ model: this.model, messages, stream: true });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

export class OpenAIEmbeddings implements EmbeddingProvider {
  readonly name = "openai";
  private client: OpenAI;
  constructor(
    readonly model: string,
    readonly dimensions: number,
    apiKey?: string,
  ) {
    this.client = client(apiKey);
  }
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const res = await this.client.embeddings.create({
      model: this.model,
      input: texts.map((t) => t.slice(0, 30000)),
      dimensions: this.dimensions,
    });
    return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}

export class OpenAITranscription implements TranscriptionProvider {
  readonly name = "openai";
  private client: OpenAI;
  constructor(
    readonly model: string,
    apiKey?: string,
  ) {
    this.client = client(apiKey);
  }
  async transcribe(audio: Buffer, mime: string, hint?: string): Promise<string> {
    const ext = mime.includes("wav") ? "wav" : mime.includes("mp4") || mime.includes("m4a") ? "m4a" : "mp3";
    const file = await toFile(audio, `audio.${ext}`, { type: mime });
    const res = await this.client.audio.transcriptions.create({
      file,
      model: this.model,
      ...(hint ? { prompt: hint } : {}),
      response_format: "text",
    });
    return typeof res === "string" ? res : (res as { text?: string }).text ?? "";
  }
}
