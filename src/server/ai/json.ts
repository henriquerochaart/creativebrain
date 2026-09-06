import { z } from "zod";

/** Extracts the first JSON object from a model response that may contain fences or prose. */
export function parseJsonLoose<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const candidates = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));
  let lastError: unknown;
  for (const c of candidates) {
    try {
      return schema.parse(JSON.parse(c));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not parse model JSON");
}

/** zod 4 ships JSON Schema generation natively. */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
}
