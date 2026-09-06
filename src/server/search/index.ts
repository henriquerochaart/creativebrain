import { sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import type { Reference } from "../db/schema";
import { embedQuery, toVectorLiteral } from "../pipeline/embed";
import { rrf } from "./rrf";
import { AIConfigError } from "../ai/types";

export type SearchMode = "hybrid" | "keyword" | "semantic" | "visual" | "conceptual";

export type SearchFilters = {
  platform?: string;
  subject?: string;
  format?: string;
  principle?: string;
  tag?: string;
  brand?: string;
  collectionId?: string;
  status?: string;
};

export type SearchHit = {
  reference: Reference;
  score: number;
  sources: Record<string, number>;
};

export type SearchResult = {
  query: string;
  mode: SearchMode;
  hits: SearchHit[];
  total: number;
  degraded?: string;
};

function filterSql(f: SearchFilters): SQL {
  const parts: SQL[] = [sql`r.status = ${f.status ?? "understood"}`];
  if (f.platform) parts.push(sql`r.source_platform = ${f.platform}`);
  if (f.subject) parts.push(sql`${f.subject} = ANY(r.subjects)`);
  if (f.format) parts.push(sql`${f.format} = ANY(r.formats)`);
  if (f.principle) parts.push(sql`${f.principle} = ANY(r.principles)`);
  if (f.tag) parts.push(sql`${f.tag} = ANY(r.tags)`);
  if (f.brand) parts.push(sql`lower(r.brand) = lower(${f.brand})`);
  if (f.collectionId) parts.push(sql`EXISTS (SELECT 1 FROM collection_items ci WHERE ci.reference_id = r.id AND ci.collection_id = ${f.collectionId})`);
  return sql.join(parts, sql` AND `);
}

async function keywordSearch(q: string, f: SearchFilters, limit: number) {
  const rows = await db.execute<{ id: string; score: number }>(sql`
    SELECT r.id, ts_rank_cd(r.fts, websearch_to_tsquery('simple', ${q})) AS score
    FROM "references" r
    WHERE ${filterSql(f)} AND r.fts @@ websearch_to_tsquery('simple', ${q})
    ORDER BY score DESC
    LIMIT ${limit}`);
  return rows.rows.map((r) => ({ id: r.id, score: Number(r.score) }));
}

async function vectorSearch(column: "embedding_content" | "embedding_visual" | "embedding_strategic" | "embedding_execution", vec: number[], f: SearchFilters, limit: number) {
  const col = sql.raw(column);
  const lit = toVectorLiteral(vec);
  const rows = await db.execute<{ id: string; score: number }>(sql`
    SELECT r.id, 1 - (r.${col} <=> ${lit}::vector) AS score
    FROM "references" r
    WHERE ${filterSql(f)} AND r.${col} IS NOT NULL
    ORDER BY r.${col} <=> ${lit}::vector
    LIMIT ${limit}`);
  return rows.rows.map((r) => ({ id: r.id, score: Number(r.score) }));
}

/** Lists references without a query (browse mode), newest first, with filters. */
export async function browse(f: SearchFilters, limit = 60, offset = 0): Promise<Reference[]> {
  const rows = await db.execute<Reference>(sql`
    SELECT r.* FROM "references" r WHERE ${filterSql(f)} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`);
  return rows.rows.map(mapRow);
}

/**
 * Hybrid search = keyword + semantic (content) + conceptual (strategic + execution) + visual, fused with RRF.
 * A single mode can be forced. Works with a text query or a pre-computed query vector (visual search by image).
 */
export async function search(query: string, opts: { mode?: SearchMode; filters?: SearchFilters; limit?: number; queryVector?: number[] } = {}): Promise<SearchResult> {
  const mode = opts.mode ?? "hybrid";
  const filters = opts.filters ?? {};
  const limit = opts.limit ?? 40;
  const per = Math.max(limit, 30);
  const q = query.trim();
  let degraded: string | undefined;

  let vec: number[] | null = opts.queryVector ?? null;
  if (!vec && q && mode !== "keyword") {
    try {
      vec = await embedQuery(q);
    } catch (err) {
      degraded = err instanceof AIConfigError ? "Embeddings not configured; keyword search only" : `Embedding failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const lists: { name: string; items: { id: string; score: number }[]; weight?: number }[] = [];
  if (q && (mode === "hybrid" || mode === "keyword")) lists.push({ name: "keyword", items: await keywordSearch(q, filters, per), weight: 1 });
  if (vec) {
    if (mode === "hybrid" || mode === "semantic") lists.push({ name: "semantic", items: await vectorSearch("embedding_content", vec, filters, per), weight: 1.2 });
    if (mode === "hybrid" || mode === "conceptual") {
      lists.push({ name: "strategic", items: await vectorSearch("embedding_strategic", vec, filters, per), weight: 0.8 });
      lists.push({ name: "execution", items: await vectorSearch("embedding_execution", vec, filters, per), weight: 0.8 });
    }
    if (mode === "hybrid" || mode === "visual") lists.push({ name: "visual", items: await vectorSearch("embedding_visual", vec, filters, per), weight: mode === "visual" ? 1.5 : 0.6 });
  }

  const fused = rrf(lists).slice(0, limit);
  if (!fused.length) return { query: q, mode, hits: [], total: 0, degraded };
  const ids = fused.map((f) => f.id);
  const rows = await db.execute<Reference>(sql`SELECT * FROM "references" WHERE id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
  const byId = new Map(rows.rows.map((r) => [r.id, mapRow(r)]));
  const hits: SearchHit[] = fused
    .filter((f) => byId.has(f.id))
    .map((f) => ({ reference: byId.get(f.id)!, score: f.score, sources: f.sources }));
  return { query: q, mode, hits, total: hits.length, degraded };
}

/** db.execute returns snake_case rows; map to the Drizzle camelCase shape used everywhere else. */
export function mapRow(r: Record<string, unknown>): Reference {
  const get = (k: string) => r[k];
  return {
    id: get("id"),
    originalUrl: get("original_url"),
    canonicalUrl: get("canonical_url"),
    sourcePlatform: get("source_platform"),
    mediaType: get("media_type"),
    title: get("title"),
    brand: get("brand"),
    thumbnailUrl: get("thumbnail_url"),
    mediaKey: get("media_key"),
    mediaMime: get("media_mime"),
    mediaBytes: get("media_bytes"),
    status: get("status"),
    processingStep: get("processing_step"),
    error: get("error"),
    metadata: get("metadata") ?? {},
    content: get("content") ?? {},
    ai: get("ai") ?? {},
    subjects: get("subjects") ?? [],
    formats: get("formats") ?? [],
    tags: get("tags") ?? [],
    principles: get("principles") ?? [],
    concepts: get("concepts") ?? [],
    saved: get("saved") ?? false,
    userNote: get("user_note"),
    embeddingContent: null,
    embeddingVisual: null,
    embeddingStrategic: null,
    embeddingExecution: null,
    searchText: null,
    fts: null as unknown as string,
    createdAt: new Date(get("created_at") as string),
    updatedAt: new Date(get("updated_at") as string),
    processedAt: get("processed_at") ? new Date(get("processed_at") as string) : null,
  } as Reference;
}
