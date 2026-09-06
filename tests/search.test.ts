import { describe, expect, it } from "vitest";
import { rrf } from "@/server/search/rrf";

describe("reciprocal rank fusion", () => {
  it("ranks items present in several lists above single-list items", () => {
    const fused = rrf([
      { name: "keyword", items: [{ id: "a" }, { id: "b" }, { id: "c" }] },
      { name: "semantic", items: [{ id: "b" }, { id: "d" }, { id: "a" }] },
    ]);
    expect(fused.map((f) => f.id).slice(0, 2).sort()).toEqual(["a", "b"]);
    expect(fused.find((f) => f.id === "b")!.sources).toEqual({ keyword: 2, semantic: 1 });
    expect(fused.find((f) => f.id === "d")!.sources).toEqual({ semantic: 2 });
  });
  it("honours list weights", () => {
    const fused = rrf([
      { name: "x", items: [{ id: "only-x" }], weight: 3 },
      { name: "y", items: [{ id: "only-y" }], weight: 1 },
    ]);
    expect(fused[0].id).toBe("only-x");
  });
  it("returns empty for no lists", () => {
    expect(rrf([])).toEqual([]);
  });
});
