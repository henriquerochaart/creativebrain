/**
 * V2 intelligence layers over the repertoire: trends, personal taste, discovery, knowledge graph data.
 * Deterministic SQL/JS; the LLM narrative sits on top in `narrative.ts`.
 */
import { sql } from "drizzle-orm";
import { db } from "./db/client";
import { referenceEvents, references, referenceRelations } from "./db/schema";
import { toVectorLiteral } from "./pipeline/embed";
import { mapRow } from "./search";
import { toPublic, type PublicReference } from "./references";

// ---------- Events ----------

export type EventKind = "view" | "ask" | "save" | "collect" | "project";
export async function recordEvent(referenceId: string, kind: EventKind) {
  await db.insert(referenceEvents).values({ referenceId, kind }).catch(() => undefined);
}

// ---------- Trends: what am I saving a lot lately? ----------

export type Trend = { value: string; recent: number; prior: number; lift: number };

export async function trends(column: "tags" | "principles" | "subjects" | "formats" | "concepts", recentDays = 30, priorDays = 90, limit = 12): Promise<Trend[]> {
  const col = sql.raw(column);
  const rows = await db.execute<{ value: string; recent: number; prior: number }>(sql`
    WITH recent AS (
      SELECT v AS value, count(*)::int AS n FROM "references" r, unnest(r.${col}) v
      WHERE r.status = 'understood' AND r.created_at > now() - make_interval(days => ${recentDays}) GROUP BY v),
    prior AS (
      SELECT v AS value, count(*)::int AS n FROM "references" r, unnest(r.${col}) v
      WHERE r.status = 'understood' AND r.created_at <= now() - make_interval(days => ${recentDays})
        AND r.created_at > now() - make_interval(days => ${recentDays + priorDays}) GROUP BY v)
    SELECT coalesce(recent.value, prior.value) AS value, coalesce(recent.n, 0) AS recent, coalesce(prior.n, 0) AS prior
    FROM recent FULL OUTER JOIN prior ON recent.value = prior.value
    WHERE coalesce(recent.n, 0) >= 2
    ORDER BY recent DESC LIMIT 200`);
  return rows.rows
    .map((r) => {
      const recentRate = r.recent / recentDays;
      const priorRate = (r.prior + 0.5) / priorDays; // +0.5 smooths brand-new items
      return { value: r.value, recent: r.recent, prior: r.prior, lift: Math.round((recentRate / priorRate) * 10) / 10 };
    })
    .sort((a, b) => b.lift - a.lift || b.recent - a.recent)
    .slice(0, limit);
}

export async function recentVolume(days = 30) {
  const rows = await db.execute<{ day: string; n: number }>(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
    FROM "references" WHERE created_at > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 1`);
  return rows.rows;
}

// ---------- Personal taste ----------

const WEIGHTS: Record<EventKind, number> = { save: 3, project: 3, collect: 2, ask: 2, view: 0.5 };

type Signal = { id: string; weight: number };

/** Weighted signals per reference: stars, collections, projects, asks, views (capped). */
export async function tasteSignals(): Promise<Signal[]> {
  const rows = await db.execute<{ id: string; saved: boolean; collections: number; projects: number; asks: number; views: number }>(sql`
    SELECT r.id, r.saved,
      (SELECT count(*) FROM collection_items ci WHERE ci.reference_id = r.id)::int AS collections,
      (SELECT count(*) FROM project_references pr WHERE pr.reference_id = r.id)::int AS projects,
      (SELECT count(*) FROM reference_events e WHERE e.reference_id = r.id AND e.kind = 'ask')::int AS asks,
      (SELECT count(*) FROM reference_events e WHERE e.reference_id = r.id AND e.kind = 'view')::int AS views
    FROM "references" r WHERE r.status = 'understood' AND r.embedding_content IS NOT NULL`);
  return rows.rows
    .map((r) => ({
      id: r.id,
      weight:
        (r.saved ? WEIGHTS.save : 0) +
        Math.min(r.collections, 3) * WEIGHTS.collect +
        Math.min(r.projects, 3) * WEIGHTS.project +
        Math.min(r.asks, 3) * WEIGHTS.ask +
        Math.min(r.views, 4) * WEIGHTS.view,
    }))
    .filter((s) => s.weight > 0);
}

function parseVector(s: string): number[] {
  return s.replace(/^\[|\]$/g, "").split(",").map(Number);
}

/** Weighted centroid of the content embeddings of everything the user signalled interest in. */
export async function tasteVector(): Promise<{ vector: number[]; signals: number } | null> {
  const signals = await tasteSignals();
  if (!signals.length) return null;
  const ids = signals.map((s) => s.id);
  const rows = await db.execute<{ id: string; v: string }>(sql`
    SELECT id, embedding_content::text AS v FROM "references" WHERE id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
  const w = new Map(signals.map((s) => [s.id, s.weight]));
  let acc: number[] | null = null;
  let total = 0;
  for (const r of rows.rows) {
    const vec = parseVector(r.v);
    const weight = w.get(r.id) ?? 0;
    if (!acc) acc = new Array(vec.length).fill(0);
    for (let i = 0; i < vec.length; i++) acc[i] += vec[i] * weight;
    total += weight;
  }
  if (!acc || !total) return null;
  const norm = Math.sqrt(acc.reduce((a, b) => a + b * b, 0)) || 1;
  return { vector: acc.map((x) => x / norm), signals: signals.length };
}

export type Discovery = {
  signals: number;
  favourites: { principles: string[]; subjects: string[] };
  forYou: { reference: PublicReference; score: number }[];
  unexpected: { reference: PublicReference; score: number; because: string }[];
};

/**
 * "Show me something I haven't thought of, but that fits what I like."
 * forYou: closest to the taste centroid among references without signals.
 * unexpected: still close to the taste, but outside the user's favourite principles/subjects.
 */
export async function discover(limit = 12): Promise<Discovery | null> {
  const taste = await tasteVector();
  if (!taste) return null;
  const signals = await tasteSignals();
  const signalIds = signals.map((s) => s.id);
  const fav = await db.execute<{ kind: string; value: string; n: number }>(sql`
    SELECT 'principle' AS kind, v AS value, count(*)::int AS n FROM "references" r, unnest(r.principles) v WHERE r.id IN (${sql.join(signalIds.map((id) => sql`${id}`), sql`, `)}) GROUP BY v
    UNION ALL
    SELECT 'subject', v, count(*)::int FROM "references" r, unnest(r.subjects) v WHERE r.id IN (${sql.join(signalIds.map((id) => sql`${id}`), sql`, `)}) GROUP BY v
    ORDER BY n DESC`);
  const favPrinciples = fav.rows.filter((f) => f.kind === "principle").slice(0, 3).map((f) => f.value);
  const favSubjects = fav.rows.filter((f) => f.kind === "subject").slice(0, 3).map((f) => f.value);

  const lit = toVectorLiteral(taste.vector);
  const rows = await db.execute<Record<string, unknown> & { score: number }>(sql`
    SELECT r.*, 1 - (r.embedding_content <=> ${lit}::vector) AS score
    FROM "references" r
    WHERE r.status = 'understood' AND r.embedding_content IS NOT NULL
      AND r.id NOT IN (${sql.join(signalIds.map((id) => sql`${id}`), sql`, `)})
    ORDER BY r.embedding_content <=> ${lit}::vector
    LIMIT ${limit * 5}`);
  const candidates = rows.rows.map((r) => ({ reference: toPublic(mapRow(r)), score: Math.round(Number(r.score) * 100) / 100 }));
  const forYou = candidates.slice(0, limit);
  const unexpected = candidates
    .filter((c) => !c.reference.principles.some((p) => favPrinciples.includes(p)) || !c.reference.subjects.some((s) => favSubjects.includes(s)))
    .slice(0, limit)
    .map((c) => {
      const newPrinciples = c.reference.principles.filter((p) => !favPrinciples.includes(p));
      const newSubjects = c.reference.subjects.filter((s) => !favSubjects.includes(s));
      const because = newPrinciples.length ? `brings ${newPrinciples.slice(0, 2).join(" + ")} into a territory you like` : newSubjects.length ? `same taste, but in ${newSubjects.slice(0, 2).join(" / ")}` : "close to your taste, different angle";
      return { ...c, because };
    });
  return { signals: taste.signals, favourites: { principles: favPrinciples, subjects: favSubjects }, forYou, unexpected };
}

// ---------- Knowledge graph ----------

export type GraphNode = { id: string; type: "reference" | "principle" | "brand"; label: string; thumb?: string | null; platform?: string; weight: number };
export type GraphEdge = { source: string; target: string; kind: string; score: number };

export async function graphData(limit = 250): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const refs = await db.execute<{ id: string; title: string | null; thumbnail_url: string | null; source_platform: string; principles: string[]; brand: string | null; degree: number }>(sql`
    SELECT r.id, r.title, r.thumbnail_url, r.source_platform, r.principles, r.brand,
      (SELECT count(*) FROM reference_relations x WHERE x.source_id = r.id OR x.target_id = r.id)::int AS degree
    FROM "references" r WHERE r.status = 'understood' ORDER BY degree DESC, r.created_at DESC LIMIT ${limit}`);
  const ids = new Set(refs.rows.map((r) => r.id));
  const nodes: GraphNode[] = refs.rows.map((r) => ({ id: r.id, type: "reference", label: r.title ?? "Untitled", thumb: r.thumbnail_url, platform: r.source_platform, weight: 1 + r.degree }));
  const edges: GraphEdge[] = [];
  if (ids.size) {
    const rel = await db.select().from(referenceRelations);
    const seen = new Set<string>();
    for (const e of rel) {
      if (!ids.has(e.sourceId) || !ids.has(e.targetId)) continue;
      const key = [e.sourceId, e.targetId].sort().join("|") + e.kind;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: e.sourceId, target: e.targetId, kind: e.kind, score: e.score });
    }
  }
  // Principle hubs: PARTICIPATION → Nike, Netflix, Spotify…
  const hubCount = new Map<string, string[]>();
  for (const r of refs.rows) for (const p of r.principles) hubCount.set(p, [...(hubCount.get(p) ?? []), r.id]);
  for (const [p, members] of hubCount) {
    if (members.length < 2) continue;
    const hubId = `principle:${p}`;
    nodes.push({ id: hubId, type: "principle", label: p, weight: members.length });
    for (const m of members) edges.push({ source: hubId, target: m, kind: "principle", score: 1 });
  }
  const brandCount = new Map<string, string[]>();
  for (const r of refs.rows) if (r.brand) brandCount.set(r.brand, [...(brandCount.get(r.brand) ?? []), r.id]);
  for (const [b, members] of brandCount) {
    if (members.length < 2) continue;
    const hubId = `brand:${b}`;
    nodes.push({ id: hubId, type: "brand", label: b, weight: members.length });
    for (const m of members) edges.push({ source: hubId, target: m, kind: "brand", score: 1 });
  }
  return { nodes, edges };
}

export async function understoodSample(limit = 150) {
  const rows = await db.select().from(references).where(sql`${references.status} = 'understood'`).orderBy(sql`${references.createdAt} DESC`).limit(limit);
  return rows;
}
