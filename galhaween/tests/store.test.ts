import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrate, type Db } from "@/server/db";
import { createStore, duplicateSignals, type Store } from "@/server/store";

const png = (seed: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, seed]);

let db: Db;
let store: Store;

// One embedded Postgres for the file (starting one takes seconds), emptied before each test.
beforeAll(async () => {
  const pg = new PGlite();
  db = { query: (sql, params) => pg.query(sql, params) as never };
  await migrate(db);
  await migrate(db); // migrations are idempotent
  store = createStore(db);
});

beforeEach(async () => {
  await db.query("delete from entries");
});

async function submit(name: string, email: string, seed: number) {
  return store.create({ name, email, receipt: { bytes: png(seed), type: "image/png", name: "pix.png" } });
}

describe("entries", () => {
  it("stores an entry as pending and serves its receipt back byte for byte", async () => {
    const { entry, repeated } = await submit("Morticia Addams", "morticia@example.com", 1);
    expect(repeated).toBe(false);
    expect(entry.status).toBe("pending");
    expect(entry.ticketCode).toBeNull();
    const receipt = await store.receipt(entry.id);
    expect(receipt?.type).toBe("image/png");
    expect(Array.from(receipt!.bytes)).toEqual(Array.from(png(1)));
    expect(await store.list()).toHaveLength(1);
  });

  it("treats the same file from the same e-mail as a retry, not a second entry", async () => {
    const first = await submit("Morticia", "morticia@example.com", 1);
    const again = await submit("Morticia", "morticia@example.com", 1);
    expect(again.repeated).toBe(true);
    expect(again.entry.id).toBe(first.entry.id);
    expect(await store.list()).toHaveLength(1);
  });

  it("flags the same receipt sent under two names", async () => {
    const a = await submit("Morticia", "morticia@example.com", 1);
    const b = await submit("Gomez", "gomez@example.com", 1);
    await submit("Wandinha", "wandinha@example.com", 2);
    const signals = duplicateSignals(await store.list());
    expect(signals(a.entry).sameReceipt.map((e) => e.id)).toEqual([b.entry.id]);
    expect(signals(b.entry).sameReceipt.map((e) => e.id)).toEqual([a.entry.id]);
  });

  it("issues a ticket once, however many times approve is called", async () => {
    const { entry } = await submit("Morticia", "morticia@example.com", 1);
    const first = await store.approve(entry.id);
    expect(first?.issued).toBe(true);
    expect(first?.entry.ticketCode).toMatch(/^GW-[A-HJ-NP-Z2-9]{6}$/);
    expect(first?.entry.ticketToken).toMatch(/^[A-Za-z0-9_-]{24}$/);
    const second = await store.approve(entry.id);
    expect(second?.issued).toBe(false);
    expect(second?.entry.ticketCode).toBe(first?.entry.ticketCode);
  });

  it("keeps the same ticket when a cancelled entry is approved again, and the door refuses it meanwhile", async () => {
    const { entry } = await submit("Morticia", "morticia@example.com", 1);
    const approved = (await store.approve(entry.id))!.entry;
    const rejected = await store.reject(entry.id, "Pix não encontrado no extrato");
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.note).toBe("Pix não encontrado no extrato");
    expect((await store.checkIn(approved.ticketToken!))?.result).toBe("not_valid");
    const again = (await store.approve(entry.id))!.entry;
    expect(again.ticketCode).toBe(approved.ticketCode);
    expect(again.ticketToken).toBe(approved.ticketToken);
    expect(again.note).toBeNull();
  });

  it("lets a ticket in once", async () => {
    const { entry } = await submit("Morticia", "morticia@example.com", 1);
    const { ticketToken } = (await store.approve(entry.id))!.entry;
    const [a, b] = await Promise.all([store.checkIn(ticketToken!), store.checkIn(ticketToken!)]);
    expect([a?.result, b?.result].sort()).toEqual(["already_checked_in", "checked_in"]);
    await store.undoCheckIn(ticketToken!);
    expect((await store.checkIn(ticketToken!))?.result).toBe("checked_in");
  });

  it("does not check in a pending entry or an unknown token", async () => {
    await submit("Morticia", "morticia@example.com", 1);
    expect(await store.checkIn("x".repeat(24))).toBeNull();
    expect(await store.checkIn("not a token")).toBeNull();
  });

  it("records e-mail delivery and clears it when the address is corrected", async () => {
    const { entry } = await submit("Morticia", "morticia@exmaple.com", 1);
    await store.approve(entry.id);
    const failed = await store.recordEmail(entry.id, { ok: false, error: "550 mailbox unavailable" });
    expect(failed?.emailError).toBe("550 mailbox unavailable");
    const fixed = await store.updateEmail(entry.id, "morticia@example.com");
    expect(fixed?.email).toBe("morticia@example.com");
    expect(fixed?.emailError).toBeNull();
    const sent = await store.recordEmail(entry.id, { ok: true });
    expect(sent?.emailSentAt).not.toBeNull();
  });

  it("returns null for ids that are not UUIDs instead of throwing", async () => {
    expect(await store.get("1; drop table entries")).toBeNull();
    expect(await store.approve("nope")).toBeNull();
    expect(await store.receipt("nope")).toBeNull();
  });
});
