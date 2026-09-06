/** Data access used by both the API routes and the server components. */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { collectionItems, collections, referenceRelations, references, type Reference } from "./db/schema";
import { detectPlatform, isProbablyUrl, normalizeUrl } from "./connectors";
import { enqueueIngest } from "./queue";
import { extensionFor, getStorage } from "./storage";
import { SIMILARITY_KINDS, slugify, type SimilarityKind } from "./taxonomy";
import { nearest } from "./pipeline/relate";
import { mapRow } from "./search";

export type PublicReference = Omit<Reference, "embeddingContent" | "embeddingVisual" | "embeddingStrategic" | "embeddingExecution" | "searchText" | "fts">;

export function toPublic(r: Reference): PublicReference {
  const { embeddingContent: _a, embeddingVisual: _b, embeddingStrategic: _c, embeddingExecution: _d, searchText: _e, fts: _f, ...rest } = r;
  return rest;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export async function getReference(id: string): Promise<Reference | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(references).where(eq(references.id, id));
  return row ?? null;
}

export async function listReferences(opts: { status?: string; limit?: number; offset?: number; saved?: boolean } = {}) {
  const conds = [];
  if (opts.status) conds.push(eq(references.status, opts.status));
  if (opts.saved !== undefined) conds.push(eq(references.saved, opts.saved));
  return db
    .select()
    .from(references)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(references.createdAt))
    .limit(opts.limit ?? 60)
    .offset(opts.offset ?? 0);
}

export async function findByUrl(url: string): Promise<Reference | null> {
  const [row] = await db
    .select()
    .from(references)
    .where(sql`${references.originalUrl} = ${url} OR ${references.canonicalUrl} = ${url}`)
    .limit(1);
  return row ?? null;
}

/**
 * Capture from the big input: a URL becomes a reference to resolve; free text becomes a "text" reference
 * (an idea, a piece of copy, a note) that still gets understood and embedded.
 */
export async function captureInput(input: string, opts: { note?: string; collectionId?: string } = {}) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Empty input");
  let inserted: Reference;
  if (isProbablyUrl(trimmed)) {
    const url = normalizeUrl(trimmed);
    const existing = await findByUrl(url);
    if (existing) return { reference: existing, duplicate: true as const };
    const platform = detectPlatform(url);
    const mediaType = platform === "pdf" ? "pdf" : platform === "image" ? "image" : platform === "video" || platform === "youtube" || platform === "tiktok" ? "video" : "website";
    [inserted] = await db
      .insert(references)
      .values({ originalUrl: url, sourcePlatform: platform, mediaType, title: url, userNote: opts.note ?? null, status: "queued" })
      .returning();
  } else {
    [inserted] = await db
      .insert(references)
      .values({
        sourcePlatform: "text",
        mediaType: "text",
        title: trimmed.split("\n")[0].slice(0, 120),
        content: { pageText: trimmed, userNote: opts.note ?? null },
        userNote: opts.note ?? null,
        metadata: { title: trimmed.split("\n")[0].slice(0, 120) },
        status: "queued",
      })
      .returning();
  }
  if (opts.collectionId) await addToCollection(opts.collectionId, inserted.id);
  await enqueueIngest(inserted.id);
  return { reference: inserted, duplicate: false as const };
}

export async function captureUpload(file: { name: string; mime: string; data: Buffer }, opts: { note?: string; collectionId?: string } = {}) {
  const mime = file.mime || "application/octet-stream";
  const mediaType = mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "image" : mime === "application/pdf" ? "pdf" : mime.startsWith("audio/") ? "audio" : mime.startsWith("text/") ? "text" : "other";
  if (mediaType === "other") throw new Error(`Unsupported file type: ${mime}`);
  const platform = mediaType === "audio" ? "other" : mediaType === "text" ? "text" : mediaType;
  const [inserted] = await db
    .insert(references)
    .values({
      sourcePlatform: platform,
      mediaType,
      title: file.name,
      metadata: { title: file.name, fileName: file.name },
      mediaMime: mime,
      mediaBytes: file.data.length,
      userNote: opts.note ?? null,
      status: "queued",
    })
    .returning();
  const stored = await getStorage().put(`references/${inserted.id}/media.${extensionFor(mime)}`, file.data, mime);
  const [updated] = await db
    .update(references)
    .set({ mediaKey: stored.key, thumbnailUrl: mediaType === "image" ? stored.url : null })
    .where(eq(references.id, inserted.id))
    .returning();
  if (opts.collectionId) await addToCollection(opts.collectionId, inserted.id);
  await enqueueIngest(inserted.id);
  return updated;
}

export async function reprocessReference(id: string) {
  await db.update(references).set({ status: "queued", error: null, processingStep: null }).where(eq(references.id, id));
  return enqueueIngest(id);
}

export async function updateReference(id: string, patch: { saved?: boolean; userNote?: string | null; title?: string; tags?: string[]; subjects?: string[]; formats?: string[]; principles?: string[] }) {
  const [row] = await db
    .update(references)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(references.id, id))
    .returning();
  return row ?? null;
}

export async function deleteReference(id: string) {
  const ref = await getReference(id);
  if (!ref) return false;
  await db.delete(references).where(eq(references.id, id));
  const storage = getStorage();
  if (ref.mediaKey) await storage.delete(ref.mediaKey).catch(() => undefined);
  return true;
}

export type SimilarSet = Record<SimilarityKind, { reference: PublicReference; score: number }[]>;

/** Similar references in four dimensions: visual, conceptual, strategic, execution. */
export async function similarReferences(id: string, perKind = 6): Promise<SimilarSet> {
  const out = {} as SimilarSet;
  const ids = new Set<string>();
  const raw: Record<string, { id: string; score: number }[]> = {};
  for (const kind of SIMILARITY_KINDS) {
    raw[kind] = await nearest(id, kind, perKind);
    raw[kind].forEach((r) => ids.add(r.id));
  }
  const rows = ids.size ? await db.select().from(references).where(inArray(references.id, [...ids])) : [];
  const byId = new Map(rows.map((r) => [r.id, toPublic(r)]));
  for (const kind of SIMILARITY_KINDS) {
    out[kind] = raw[kind].filter((r) => byId.has(r.id)).map((r) => ({ reference: byId.get(r.id)!, score: Math.round(r.score * 100) / 100 }));
  }
  return out;
}

/** Union of all similarity kinds, deduplicated and ranked by best score — used for the RELATED strip. */
export async function relatedReferences(id: string, limit = 8) {
  const sets = await similarReferences(id, limit);
  const best = new Map<string, { reference: PublicReference; score: number; kinds: SimilarityKind[] }>();
  for (const kind of SIMILARITY_KINDS) {
    for (const s of sets[kind]) {
      const cur = best.get(s.reference.id);
      if (!cur) best.set(s.reference.id, { reference: s.reference, score: s.score, kinds: [kind] });
      else {
        cur.kinds.push(kind);
        cur.score = Math.max(cur.score, s.score);
      }
    }
  }
  return [...best.values()].sort((a, b) => b.kinds.length - a.kinds.length || b.score - a.score).slice(0, limit);
}

// ---------- Collections ----------

export async function listCollections() {
  const rows = await db.execute<{ id: string; name: string; slug: string; emoji: string | null; description: string | null; position: number; auto: boolean; count: number; cover: string | null }>(sql`
    SELECT c.id, c.name, c.slug, c.emoji, c.description, c.position, c.auto,
      (SELECT count(*) FROM collection_items ci WHERE ci.collection_id = c.id)::int AS count,
      (SELECT r.thumbnail_url FROM collection_items ci JOIN "references" r ON r.id = ci.reference_id WHERE ci.collection_id = c.id AND r.thumbnail_url IS NOT NULL ORDER BY ci.added_at DESC LIMIT 1) AS cover
    FROM collections c ORDER BY c.position, c.created_at`);
  return rows.rows;
}

export async function getCollection(idOrSlug: string) {
  const [row] = await db
    .select()
    .from(collections)
    .where(isUuid(idOrSlug) ? eq(collections.id, idOrSlug) : eq(collections.slug, idOrSlug))
    .limit(1);
  return row ?? null;
}

export async function createCollection(input: { name: string; emoji?: string | null; description?: string | null }) {
  const base = slugify(input.name) || "collection";
  let slug = base;
  for (let i = 2; await getCollection(slug); i++) slug = `${base}-${i}`;
  const [{ max }] = await db.execute<{ max: number | null }>(sql`SELECT max(position) AS max FROM collections`).then((r) => r.rows);
  const [row] = await db
    .insert(collections)
    .values({ name: input.name.trim(), slug, emoji: input.emoji ?? null, description: input.description ?? null, position: (max ?? 0) + 1 })
    .returning();
  return row;
}

export async function updateCollection(id: string, patch: { name?: string; emoji?: string | null; description?: string | null; position?: number }) {
  const [row] = await db.update(collections).set(patch).where(eq(collections.id, id)).returning();
  return row ?? null;
}

export async function deleteCollection(id: string) {
  const res = await db.delete(collections).where(eq(collections.id, id)).returning({ id: collections.id });
  return res.length > 0;
}

export async function addToCollection(collectionId: string, referenceId: string) {
  await db.insert(collectionItems).values({ collectionId, referenceId }).onConflictDoNothing();
}

export async function removeFromCollection(collectionId: string, referenceId: string) {
  await db.delete(collectionItems).where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.referenceId, referenceId)));
}

export async function collectionReferences(collectionId: string, limit = 200) {
  const rows = await db.execute<Record<string, unknown>>(sql`
    SELECT r.* FROM collection_items ci JOIN "references" r ON r.id = ci.reference_id
    WHERE ci.collection_id = ${collectionId} ORDER BY ci.added_at DESC LIMIT ${limit}`);
  return rows.rows.map(mapRow);
}

export async function collectionsOfReference(referenceId: string) {
  return db
    .select({ id: collections.id, name: collections.name, slug: collections.slug, emoji: collections.emoji })
    .from(collectionItems)
    .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
    .where(eq(collectionItems.referenceId, referenceId));
}

// ---------- Aggregates: concepts, brands, principles, patterns ----------

export async function facetCounts(column: "tags" | "concepts" | "principles" | "subjects" | "formats", limit = 100) {
  const col = sql.raw(column);
  const rows = await db.execute<{ value: string; count: number }>(sql`
    SELECT v AS value, count(*)::int AS count FROM "references" r, unnest(r.${col}) v
    WHERE r.status = 'understood' GROUP BY v ORDER BY count DESC, v LIMIT ${limit}`);
  return rows.rows;
}

export async function brandCounts(limit = 100) {
  const rows = await db.execute<{ value: string; count: number }>(sql`
    SELECT brand AS value, count(*)::int AS count FROM "references"
    WHERE status = 'understood' AND brand IS NOT NULL AND brand <> '' GROUP BY brand ORDER BY count DESC, brand LIMIT ${limit}`);
  return rows.rows;
}

export async function platformCounts() {
  const rows = await db.execute<{ value: string; count: number }>(sql`
    SELECT source_platform AS value, count(*)::int AS count FROM "references" GROUP BY source_platform ORDER BY count DESC`);
  return rows.rows;
}

export async function statusCounts() {
  const rows = await db.execute<{ status: string; count: number }>(sql`SELECT status, count(*)::int AS count FROM "references" GROUP BY status`);
  return Object.fromEntries(rows.rows.map((r) => [r.status, r.count])) as Record<string, number>;
}

export async function graphEdges(limit = 500) {
  return db.select().from(referenceRelations).orderBy(desc(referenceRelations.score)).limit(limit);
}
