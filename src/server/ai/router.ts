/**
 * AI Router — the Brain is model agnostic. Each capability (reasoning+vision, embeddings,
 * speech-to-text) is resolved from env to a provider. Swap providers without touching the pipeline.
 */
import { env } from "../env";
import type { EmbeddingProvider, LLMProvider, TranscriptionProvider } from "./types";
import { AIConfigError } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIEmbeddings, OpenAIProvider, OpenAITranscription } from "./providers/openai";
import { GeminiEmbeddings, GeminiProvider, GeminiTranscription } from "./providers/gemini";
import { VoyageEmbeddings } from "./providers/voyage";
import { MockEmbeddings, MockLLM } from "./providers/mock";

let llm: LLMProvider | null = null;
let embedder: EmbeddingProvider | null = null;
let transcriber: TranscriptionProvider | null | undefined;

export function getLLM(): LLMProvider {
  if (llm) return llm;
  const { llmProvider, llmModel, anthropicKey, openaiKey, geminiKey } = env.ai;
  switch (llmProvider) {
    case "anthropic":
      llm = new AnthropicProvider(llmModel, anthropicKey || undefined);
      break;
    case "openai":
      llm = new OpenAIProvider(llmModel, openaiKey || undefined);
      break;
    case "gemini":
      llm = new GeminiProvider(llmModel, geminiKey || undefined);
      break;
    case "mock":
      llm = new MockLLM();
      break;
    default:
      throw new AIConfigError(`Unknown LLM_PROVIDER: ${llmProvider}`);
  }
  return llm;
}

export function getEmbedder(): EmbeddingProvider {
  if (embedder) return embedder;
  const { embeddingProvider, embeddingModel, embeddingDimensions, openaiKey, geminiKey, voyageKey } = env.ai;
  switch (embeddingProvider) {
    case "openai":
      embedder = new OpenAIEmbeddings(embeddingModel, embeddingDimensions, openaiKey || undefined);
      break;
    case "gemini":
      embedder = new GeminiEmbeddings(embeddingModel, embeddingDimensions, geminiKey || undefined);
      break;
    case "voyage":
      embedder = new VoyageEmbeddings(embeddingModel, embeddingDimensions, voyageKey || undefined);
      break;
    case "mock":
      embedder = new MockEmbeddings(embeddingDimensions);
      break;
    default:
      throw new AIConfigError(`Unknown EMBEDDING_PROVIDER: ${embeddingProvider}`);
  }
  return embedder;
}

/** Returns null when transcription is disabled or unconfigured; the pipeline then skips the step. */
export function getTranscriber(): TranscriptionProvider | null {
  if (transcriber !== undefined) return transcriber;
  const { transcriptionProvider, transcriptionModel, openaiKey, geminiKey } = env.ai;
  try {
    switch (transcriptionProvider) {
      case "openai":
        transcriber = new OpenAITranscription(transcriptionModel, openaiKey || undefined);
        break;
      case "gemini":
        transcriber = new GeminiTranscription(transcriptionModel, geminiKey || undefined);
        break;
      default:
        transcriber = null;
    }
  } catch (err) {
    if (err instanceof AIConfigError) transcriber = null;
    else throw err;
  }
  return transcriber;
}

/** Health summary for the UI/settings; never throws. */
export function aiStatus() {
  const probe = (fn: () => unknown) => {
    try {
      fn();
      return "ok" as const;
    } catch (err) {
      return err instanceof AIConfigError ? ("unconfigured" as const) : ("error" as const);
    }
  };
  return {
    llm: { provider: env.ai.llmProvider, model: env.ai.llmModel, status: probe(getLLM) },
    embeddings: {
      provider: env.ai.embeddingProvider,
      model: env.ai.embeddingModel,
      dimensions: env.ai.embeddingDimensions,
      status: probe(getEmbedder),
    },
    transcription: {
      provider: env.ai.transcriptionProvider,
      model: env.ai.transcriptionModel,
      status: getTranscriber() ? ("ok" as const) : ("unconfigured" as const),
    },
  };
}

/** Test hook: reset cached providers after env changes. */
export function resetAIRouter() {
  llm = null;
  embedder = null;
  transcriber = undefined;
}
