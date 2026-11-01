import { api } from "./api";

/**
 * The two ways the browser captures: a piece of text (a link or an idea) and files. Shared by the
 * capture field and the Add sheet's tiles, so both save the same way and report the same result.
 */
export async function captureText(input: string, collectionId?: string): Promise<{ id: string; duplicate: boolean }> {
  const res = await api<{ reference: { id: string }; duplicate: boolean }>("/api/references", { method: "POST", body: JSON.stringify({ input, collectionId }) });
  return { id: res.reference.id, duplicate: res.duplicate };
}

/** Uploads one at a time and keeps going past a failure; returns how many landed and what failed. */
export async function captureFiles(files: FileList | File[], collectionId?: string): Promise<{ ok: number; errors: string[] }> {
  let ok = 0;
  const errors: string[] = [];
  for (const file of Array.from(files)) {
    const form = new FormData();
    form.append("file", file);
    if (collectionId) form.append("collectionId", collectionId);
    try {
      await api("/api/upload", { method: "POST", body: form });
      ok++;
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ok, errors };
}

/** What the file pickers accept, everywhere. */
export const CAPTURE_ACCEPT = "image/*,video/*,application/pdf,text/plain,text/markdown,audio/*";
