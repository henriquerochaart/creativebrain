import { afterEach, describe, expect, it, vi } from "vitest";

async function load(key: string) {
  vi.resetModules();
  process.env.BRAIN_API_KEY = key;
  return import("@/server/auth");
}

describe("API auth", () => {
  afterEach(() => {
    delete process.env.BRAIN_API_KEY;
  });
  it("allows everything when no key is configured", async () => {
    const { isAuthorized } = await load("");
    expect(isAuthorized(new Request("http://x/api/search"))).toBe(true);
  });
  it("requires bearer or x-api-key when configured", async () => {
    const { isAuthorized } = await load("secret-123");
    expect(isAuthorized(new Request("http://x/api/search"))).toBe(false);
    expect(isAuthorized(new Request("http://x/api/search", { headers: { authorization: "Bearer secret-123" } }))).toBe(true);
    expect(isAuthorized(new Request("http://x/api/search", { headers: { "x-api-key": "secret-123" } }))).toBe(true);
    expect(isAuthorized(new Request("http://x/api/search", { headers: { authorization: "Bearer wrong-key-1" } }))).toBe(false);
  });
  it("lets the same-origin UI through, but not a cross-site page pretending to be the UI", async () => {
    const { isAuthorized } = await load("secret-123");
    expect(isAuthorized(new Request("http://x/api/search", { headers: { "x-brain-ui": "1", "sec-fetch-site": "same-origin" } }))).toBe(true);
    expect(isAuthorized(new Request("http://x/api/search", { headers: { "x-brain-ui": "1", "sec-fetch-site": "cross-site" } }))).toBe(false);
  });
});
