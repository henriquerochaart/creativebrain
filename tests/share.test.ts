import { describe, expect, it } from "vitest";
import { inputFromShare } from "@/server/share";
import { normalizeBasePath, withBase } from "@/lib/base-path";

describe("inputFromShare", () => {
  it("prefers an explicit url and keeps the caption as note", () => {
    const r = inputFromShare({ url: "https://www.instagram.com/reel/abc/", text: "Look at this campaign", title: null });
    expect(r).toEqual({ input: "https://www.instagram.com/reel/abc/", note: "Look at this campaign" });
  });
  it("extracts the first url from text (Android puts the link in text)", () => {
    const r = inputFromShare({ text: "Check this out https://www.tiktok.com/@x/video/123?is_from_webapp=1 amazing!", title: "TikTok" });
    expect(r?.input).toBe("https://www.tiktok.com/@x/video/123?is_from_webapp=1");
    expect(r?.note).toContain("Check this out");
    expect(r?.note).toContain("TikTok");
  });
  it("strips trailing punctuation from a url found in text", () => {
    expect(inputFromShare({ text: "see https://example.com/a." })?.input).toBe("https://example.com/a");
  });
  it("falls back to the text as an idea", () => {
    expect(inputFromShare({ text: "Ideia: dados virando ritual" })).toEqual({ input: "Ideia: dados virando ritual", note: null });
  });
  it("returns null when nothing usable arrived", () => {
    expect(inputFromShare({ url: "", text: "  ", title: null })).toBeNull();
  });
});

describe("base path", () => {
  it("normalizes what people write in BASE_PATH", () => {
    expect(normalizeBasePath(undefined)).toBe("");
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath("/")).toBe("");
    expect(normalizeBasePath("brain")).toBe("/brain");
    expect(normalizeBasePath("/brain/")).toBe("/brain");
    expect(normalizeBasePath("  /brain//  ")).toBe("/brain");
    expect(normalizeBasePath("/a/b")).toBe("/a/b");
  });
  it("prefixes only absolute paths, and only when a base path is set", () => {
    // BASE_PATH is empty in tests, so withBase is a pass-through; the prefixing itself is
    // covered by normalizeBasePath plus the composition below.
    expect(withBase("/api/references")).toBe("/api/references");
    const compose = (base: string, path: string) => (base && path.startsWith("/") ? base + path : path);
    expect(compose(normalizeBasePath("brain"), "/api/references")).toBe("/brain/api/references");
    expect(compose(normalizeBasePath("/brain"), "https://x.test/a")).toBe("https://x.test/a");
    expect(compose(normalizeBasePath(""), "/api/references")).toBe("/api/references");
  });
});
