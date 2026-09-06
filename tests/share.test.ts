import { describe, expect, it } from "vitest";
import { inputFromShare } from "@/server/share";

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
