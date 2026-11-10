import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";
import { isPrivateAddress, assertPublicUrl } from "@/server/net";
import { referencePatch, projectPatch, collectionPatch, collectionCreate, collectionAccept, askBody, intParam } from "@/server/validate";
import { storageKeysOf } from "@/server/library";

describe("after sign-in, only a path inside the app", () => {
  it("keeps paths, query and hash", () => {
    expect(safeNext("/r/abc?dup=1#top")).toBe("/r/abc?dup=1#top");
    expect(safeNext("/")).toBe("/");
  });
  it("refuses anything that leaves the origin", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", "/%0d%0aSet-Cookie:x", null, 42]) {
      const out = safeNext(bad);
      expect(out.startsWith("/")).toBe(true);
      expect(new URL(out, "https://brain.example").origin).toBe("https://brain.example");
    }
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\t/evil.com")).toBe("/");
  });
});

describe("outbound requests never reach private addresses", () => {
  it("knows private, loopback, link-local and mapped ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:a00:1", "64:ff9b::10.0.0.1", "not-an-ip"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
  it("refuses bad schemes, credentials and internal names before resolving", async () => {
    for (const u of ["file:///etc/passwd", "ftp://example.com", "http://user:pw@example.com/", "http://localhost/", "http://db.internal/", "http://printer.local/", "http://127.0.0.1/", "http://[::1]/", "http://0x7f000001/"]) {
      await expect(assertPublicUrl(u), u).rejects.toThrow(/Blocked/);
    }
  });
});

describe("API bodies are allowlists", () => {
  it("drops fields the route does not own (no mass assignment)", () => {
    const parsed = referencePatch.parse({ saved: true, userId: "someone-else", mediaKey: "references/x/media.pdf", status: "understood" });
    expect(parsed).toEqual({ saved: true });
    expect(projectPatch.parse({ name: "P", userId: "x" })).toEqual({ name: "P" });
    expect(collectionPatch.parse({ position: 2, slug: "x" })).toEqual({ position: 2 });
  });
  it("checks types and sizes", () => {
    expect(referencePatch.safeParse({ saved: "yes" }).success).toBe(false);
    expect(referencePatch.safeParse({ tags: Array.from({ length: 51 }, (_, i) => `t${i}`) }).success).toBe(false);
    expect(projectPatch.safeParse({ status: "deleted" }).success).toBe(false);
    expect(askBody.safeParse({ question: "ok", history: [{ role: "system", content: "x" }] }).success).toBe(false);
  });
  it("accepts what the app's own screens send", () => {
    // A collection made without an emoji, and an accepted suggestion, as the components send them.
    expect(collectionCreate.safeParse({ name: "Tipografia", emoji: null }).success).toBe(true);
    expect(collectionAccept.safeParse({ name: "Cor", emoji: "🎨", rationale: "Paletas quentes.", referenceIds: [] }).success).toBe(true);
    // A long conversation is trimmed to its recent part, never refused.
    const long = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `${i} ${"x".repeat(9000)}` }));
    const parsed = askBody.parse({ question: "e agora?", history: long });
    expect(parsed.history).toHaveLength(20);
    expect(parsed.history?.[0]?.content.startsWith("20 ")).toBe(true);
    expect(parsed.history?.every((t) => t.content.length <= 8000)).toBe(true);
  });
  it("never turns a query parameter into NaN", () => {
    expect(intParam("abc", 40, 100)).toBe(40);
    expect(intParam("500", 40, 100)).toBe(100);
    expect(intParam("-3", 40, 100)).toBe(40);
    expect(intParam("12", 40, 100)).toBe(12);
  });
});

describe("deleting an account removes its files", () => {
  it("finds a reference's media and the thumbnail our route serves, and nothing outside", () => {
    expect(storageKeysOf({ mediaKey: "references/a/media.mp4", thumbnailUrl: "/brain/api/media/references/a/thumbnail.jpg?v=2" }).sort()).toEqual(["references/a/media.mp4", "references/a/thumbnail.jpg"]);
    expect(storageKeysOf({ mediaKey: null, thumbnailUrl: "https://cdn.example.com/x.jpg" })).toEqual([]);
    expect(storageKeysOf({ mediaKey: null, thumbnailUrl: "/api/media/references/a/..%2F..%2Fsecret" })).toEqual([]);
  });
});
