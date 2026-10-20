import { describe, expect, it } from "vitest";
import { buildPixPayload, crc16, formatPixKey, normalizePixKey, pixKeyKind, toPixText } from "@/lib/pix";

describe("crc16", () => {
  it("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("buildPixPayload", () => {
  it("reproduces the static example of the Banco Central manual byte for byte", () => {
    const payload = buildPixPayload({
      key: "123e4567-e12b-12d1-a456-426655440000",
      name: "Fulano de Tal",
      city: "BRASILIA",
    });
    expect(payload).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("carries the amount with two decimals and a valid trailing CRC", () => {
    const payload = buildPixPayload({ key: "+55 (11) 98765-4321", name: "Gália Ação", city: "São Paulo", amount: 25 });
    expect(payload).toContain("0114+5511987654321");
    expect(payload).toContain("540525.00");
    expect(payload).toContain("5910Galia Acao");
    expect(payload).toContain("6009Sao Paulo");
    const body = payload.slice(0, -4);
    expect(body.endsWith("6304")).toBe(true);
    expect(payload.slice(-4)).toBe(crc16(body));
  });

  it("truncates name and city to the limits banks accept", () => {
    const payload = buildPixPayload({ key: "a@b.co", name: "A".repeat(40), city: "C".repeat(40) });
    expect(payload).toContain("5925" + "A".repeat(25) + "60");
    expect(payload).toContain("6015" + "C".repeat(15) + "62");
  });

  it("refuses an empty key or a non-positive amount", () => {
    expect(() => buildPixPayload({ key: " ", name: "X", city: "Y" })).toThrow();
    expect(() => buildPixPayload({ key: "a@b.co", name: "X", city: "Y", amount: 0 })).toThrow();
  });
});

describe("pix keys", () => {
  it("normalizes only keys that are clearly phones", () => {
    expect(normalizePixKey("+55 11 98765-4321")).toBe("+5511987654321");
    expect(normalizePixKey("123.456.789-09")).toBe("123.456.789-09");
    expect(normalizePixKey(" festa@galhaween.com ")).toBe("festa@galhaween.com");
  });

  it("formats a Brazilian phone for display and names the key kind", () => {
    expect(formatPixKey("+5511987654321")).toBe("(11) 98765-4321");
    expect(pixKeyKind("+5511987654321")).toBe("telefone");
    expect(pixKeyKind("festa@galhaween.com")).toBe("e-mail");
    expect(pixKeyKind("123.456.789-09")).toBe("CPF/CNPJ");
    expect(pixKeyKind("123e4567-e12b-12d1-a456-426655440000")).toBe("chave aleatória");
  });

  it("strips accents and non-ASCII from text fields", () => {
    expect(toPixText("  Gália Wïn 🎃 ", 25)).toBe("Galia Win");
  });
});
