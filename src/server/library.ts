import { asc, eq } from "drizzle-orm";
import { db } from "./db/client";
import { boards, collectionItems, collections, conversations, projectReferences, projects, references, users } from "./db/schema";
import { toPublic } from "./references";
import { getStorage } from "./storage";

/**
 * A whole library as one JSON document, for the person who owns it: every reference with what the
 * Brain understood (no embeddings or search internals), collections with their members, moodboards,
 * projects and conversations. Media stays where it is; each reference keeps its URLs.
 */
export async function exportLibrary(userId: string) {
  const [refs, cols, colItems, bds, projs, projItems, convs] = await Promise.all([
    db.select().from(references).where(eq(references.userId, userId)).orderBy(asc(references.createdAt)),
    db.select().from(collections).where(eq(collections.userId, userId)),
    db
      .select({ owner: collectionItems.collectionId, referenceId: collectionItems.referenceId })
      .from(collectionItems)
      .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
      .where(eq(collections.userId, userId)),
    db.select().from(boards).where(eq(boards.userId, userId)),
    db.select().from(projects).where(eq(projects.userId, userId)),
    db
      .select({ owner: projectReferences.projectId, referenceId: projectReferences.referenceId })
      .from(projectReferences)
      .innerJoin(projects, eq(projects.id, projectReferences.projectId))
      .where(eq(projects.userId, userId)),
    db.select().from(conversations).where(eq(conversations.userId, userId)),
  ]);
  const membersOf = (id: string, rows: { owner: string; referenceId: string }[]) => rows.filter((r) => r.owner === id).map((r) => r.referenceId);
  return {
    format: "brain-library",
    version: 1,
    exportedAt: new Date().toISOString(),
    references: refs.map((r) => {
      const { userId: _owner, ...rest } = toPublic(r);
      return rest;
    }),
    collections: cols.map(({ userId: _owner, ...c }) => ({ ...c, references: membersOf(c.id, colItems) })),
    moodboards: bds.map(({ userId: _owner, ...b }) => b),
    projects: projs.map(({ userId: _owner, ...p }) => ({ ...p, references: membersOf(p.id, projItems) })),
    conversations: convs.map(({ userId: _owner, ...c }) => c),
  };
}

/** The storage keys a reference owns: its media file, and a thumbnail served by our media route. */
export function storageKeysOf(r: { mediaKey: string | null; thumbnailUrl: string | null }): string[] {
  const keys = new Set<string>();
  if (r.mediaKey) keys.add(r.mediaKey);
  const marker = "/api/media/";
  const at = r.thumbnailUrl ? r.thumbnailUrl.indexOf(marker) : -1;
  if (r.thumbnailUrl && at >= 0) keys.add(decodeURIComponent(r.thumbnailUrl.slice(at + marker.length).split("?")[0]));
  return [...keys].filter((k) => k && !k.includes(".."));
}

/**
 * Deletes an account and everything in it. The rows go with the user (ON DELETE CASCADE); stored
 * files are removed afterwards, best effort, so a storage hiccup never leaves the account half there.
 */
export async function deleteAccountData(userId: string): Promise<{ references: number; files: number }> {
  const refs = await db.select({ mediaKey: references.mediaKey, thumbnailUrl: references.thumbnailUrl }).from(references).where(eq(references.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
  const storage = getStorage();
  let files = 0;
  for (const key of refs.flatMap(storageKeysOf)) {
    try {
      await storage.delete(key);
      files++;
    } catch {
      // A file that cannot be removed now is an orphan in storage, not a reason to keep the account.
    }
  }
  return { references: refs.length, files };
}
