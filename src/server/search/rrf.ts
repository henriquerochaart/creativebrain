/**
 * Reciprocal Rank Fusion: merges several ranked lists into one without score calibration.
 * Pure and unit-tested.
 */
export type Ranked = { id: string; score?: number };

export function rrf(lists: { name: string; items: Ranked[]; weight?: number }[], k = 60) {
  const fused = new Map<string, { id: string; score: number; sources: Record<string, number> }>();
  for (const list of lists) {
    const w = list.weight ?? 1;
    list.items.forEach((item, idx) => {
      const entry = fused.get(item.id) ?? { id: item.id, score: 0, sources: {} };
      entry.score += w / (k + idx + 1);
      entry.sources[list.name] = idx + 1;
      fused.set(item.id, entry);
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score);
}
