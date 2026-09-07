import { withBase } from "./base-path";

/** Browser-side fetch wrapper. Marks requests as coming from the UI so API-key auth lets them through same-origin. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set("x-brain-ui", "1");
  if (init.body && typeof init.body === "string" && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(withBase(path), { ...init, headers });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiStream(path: string, body: unknown, onChunk: (text: string) => void): Promise<string> {
  const res = await fetch(withBase(path), { method: "POST", headers: { "content-type": "application/json", "x-brain-ui": "1" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `${res.status}`);
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
