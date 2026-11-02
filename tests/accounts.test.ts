import { describe, expect, it, vi } from "vitest";

// accounts.ts imports the database client and next/headers; only the pure helpers are tested here.
vi.mock("@/server/db/client", () => ({ db: {}, pool: {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

describe("accounts", () => {
  it("hashes passwords with a salt and verifies them", async () => {
    const { hashPassword, verifyPassword } = await import("@/server/accounts");
    const a = await hashPassword("correct horse");
    const b = await hashPassword("correct horse");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", a)).toBe(true);
    expect(await verifyPassword("wrong horse", a)).toBe(false);
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });
  it("checks an email and a password of 8 or more", async () => {
    const { validCredentials, normalizeEmail } = await import("@/server/accounts");
    expect(validCredentials("a@b.co", "12345678")).toBeNull();
    expect(validCredentials("not-an-email", "12345678")).toBe("email");
    expect(validCredentials("a@b.co", "short")).toBe("password");
    expect(normalizeEmail("  Henrique@Example.COM ")).toBe("henrique@example.com");
  });
});
