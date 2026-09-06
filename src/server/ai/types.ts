import type { z } from "zod";

export type AIImage = { mime: string; data: Buffer };
export type AIDocument = { mime: "application/pdf"; data: Buffer; name?: string };

export type ChatTurn = { role: "user" | "assistant"; content: string };

export interface AnalyzeInput<T> {
  system: string;
  prompt: string;
  images?: AIImage[];
  documents?: AIDocument[];
  schema: z.ZodType<T>;
  /** Short name for the schema (used by providers that need a schema name). */
  schemaName?: string;
  maxTokens?: number;
}

export interface StreamInput {
  system: string;
  prompt: string;
  history?: ChatTurn[];
  images?: AIImage[];
  maxTokens?: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  /** Multimodal analysis returning a validated object. */
  analyze<T>(input: AnalyzeInput<T>): Promise<T>;
  /** Streamed free-form text answer. */
  streamText(input: StreamInput): AsyncIterable<string>;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface TranscriptionProvider {
  readonly name: string;
  transcribe(audio: Buffer, mime: string, hint?: string): Promise<string>;
}

export class AIConfigError extends Error {}
