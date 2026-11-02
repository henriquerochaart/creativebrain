import { describe, expect, it } from "vitest";
import { confirmsName, looseName, normalizeSiteUrl } from "@/server/pipeline/links";

describe("links", () => {
  it("turns an address as people write it into a URL", () => {
    expect(normalizeSiteUrl("skillry.dev/ai-videos.")?.toString()).toBe("https://skillry.dev/ai-videos");
    expect(normalizeSiteUrl("https://Higgsfield.AI")?.toString()).toBe("https://higgsfield.ai/");
    expect(normalizeSiteUrl("ai9app.io)")?.hostname).toBe("ai9app.io");
  });
  it("refuses what is not an address", () => {
    expect(normalizeSiteUrl("Skillry")).toBeNull();
    expect(normalizeSiteUrl("skillry dev")).toBeNull();
    expect(normalizeSiteUrl("ftp://files.example.com")).toBeNull();
    expect(normalizeSiteUrl(null)).toBeNull();
  });
  it("trusts an address the material spelled out, and checks one the model supplied", () => {
    expect(confirmsName({ name: "Skillry", urlStated: true }, "parked-domain.com", "For sale")).toBe(true);
    expect(confirmsName({ name: "Higgsfield", urlStated: false }, "higgsfield.ai", null)).toBe(true);
    expect(confirmsName({ name: "Mala Studio", urlStated: false }, "malastudio.com.br", null)).toBe(true);
    expect(confirmsName({ name: "Kabarza", urlStated: false }, "example.com", "Kabarza — motion studio")).toBe(true);
    expect(confirmsName({ name: "Kabarza", urlStated: false }, "sedo.com", "Domain for sale")).toBe(false);
    expect(looseName("São Paulo Café")).toBe("saopaulocafe");
  });
});
