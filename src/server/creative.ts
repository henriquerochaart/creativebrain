/**
 * V2 creative layers: moodboard generator, creative assistant, auto collections, taste narrative.
 */
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "./db/client";
import { boards, collectionItems, collections, conversations, references, type Reference } from "./db/schema";
import { getLLM } from "./ai/router";
import { ASSIST_SYSTEM, AUTO_COLLECTIONS_SYSTEM, MOODBOARD_SYSTEM, NARRATIVE_SYSTEM } from "./ai/prompts";
import { AutoCollectionsSchema, MoodboardSchema, NarrativeSchema, type AutoCollections, type Moodboard, type Narrative } from "./ai/schemas";
import { referenceDigest } from "./search/explain";
import { search } from "./search";
import { addToCollection, brandCounts, createCollection, facetCounts, statusCounts, toPublic } from "./references";
import { trends, understoodSample } from "./insights";

// ---------- Moodboard generator ----------

export async function generateMoodboard(brief: string) {
  const result = await search(brief, { mode: "hybrid", limit: 40 });
  const refs = result.hits.map((h) => h.reference);
  const digest = refs.map((r) => referenceDigest(r, { withId: true })).join("\n\n");
  const board: Moodboard = await getLLM().analyze({
    system: MOODBOARD_SYSTEM,
    prompt: `Brief: "${brief}"\n\nAvailable references (${refs.length}):\n\n${digest || "(none)"}\n\nAssemble the moodboard.`,
    schema: MoodboardSchema,
    schemaName: "moodboard",
  });
  const used = new Set(board.directions.flatMap((d) => d.referenceIds));
  const byId = Object.fromEntries(refs.filter((r) => used.has(r.id)).map((r) => [r.id, toPublic(r)]));
  const [saved] = await db
    .insert(boards)
    .values({ title: board.title, brief, payload: { board, referenceIds: [...used], degraded: result.degraded ?? null } })
    .returning();
  return { board: saved, analysis: board, references: byId };
}

export async function listBoards() {
  const rows = await db.select().from(boards).orderBy(desc(boards.createdAt)).limit(100);
  return rows;
}

export async function getBoard(id: string) {
  const [row] = await db.select().from(boards).where(eq(boards.id, id));
  if (!row) return null;
  const ids = ((row.payload as { referenceIds?: string[] }).referenceIds ?? []).filter(Boolean);
  const refs = ids.length ? await db.select().from(references).where(inArray(references.id, ids)) : [];
  return { board: row, analysis: (row.payload as { board: Moodboard }).board, references: Object.fromEntries(refs.map((r) => [r.id, toPublic(r)])) };
}

export async function deleteBoard(id: string) {
  const res = await db.delete(boards).where(eq(boards.id, id)).returning({ id: boards.id });
  return res.length > 0;
}

// ---------- Creative assistant ----------

export async function assistContext(idea: string) {
  const result = await search(idea, { mode: "hybrid", limit: 24 });
  const refs = result.hits.map((h) => h.reference);
  const digest = refs.map((r) => referenceDigest(r, { withId: false })).join("\n\n");
  return { refs, system: `${ASSIST_SYSTEM}\n\nREPERTOIRE RETRIEVED FOR THIS IDEA (${refs.length} references):\n\n${digest || "(empty repertoire)"}`, degraded: result.degraded };
}

export function assistStream(idea: string, history: { role: "user" | "assistant"; content: string }[], system: string) {
  return getLLM().streamText({ system, history: history.slice(-8), prompt: idea, maxTokens: 12000 });
}

export async function saveAssistConversation(idea: string, answer: string, referenceIds: string[]) {
  await db.insert(conversations).values({ mode: "assist", question: idea, answer, payload: { referenceIds } });
}

// ---------- Auto collections ----------

export type AutoCollectionProposal = AutoCollections["collections"][number] & { existing: boolean };

export async function proposeCollections(): Promise<{ proposals: AutoCollectionProposal[]; sample: number; references: Record<string, ReturnType<typeof toPublic>> }> {
  const refs = await understoodSample(150);
  const existing = await db.select({ name: collections.name }).from(collections);
  const digest = refs
    .map((r) => `[${r.id}] ${r.title}${r.brand ? ` — ${r.brand}` : ""} · ${r.ai.creativeMechanism ?? ""} · ${r.principles.join(", ")} · ${r.tags.slice(0, 6).join(" ")}`)
    .join("\n");
  const out: AutoCollections = await getLLM().analyze({
    system: AUTO_COLLECTIONS_SYSTEM,
    prompt: `Existing collections (do not duplicate): ${existing.map((e) => e.name).join(", ") || "none"}\n\nRepertoire (${refs.length}):\n${digest || "(empty)"}`,
    schema: AutoCollectionsSchema,
    schemaName: "auto_collections",
  });
  const valid = new Set(refs.map((r) => r.id));
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));
  const proposals = out.collections
    .map((c) => ({ ...c, referenceIds: c.referenceIds.filter((id) => valid.has(id)), existing: existingNames.has(c.name.toLowerCase()) }))
    .filter((c) => c.referenceIds.length >= 2);
  const used = new Set(proposals.flatMap((p) => p.referenceIds));
  return { proposals, sample: refs.length, references: Object.fromEntries(refs.filter((r) => used.has(r.id)).map((r) => [r.id, toPublic(r)])) };
}

export async function acceptProposal(p: { name: string; emoji?: string | null; rationale?: string | null; referenceIds: string[] }) {
  const col = await createCollection({ name: p.name, emoji: p.emoji ?? null, description: p.rationale ?? null });
  await db.update(collections).set({ auto: true }).where(eq(collections.id, col.id));
  for (const id of p.referenceIds) await addToCollection(col.id, id);
  return col;
}

// ---------- Taste narrative ("Things you seem to like") ----------

export async function tasteNarrative(): Promise<Narrative> {
  const [principles, subjects, formats, concepts, brands, status, rising, sample] = await Promise.all([
    facetCounts("principles", 12),
    facetCounts("subjects", 8),
    facetCounts("formats", 8),
    facetCounts("concepts", 20),
    brandCounts(10),
    statusCounts(),
    trends("tags", 30, 90, 8),
    understoodSample(40),
  ]);
  const stats = [
    `Understood references: ${status.understood ?? 0}`,
    `Principles: ${principles.map((p) => `${p.value} ${p.count}`).join(", ")}`,
    `Subjects: ${subjects.map((p) => `${p.value} ${p.count}`).join(", ")}`,
    `Formats: ${formats.map((p) => `${p.value} ${p.count}`).join(", ")}`,
    `Concepts: ${concepts.map((p) => `${p.value} ${p.count}`).join(", ")}`,
    `Brands: ${brands.map((p) => `${p.value} ${p.count}`).join(", ")}`,
    `Rising in the last 30 days: ${rising.map((t) => `${t.value} ×${t.lift}`).join(", ") || "n/a"}`,
  ].join("\n");
  const digest = sample.map((r: Reference) => referenceDigest(r)).join("\n\n");
  return getLLM().analyze({
    system: NARRATIVE_SYSTEM,
    prompt: `Statistics:\n${stats}\n\nRecent sample (${sample.length}):\n\n${digest}`,
    schema: NarrativeSchema,
    schemaName: "narrative",
  });
}

export async function collectionMembership(referenceIds: string[]) {
  if (!referenceIds.length) return [];
  return db.select().from(collectionItems).where(inArray(collectionItems.referenceId, referenceIds));
}
