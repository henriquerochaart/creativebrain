import { z } from "zod";

/**
 * What each API route accepts, field by field. A body is parsed against its schema before it
 * reaches the database: unknown fields are dropped (never spread into an UPDATE), types and sizes
 * are checked, and anything else is a 400. Sizes are generous for people and tight for scripts.
 */

const text = (max: number) => z.string().trim().max(max);
const words = z.array(z.string().trim().min(1).max(80)).max(50);
const uuid = z.string().uuid();
/**
 * A conversation so far. Clients send all of it; only the recent part reaches a model, so a long
 * conversation is trimmed here (last 20 turns, 8000 characters each) instead of being refused.
 */
const history = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(200_000) }))
  .max(1000)
  .transform((turns) => turns.slice(-20).map((t) => ({ role: t.role, content: t.content.slice(0, 8000) })))
  .optional();

export const referencePatch = z.object({
  saved: z.boolean().optional(),
  userNote: text(5000).nullable().optional(),
  title: text(300).min(1).optional(),
  tags: words.optional(),
  subjects: words.optional(),
  formats: words.optional(),
  principles: words.optional(),
});

export const collectionCreate = z.object({ name: text(80).min(1), emoji: text(16).nullable().optional(), description: text(500).nullable().optional() });
export const collectionPatch = z.object({
  name: text(80).min(1).optional(),
  emoji: text(16).nullable().optional(),
  description: text(500).nullable().optional(),
  position: z.number().int().min(0).max(100_000).optional(),
});
export const collectionAccept = z.object({ name: text(80).min(1), emoji: text(16).nullable().optional(), rationale: text(2000).nullable().optional(), referenceIds: z.array(uuid).max(2000).optional() });
export const referenceIdBody = z.object({ referenceId: uuid, note: text(2000).optional() });

export const projectCreate = z.object({ name: text(120).min(1), brief: text(5000).optional() });
export const projectPatch = z.object({ name: text(120).min(1).optional(), brief: text(5000).nullable().optional(), status: z.enum(["open", "archived"]).optional() });

export const captureBody = z.object({ input: text(10_000).min(1), note: text(5000).optional(), collectionId: uuid.optional() });
export const moodboardBody = z.object({ brief: text(2000).min(1) });
export const thinkBody = z.object({ query: text(2000).min(1), history });
export const assistBody = z.object({ idea: text(4000).min(1), history });
export const askBody = z.object({ question: text(2000).min(1), history });
export const explainBody = z.object({ query: text(2000).min(1), ids: z.array(uuid).max(60).optional() });
export const imageUrlBody = z.object({ imageUrl: z.string().url().max(2048) });

export const passwordChange = z.object({ current: z.string().max(200), next: z.string().max(200) });
export const accountDelete = z.object({ password: z.string().max(200) });

/** Parses a JSON body against a schema: the data, or a 400 Response that names the first problem. */
export async function parseBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, response: Response.json({ error: `Invalid ${issue?.path.join(".") || "body"}` }, { status: 400 }) };
  }
  return { ok: true, data: parsed.data };
}

/** A positive integer query parameter, clamped, with a default for anything else (never NaN). */
export function intParam(value: string | null, fallback: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}
