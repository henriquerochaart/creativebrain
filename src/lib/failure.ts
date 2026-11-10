import type { Dict } from "./i18n";

type Kind = keyof Omit<Dict["failure"], "details">;

/**
 * What a failed reference's stored error means for the reader. The pipeline stores the raw message
 * (useful in logs, in English, often technical); the screen shows one localized line for its kind.
 */
export function failureKind(error: string | null | undefined): Kind {
  const e = error ?? "";
  if (/stopped before finishing/i.test(e)) return "stopped";
  if (/refused/i.test(e)) return "refused";
  if (/\bmodel\b|anthropic|gemini|openai|overloaded|high demand|unavailable|resource_exhausted|quota|\b529\b|embeddings failed|api key|rate.?limit/i.test(e)) return "model";
  if (/storage|ffprobe|ffmpeg|pdf|media|decode|unsupported/i.test(e)) return "media";
  if (/fetch|ENOTFOUND|ECONN|EAI_AGAIN|timed? ?out|abort|blocked|status \d{3}|\b(40[0-9]|5\d\d)\b|redirect|certificate/i.test(e)) return "fetch";
  return "generic";
}

export function failureText(d: Dict, error: string | null | undefined): string {
  return d.failure[failureKind(error)];
}
