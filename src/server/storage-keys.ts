/** The storage keys a reference owns: its media file, and a thumbnail served by our media route. */
export function storageKeysOf(r: { mediaKey: string | null; thumbnailUrl: string | null }): string[] {
  const keys = new Set<string>();
  if (r.mediaKey) keys.add(r.mediaKey);
  const marker = "/api/media/";
  const at = r.thumbnailUrl ? r.thumbnailUrl.indexOf(marker) : -1;
  if (r.thumbnailUrl && at >= 0) keys.add(decodeURIComponent(r.thumbnailUrl.slice(at + marker.length).split("?")[0]));
  return [...keys].filter((k) => k && !k.includes(".."));
}
