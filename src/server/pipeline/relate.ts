import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { referenceRelations } from "../db/schema";
import { SIMILARITY_KINDS, type SimilarityKind } from "../taxonomy";

const COLUMN: Record<SimilarityKind, string> = {
  conceptual: "embedding_content",
  visual: "embedding_visual",
  strategic: "embedding_strategic",
  execution: "embedding_execution",
};

export type SimilarRow = { id: string; score: number };

/**
 * Nearest neighbours of a reference for one similarity kind, by cosine similarity, within the
 * library it belongs to: references never relate across accounts.
 */
export async function nearest(referenceId: string, kind: SimilarityKind, limit = 8): Promise<SimilarRow[]> {
  const col = sql.raw(COLUMN[kind]);
  // The source's vector and owner first, then an exact ranking over that one library (the OFFSET 0
  // fence keeps the planner from a global index scan that would filter its first candidates away).
  const rows = await db.execute<{ id: string; score: number }>(sql`
    SELECT id, score FROM (
      SELECT r.id, 1 - (r.${col} <=> s.${col}) AS score
      FROM "references" r
      JOIN "references" s ON s.id = ${referenceId}
      WHERE r.user_id = s.user_id AND r.id <> ${referenceId} AND r.${col} IS NOT NULL AND s.${col} IS NOT NULL AND r.status = 'understood'
      OFFSET 0
    ) t
    ORDER BY score DESC
    LIMIT ${limit}
  `);
  return rows.rows.map((r) => ({ id: r.id, score: Number(r.score) }));
}

/** Rebuilds the outgoing edges of one reference in the knowledge graph. */
export async function rebuildRelations(referenceId: string, perKind = 5) {
  const edges: { sourceId: string; targetId: string; kind: string; score: number }[] = [];
  for (const kind of SIMILARITY_KINDS) {
    const rows = await nearest(referenceId, kind, perKind);
    for (const r of rows) edges.push({ sourceId: referenceId, targetId: r.id, kind, score: r.score });
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM reference_relations WHERE source_id = ${referenceId} AND kind IN ('visual','conceptual','strategic','execution')`);
    if (edges.length) await tx.insert(referenceRelations).values(edges).onConflictDoNothing();
  });
  return edges;
}
