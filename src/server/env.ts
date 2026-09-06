/**
 * Central, typed access to environment configuration.
 * Every value has a safe default so the app boots in dev without a full .env.
 */
function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}
function int(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const env = {
  databaseUrl: str("DATABASE_URL", "postgres://brain:brain@localhost:5432/brain"),
  appUrl: str("APP_URL", "http://localhost:3000").replace(/\/$/, ""),
  apiKey: str("BRAIN_API_KEY"),
  processingMode: str("PROCESSING_MODE", "inline") as "inline" | "worker",

  storage: {
    driver: str("STORAGE_DRIVER", "local") as "local" | "s3",
    localDir: str("STORAGE_LOCAL_DIR", "./storage"),
    s3: {
      bucket: str("S3_BUCKET"),
      region: str("S3_REGION", "auto"),
      endpoint: str("S3_ENDPOINT"),
      accessKeyId: str("S3_ACCESS_KEY_ID"),
      secretAccessKey: str("S3_SECRET_ACCESS_KEY"),
      publicUrl: str("S3_PUBLIC_URL").replace(/\/$/, ""),
    },
  },

  ai: {
    llmProvider: str("LLM_PROVIDER", "anthropic") as "anthropic" | "openai" | "gemini" | "mock",
    llmModel: str("LLM_MODEL", "claude-opus-5"),
    embeddingProvider: str("EMBEDDING_PROVIDER", "openai") as "openai" | "gemini" | "voyage" | "mock",
    embeddingModel: str("EMBEDDING_MODEL", "text-embedding-3-small"),
    embeddingDimensions: int("EMBEDDING_DIMENSIONS", 1536),
    transcriptionProvider: str("TRANSCRIPTION_PROVIDER", "openai") as "openai" | "gemini" | "none",
    transcriptionModel: str("TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe"),
    anthropicKey: str("ANTHROPIC_API_KEY"),
    openaiKey: str("OPENAI_API_KEY"),
    geminiKey: str("GEMINI_API_KEY"),
    voyageKey: str("VOYAGE_API_KEY"),
  },

  connectors: {
    instagramOembedToken: str("INSTAGRAM_OEMBED_TOKEN"),
    youtubeApiKey: str("YOUTUBE_API_KEY"),
    mediaFetcher: str("MEDIA_FETCHER", "none") as "none" | "yt-dlp",
    ytDlpPath: str("YT_DLP_PATH", "yt-dlp"),
    ffmpegPath: str("FFMPEG_PATH", "ffmpeg"),
    ffprobePath: str("FFPROBE_PATH", "ffprobe"),
  },
} as const;
