/** Filesystem driver. Persists only where the disk survives restarts — never on Vercel. */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import type { PutResult, Storage, StoredObject } from "./common";
import { mediaPath, mimeForKey } from "./common";

export class LocalStorage implements Storage {
  private readonly root: string;

  constructor(dir: string) {
    this.root = resolve(dir);
  }

  /**
   * Keys reach `get` straight from the /api/media/[...key] URL, so a crafted "../.." would
   * otherwise read any file the process can see. Resolve first, then require the result to
   * stay inside the root.
   */
  private pathFor(key: string): string {
    const full = resolve(join(this.root, normalize(key)));
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error(`Refusing to access a path outside the storage root: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer, mime: string): Promise<PutResult> {
    const file = this.pathFor(key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
    void mime; // the key already carries the extension; `get` derives the type from it
    return { key, url: this.url(key) };
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const data = await readFile(this.pathFor(key));
      return { data, mime: mimeForKey(key) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  url(key: string): string {
    return mediaPath(key);
  }
}
