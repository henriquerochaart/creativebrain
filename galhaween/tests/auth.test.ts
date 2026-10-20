import { describe, expect, it } from "vitest";
import { passwordMatches, SESSION_SECONDS, signSession, verifySession } from "@/server/auth";

const password = "abobora-sangrenta-42";

describe("admin session", () => {
  it("accepts its own signature until it expires", () => {
    const now = Date.now();
    const value = signSession(password, now);
    expect(verifySession(value, password, now + 1000)).toBe(true);
    expect(verifySession(value, password, now + SESSION_SECONDS * 1000 + 1)).toBe(false);
  });

  it("rejects a tampered expiry, a changed password and garbage", () => {
    const value = signSession(password);
    const [expiry, signature] = value.split(".");
    expect(verifySession(`${Number(expiry) + 1}.${signature}`, password)).toBe(false);
    expect(verifySession(value, "outra-senha-qualquer")).toBe(false);
    expect(verifySession(value, null)).toBe(false);
    expect(verifySession("garbage", password)).toBe(false);
    expect(verifySession(undefined, password)).toBe(false);
  });

  it("compares passwords and refuses when none is configured", () => {
    expect(passwordMatches(password, password)).toBe(true);
    expect(passwordMatches("errada", password)).toBe(false);
    expect(passwordMatches("", null)).toBe(false);
  });
});
