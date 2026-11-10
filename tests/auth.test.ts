import { afterEach, describe, expect, it, vi } from "vitest";

// The API key and the old capture token act as the owner, looked up in the database; here, a stub.
// sessionUser checks the session version in the database; here every account is at version 0.
vi.mock("@/server/tenant", async () => {
  const session = await import("@/lib/session");
  return {
    ownerId: async () => "owner-1",
    sessionUser: async (token: string | null | undefined) => {
      const claims = await session.readSessionClaims(token);
      return claims && claims.version === 0 ? claims.userId : null;
    },
  };
});

async function load(key: string) {
  vi.resetModules();
  process.env.BRAIN_API_KEY = key;
  process.env.AUTH_SECRET = "test-secret";
  const auth = await import("@/server/auth");
  const session = await import("@/lib/session");
  return { ...auth, ...session };
}

describe("API auth", () => {
  afterEach(() => {
    delete process.env.BRAIN_API_KEY;
    delete process.env.AUTH_SECRET;
  });
  it("is closed by default: no key configured no longer means open", async () => {
    const { authorizedUser } = await load("");
    expect(await authorizedUser(new Request("http://x/api/search"))).toBeNull();
  });
  it("resolves a signed-in account from its session cookie, and not from a forged one", async () => {
    const { authorizedUser, signSession, SESSION_COOKIE } = await load("");
    const token = await signSession("user-1");
    expect(await authorizedUser(new Request("http://x/api/search", { headers: { cookie: `a=b; ${SESSION_COOKIE}=${token}` } }))).toBe("user-1");
    const forged = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
    expect(await authorizedUser(new Request("http://x/api/search", { headers: { cookie: `${SESSION_COOKIE}=${forged}` } }))).toBeNull();
  });
  it("lets the API key act as the owner", async () => {
    const { authorizedUser } = await load("secret-123");
    expect(await authorizedUser(new Request("http://x/api/search", { headers: { authorization: "Bearer secret-123" } }))).toBe("owner-1");
    expect(await authorizedUser(new Request("http://x/api/search", { headers: { "x-api-key": "secret-123" } }))).toBe("owner-1");
    expect(await authorizedUser(new Request("http://x/api/search", { headers: { authorization: "Bearer wrong-key-1" } }))).toBeNull();
  });
  it("sends a capture into the library of the account whose token it carries, on /api/capture only", async () => {
    const { authorizedUser, captureToken, readCaptureToken } = await load("");
    const ana = await captureToken("ana-uuid");
    const bia = await captureToken("bia-uuid");
    expect(await authorizedUser(new Request(`http://x/api/capture?reply=text&token=${ana}`, { method: "POST" }))).toBe("ana-uuid");
    expect(await authorizedUser(new Request(`http://x/api/capture?token=${bia}`, { method: "POST" }))).toBe("bia-uuid");
    // A token with someone else's id swapped in does not verify.
    expect(await readCaptureToken(`bia-uuid.${ana.split(".")[1]}`)).toBeNull();
    expect(await authorizedUser(new Request(`http://x/api/references?token=${ana}`))).toBeNull();
  });
  it("still accepts the single token from before per-account libraries, for the owner", async () => {
    const { authorizedUser, legacyCaptureToken } = await load("");
    expect(await authorizedUser(new Request(`http://x/api/capture?token=${await legacyCaptureToken()}`, { method: "POST" }))).toBe("owner-1");
  });
  it("no longer trusts the UI header on its own", async () => {
    const { isAuthorized } = await load("secret-123");
    expect(await isAuthorized(new Request("http://x/api/search", { headers: { "x-brain-ui": "1", "sec-fetch-site": "same-origin" } }))).toBe(false);
  });
});

describe("sessions", () => {
  it("expire", async () => {
    const { signSession, readSession } = await load("");
    const t0 = Date.UTC(2026, 0, 1);
    const token = await signSession("user-1", t0);
    expect(await readSession(token, t0 + 1000)).toBe("user-1");
    expect(await readSession(token, t0 + 181 * 86_400_000)).toBeNull();
    expect(await readSession("garbage", t0)).toBeNull();
    expect(await readSession(null, t0)).toBeNull();
  });
});

describe("password reset links", () => {
  const uid = "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b";
  it("work for their account, within 30 minutes, until the password changes", async () => {
    const { resetToken, readResetToken } = await load("");
    const t0 = Date.UTC(2026, 0, 1);
    let hash = "scrypt$old";
    const hashOf = async (id: string) => (id === uid ? hash : null);
    const token = await resetToken(uid, hash, t0);
    expect(await readResetToken(token, hashOf, t0 + 60_000)).toBe(uid);
    expect(await readResetToken(token, hashOf, t0 + 31 * 60_000)).toBeNull();
    hash = "scrypt$new";
    expect(await readResetToken(token, hashOf, t0 + 60_000)).toBeNull();
  });
  it("cannot be forged, extended or moved to another account", async () => {
    const { resetToken, readResetToken } = await load("");
    const t0 = Date.UTC(2026, 0, 1);
    const hashOf = async () => "scrypt$same";
    const token = await resetToken(uid, "scrypt$same", t0);
    const [, exp, sig] = token.split(".");
    expect(await readResetToken(`${uid}.${Number(exp) + 86_400_000}.${sig}`, hashOf, t0)).toBeNull();
    expect(await readResetToken(`00000000-0000-4000-8000-000000000000.${exp}.${sig}`, hashOf, t0)).toBeNull();
    expect(await readResetToken(`${token}.x`, hashOf, t0)).toBeNull();
    expect(await readResetToken("garbage", hashOf, t0)).toBeNull();
    expect(await readResetToken(undefined, hashOf, t0)).toBeNull();
  });
});

describe("session versions", () => {
  it("carry the version they were signed with; old cookies read as version 0", async () => {
    const { signSession, readSessionClaims, readSession } = await load("");
    const t0 = Date.UTC(2026, 0, 1);
    expect(await readSessionClaims(await signSession("user-1", t0, 3), t0 + 1000)).toEqual({ userId: "user-1", version: 3 });
    expect(await readSessionClaims(await signSession("user-1", t0), t0 + 1000)).toEqual({ userId: "user-1", version: 0 });
    // The middleware's signature-only check still accepts it; the database decides the version.
    expect(await readSession(await signSession("user-1", t0, 3), t0 + 1000)).toBe("user-1");
  });
  it("an API call with a cookie from an older version is refused", async () => {
    const { authorizedUser, signSession, SESSION_COOKIE } = await load("");
    const stale = await signSession("user-1", Date.now(), 2);
    expect(await authorizedUser(new Request("http://x/api/search", { headers: { cookie: `${SESSION_COOKIE}=${stale}` } }))).toBeNull();
  });
});
