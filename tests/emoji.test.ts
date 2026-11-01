import { describe, expect, it } from "vitest";
import { emojiCandidates } from "@/lib/emoji";

const base = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/";
const names = (c: string) => emojiCandidates(c).map((u) => u.slice(base.length, -4));

describe("Apple emoji file names", () => {
  it("uses the code points of a plain emoji", () => {
    expect(names("🎬")).toEqual(["1f3ac", "1f3ac-fe0f"]);
  });
  it("keeps the presentation selector first when the emoji carries it, then tries without", () => {
    expect(names("🖼️")).toEqual(["1f5bc-fe0f", "1f5bc"]);
  });
  it("adds the selector when someone typed the bare symbol", () => {
    expect(names("✍")).toEqual(["270d", "270d-fe0f"]);
  });
  it("ignores surrounding spaces and returns nothing for an empty string", () => {
    expect(names(" 🧠 ")).toEqual(["1f9e0", "1f9e0-fe0f"]);
    expect(emojiCandidates("")).toEqual([]);
  });
});
