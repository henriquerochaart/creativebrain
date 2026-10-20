import { describe, expect, it } from "vitest";
import { brl, keepNumber } from "@/lib/format";

describe("format", () => {
  it("keeps the street number on the street's line", () => {
    expect(keepNumber("Rua Luiz Galhanone, 275")).toBe("Rua Luiz Galhanone, 275");
    expect(keepNumber("Casa da Galha")).toBe("Casa da Galha");
  });

  it("formats reais the Brazilian way", () => {
    expect(brl(25)).toBe("R$ 25,00");
  });
});
