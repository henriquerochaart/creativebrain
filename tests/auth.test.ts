import { afterEach, describe, expect, it, vi } from "vitest";

async function load(key: string) {
  vi.resetModules();
  process.env.BRAIN_API_KEY = key;
  process.env.AUTH_SECRET = "test-secret";
  const auth = await import("@/server/auth");
  const session = await import("@/lib/session");
  return { ...auth, ...session };
}

describe("API auth", () => {
  afterEach(() => {
    delete process.env.BRAIN_API_KEY;
    delete process.env.AUTH_SECRET;
  });
  it("is closed by default: no key configured no longer means open", async () => {
    const { isAuthorized } = await load("");
    expect(await isAuthorized(new Request("http://x/api/search"))).toBe(false);
  });
  it("lets a signed-in account through with its session cookie, and not a forged one", async () => {
    const { isAuthorized, signSession, SESSION_COOKIE } = await load("");
    const token = await signSession("user-1");
    expect(await isAuthorized(new Request("http://x/api/search", { headers: { cookie: `a=b; ${SESSION_COOKIE}=${token}` } }))).toBe(true);
    const forged = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
    expect(await isAuthorized(new Request("http://x/api/search", { headers: { cookie: `${SESSION_COOKIE}=${forged}` } }))).toBe(false);
  });
  it("accepts the API key as bearer or x-api-key", async () => {
    const { isAuthorized } = await load("secret-123");
    expect(await isAuthorized(new Request("http://x/api/search", { headers: { authorization: "Bearer secret-123" } }))).toBe(true);
    expect(await isAuthorized(new Request("http://x/api/search", { headers: { "x-api-key": "secret-123" } }))).toBe(true);
    expect(await isAuthorized(new Request("http://x/api/search", { headers: { authorization: "Bearer wrong-key-1" } }))).toBe(false);
  });
  it("accepts the capture token on /api/capture only", async () => {
    const { isAuthorized, captureToken } = await load("");
    const token = await captureToken();
    expect(await isAuthorized(new Request(`http://x/api/capture?reply=text&token=${token}`, { method: "POST" }))).toBe(true);
    expect(await isAuthorized(new Request(`http://x/api/references?token=${token}`))).toBe(false);
    expect(await isAuthorized(new Request("http://x/api/capture?token=nope", { method: "POST" }))).toBe(false);
  });
  it("no longer trusts the UI header on its own", async () => {
    const { isAuthorized } = await load("secret-123");
    expect(await isAuthorized(new Request("http://x/api/search", { headers: { "x-brain-ui": "1", "sec-fetch-site": "same-origin" } }))).toBe(false);
  });
});

describe("sessions", () => {
  it("expire", async () => {
    const { signSession, readSession } = await load("");
    const t0 = Date.UTC(2026, 0, 1);
    const token = await signSession("user-1", t0);
    expect(await readSession(token, t0 + 1000)).toBe("user-1");
    expect(await readSession(token, t0 + 181 * 86_400_000)).toBeNull();
    expect(await readSession("garbage", t0)).toBeNull();
    expect(await readSession(null, t0)).toBeNull();
  });
});
