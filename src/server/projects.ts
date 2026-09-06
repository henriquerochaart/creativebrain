/**
 * V3 — Projects: the creative process as a first-class object.
 * PROJECT → REFERENCES → CONCEPTS → PATTERNS → DIRECTIONS → IDEAS → OUTPUT
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { projectReferences, projects, references, type Project } from "./db/schema";
import { getLLM } from "./ai/router";
import { PROJECT_SYSTEM } from "./ai/prompts";
import { ProjectAnalysisSchema, type ProjectAnalysis } from "./ai/schemas";
import { referenceDigest } from "./search/explain";
import { isUuid, toPublic, type PublicReference } from "./references";
import { recordEvent } from "./insights";

export async function listProjects() {
  const rows = await db.execute<{ id: string; name: string; brief: string | null; status: string; analyzed_at: string | null; created_at: string; updated_at: string; count: number; covers: string[] }>(sql`
    SELECT p.*, (SELECT count(*) FROM project_references pr WHERE pr.project_id = p.id)::int AS count,
      ARRAY(SELECT r.thumbnail_url FROM project_references pr JOIN "references" r ON r.id = pr.reference_id WHERE pr.project_id = p.id AND r.thumbnail_url IS NOT NULL ORDER BY pr.position, pr.added_at LIMIT 4) AS covers
    FROM projects p ORDER BY p.updated_at DESC`);
  return rows.rows;
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  return row ?? null;
}

export async function createProject(input: { name: string; brief?: string | null }) {
  const [row] = await db.insert(projects).values({ name: input.name.trim(), brief: input.brief ?? null }).returning();
  return row;
}

export async function updateProject(id: string, patch: { name?: string; brief?: string | null; status?: string }) {
  const [row] = await db.update(projects).set({ ...patch, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
  return row ?? null;
}

export async function deleteProject(id: string) {
  const res = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
  return res.length > 0;
}

export async function projectReferenceList(projectId: string): Promise<(PublicReference & { note: string | null; position: number })[]> {
  const rows = await db
    .select({ ref: references, note: projectReferences.note, position: projectReferences.position })
    .from(projectReferences)
    .innerJoin(references, eq(references.id, projectReferences.referenceId))
    .where(eq(projectReferences.projectId, projectId))
    .orderBy(projectReferences.position, projectReferences.addedAt);
  return rows.map((r) => ({ ...toPublic(r.ref), note: r.note, position: r.position }));
}

export async function addReferenceToProject(projectId: string, referenceId: string, note?: string | null) {
  const [{ max }] = (await db.execute<{ max: number | null }>(sql`SELECT max(position) AS max FROM project_references WHERE project_id = ${projectId}`)).rows;
  await db
    .insert(projectReferences)
    .values({ projectId, referenceId, note: note ?? null, position: (max ?? 0) + 1 })
    .onConflictDoNothing();
  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
  await recordEvent(referenceId, "project");
}

export async function removeReferenceFromProject(projectId: string, referenceId: string) {
  await db.delete(projectReferences).where(and(eq(projectReferences.projectId, projectId), eq(projectReferences.referenceId, referenceId)));
  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
}

export async function projectsOfReference(referenceId: string) {
  return db
    .select({ id: projects.id, name: projects.name })
    .from(projectReferences)
    .innerJoin(projects, eq(projects.id, projectReferences.projectId))
    .where(eq(projectReferences.referenceId, referenceId));
}

/** Deterministic part of the analysis: what the selection is made of. */
export function selectionStats(refs: PublicReference[]) {
  const count = (pick: (r: PublicReference) => string[]) => {
    const m = new Map<string, number>();
    for (const r of refs) for (const v of new Set(pick(r))) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([value, n]) => ({ value, count: n }));
  };
  return {
    total: refs.length,
    principles: count((r) => r.principles),
    subjects: count((r) => r.subjects),
    formats: count((r) => r.formats),
    platforms: count((r) => [r.sourcePlatform]),
    concepts: count((r) => r.concepts).slice(0, 20),
    brands: count((r) => (r.brand ? [r.brand] : [])),
  };
}

export function selectionSentence(stats: ReturnType<typeof selectionStats>): string {
  if (!stats.total) return "No references selected yet.";
  const top = stats.principles.slice(0, 3).map((p) => `${p.count} with ${p.value.toLowerCase()}`);
  return `You selected ${stats.total} reference${stats.total === 1 ? "" : "s"}. ${top.join(", ")}.`;
}

export type StoredAnalysis = { analysis: ProjectAnalysis; stats: ReturnType<typeof selectionStats>; sentence: string; model: string };

export async function analyzeProject(project: Project): Promise<StoredAnalysis> {
  const refs = await projectReferenceList(project.id);
  const stats = selectionStats(refs);
  const sentence = selectionSentence(stats);
  const full = refs.length ? await db.select().from(references).where(inArray(references.id, refs.map((r) => r.id))) : [];
  const digest = full.map((r) => referenceDigest(r, { withId: true, long: false })).join("\n\n");
  const llm = getLLM();
  const analysis: ProjectAnalysis = await llm.analyze({
    system: PROJECT_SYSTEM,
    prompt: `PROJECT: ${project.name}\nBrief: ${project.brief ?? "(no brief yet)"}\n\nSelection stats: ${sentence}\nPrinciples: ${stats.principles.map((p) => `${p.value} ${p.count}`).join(", ")}\nSubjects: ${stats.subjects.map((p) => `${p.value} ${p.count}`).join(", ")}\n\nSELECTED REFERENCES (${refs.length}):\n\n${digest || "(none)"}\n\nRun the process: concepts → patterns → directions → ideas.`,
    schema: ProjectAnalysisSchema,
    schemaName: "project_analysis",
  });
  const stored: StoredAnalysis = { analysis, stats, sentence, model: llm.model };
  await db.update(projects).set({ analysis: stored as unknown as Record<string, unknown>, analyzedAt: new Date(), updatedAt: new Date() }).where(eq(projects.id, project.id));
  return stored;
}

/** OUTPUT: the whole process as a markdown document to paste into a deck or a doc. */
export function projectMarkdown(project: Project, refs: PublicReference[], stored: StoredAnalysis | null): string {
  const title = (id: string) => refs.find((r) => r.id === id)?.title ?? id;
  const lines: string[] = [`# ${project.name}`, ""];
  if (project.brief) lines.push(project.brief, "");
  lines.push(`## References (${refs.length})`, "");
  for (const r of refs) lines.push(`- **${r.title}**${r.brand ? ` — ${r.brand}` : ""}${r.ai.creativeMechanism ? ` · ${r.ai.creativeMechanism}` : ""}${r.canonicalUrl ? ` · ${r.canonicalUrl}` : ""}`);
  if (!stored) return lines.join("\n");
  const a = stored.analysis;
  lines.push("", `## Reading`, "", stored.sentence, "", a.summary, "");
  lines.push(`## Concepts`, "", ...a.concepts.map((c) => `- **${c.name}** — ${c.referenceIds.map(title).join(", ")}`), "");
  lines.push(`## Patterns`, "", ...a.patterns.map((p) => `- ${p.statement}`), "");
  lines.push(`## Directions`, "");
  for (const d of a.directions) lines.push(`### ${d.title}`, "", d.rationale, "", `Mechanism: ${d.mechanism}`, "", `References: ${d.referenceIds.map(title).join(", ")}`, "");
  lines.push(`## Ideas`, "");
  for (const i of a.ideas) lines.push(`### ${i.title}`, "", `_${i.direction}_ · ${i.mechanism}`, "", i.description, "");
  lines.push(`---`, "", a.combinationQuestion);
  return lines.join("\n");
}

export async function recentProjectsList(limit = 5) {
  return db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.status, "open")).orderBy(desc(projects.updatedAt)).limit(limit);
}
