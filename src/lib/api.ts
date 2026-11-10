import { withBase } from "./base-path";
import { t } from "./i18n";

/** A failed API call: `status` for code, `message` already in the reader's language. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The server's own words only where they are written for people (limits come back translated);
 * anything else ("Not found", "Invalid body", an id) becomes one plain line in the reader's language.
 */
async function apiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  const lang = typeof document !== "undefined" && document.documentElement.lang.startsWith("en") ? "en" : "pt";
  const message = res.status === 429 && body.error ? body.error : t(lang).auth.errors.server;
  return new ApiError(message, res.status);
}

/** Browser-side fetch wrapper. Marks requests as coming from the UI so API-key auth lets them through same-origin. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set("x-brain-ui", "1");
  if (init.body && typeof init.body === "string" && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(withBase(path), { ...init, headers });
  if (!res.ok) throw await apiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiStream(path: string, body: unknown, onChunk: (text: string) => void): Promise<string> {
  const res = await fetch(withBase(path), { method: "POST", headers: { "content-type": "application/json", "x-brain-ui": "1" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) throw await apiError(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(full);
  }
  return full;
}
