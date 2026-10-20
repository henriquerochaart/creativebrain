import { describe, expect, it } from "vitest";
import { entrySchema, sniffReceiptType, suggestEmail } from "@/lib/validation";

const bytes = (text: string, prefix: number[] = []) => new Uint8Array([...prefix, ...Array.from(text, (c) => c.charCodeAt(0))]);

describe("sniffReceiptType", () => {
  it("recognises images and PDFs by their first bytes", () => {
    expect(sniffReceiptType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffReceiptType(bytes("\x89PNG\r\n\x1a\n...."))).toBe("image/png");
    expect(sniffReceiptType(bytes("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffReceiptType(bytes("%PDF-1.7\n"))).toBe("application/pdf");
    expect(sniffReceiptType(bytes("\0\0\0\x18ftypheic"))).toBe("image/heic");
    expect(sniffReceiptType(bytes("\0\0\0\x1cftypavif"))).toBe("image/avif");
  });

  it("refuses anything else, whatever the file claims to be", () => {
    expect(sniffReceiptType(bytes("<svg xmlns=..."))).toBeNull();
    expect(sniffReceiptType(bytes("<!doctype html>"))).toBeNull();
    expect(sniffReceiptType(new Uint8Array())).toBeNull();
  });
});

describe("entrySchema", () => {
  it("trims, lowercases the e-mail and requires a real name", () => {
    expect(entrySchema.parse({ name: "  Morticia Addams ", email: " Morticia@Example.COM " })).toEqual({
      name: "Morticia Addams",
      email: "morticia@example.com",
    });
    expect(entrySchema.safeParse({ name: " ", email: "a@b.co" }).success).toBe(false);
    expect(entrySchema.safeParse({ name: "Gomez", email: "gomez@" }).success).toBe(false);
  });
});

describe("suggestEmail", () => {
  it("catches typos in common providers and leaves other domains alone", () => {
    expect(suggestEmail("fulano@gmial.com")).toBe("fulano@gmail.com");
    expect(suggestEmail("fulano@hotmail.co")).toBe("fulano@hotmail.com");
    expect(suggestEmail("fulano@gmail.com")).toBeNull();
    expect(suggestEmail("henrique@spinoff.digital")).toBeNull();
    expect(suggestEmail("fulano")).toBeNull();
  });
});
