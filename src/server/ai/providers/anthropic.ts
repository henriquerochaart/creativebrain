import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AnalyzeInput, LLMProvider, StreamInput, AIImage } from "../types";
import { AIConfigError } from "../types";

type ImageMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function imageBlock(img: AIImage): Anthropic.ImageBlockParam {
  return {
    type: "image",
    source: { type: "base64", media_type: img.mime as ImageMedia, data: img.data.toString("base64") },
  };
}

/**
 * Claude via the official SDK. Structured outputs through `messages.parse`,
 * images and PDFs as native content blocks, adaptive thinking left on (default on Opus 5).
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(
    readonly model: string,
    apiKey?: string,
  ) {
    if (!apiKey && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new AIConfigError("ANTHROPIC_API_KEY is not set");
    }
    this.client = new Anthropic(apiKey ? { apiKey } : {});
  }

  async analyze<T>(input: AnalyzeInput<T>): Promise<T> {
    const content: Anthropic.ContentBlockParam[] = [];
    for (const doc of input.documents ?? []) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: doc.data.toString("base64") },
        ...(doc.name ? { title: doc.name } : {}),
      });
    }
    for (const img of input.images ?? []) content.push(imageBlock(img));
    content.push({ type: "text", text: input.prompt });

    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: input.maxTokens ?? 16000,
      system: input.system,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(input.schema) },
    });

    if (response.stop_reason === "refusal") {
      throw new Error(`Model refused the request${response.stop_details ? `: ${response.stop_details.category ?? ""}` : ""}`);
    }
    if (!response.parsed_output) throw new Error("Model returned no parseable output");
    return response.parsed_output;
  }

  async *streamText(input: StreamInput): AsyncIterable<string> {
    const messages: Anthropic.MessageParam[] = [];
    for (const turn of input.history ?? []) messages.push({ role: turn.role, content: turn.content });
    const content: Anthropic.ContentBlockParam[] = [];
    for (const img of input.images ?? []) content.push(imageBlock(img));
    content.push({ type: "text", text: input.prompt });
    messages.push({ role: "user", content });

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: input.maxTokens ?? 8000,
      system: input.system,
      messages,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
    }
  }
}
