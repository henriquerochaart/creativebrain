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
  await db.query("delete from referrers");
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

describe("referrals", () => {
  async function referred(name: string, email: string, seed: number, code: string) {
    const { entry } = await store.create({
      name,
      email,
      receipt: { bytes: png(seed), type: "image/png", name: "pix.png" },
      referredBy: code,
    });
    return entry;
  }

  it("gives one code per e-mail, built from the first name", async () => {
    const a = await store.upsertReferrer({ name: "Ána Beatriz", email: "ana@example.com" });
    const b = await store.upsertReferrer({ name: "Outro Nome", email: "ana@example.com" });
    expect(a.code).toMatch(/^ana-[a-z2-9]{4}$/);
    expect(b.code).toBe(a.code);
  });

  it("counts only distinct guests whose Pix was confirmed, never the referrer", async () => {
    const ana = await store.upsertReferrer({ name: "Ana", email: "ana@example.com" });
    const one = await referred("Bia", "bia@example.com", 1, ana.code);
    await referred("Bia de novo", "bia@example.com", 2, ana.code); // same guest twice
    await referred("Caio", "caio@example.com", 3, ana.code); // still pending
    const self = await referred("Ana", "ana@example.com", 4, ana.code); // own link
    expect(self.referredBy).toBeNull();
    expect(await store.referralCount(ana.code)).toBe(0);
    await store.approve(one.id);
    expect(await store.referralCount(ana.code)).toBe(1);
    const unknown = await referred("Dani", "dani@example.com", 5, "ninguem-zzzz");
    expect(unknown.referredBy).toBeNull();
  });

  it("issues a free ticket at the goal when the referrer has not paid, exactly once", async () => {
    const ana = await store.upsertReferrer({ name: "Ana", email: "ana@example.com" });
    for (let i = 0; i < 3; i++) {
      const entry = await referred(`Convidado ${i}`, `g${i}@example.com`, 10 + i, ana.code);
      await store.approve(entry.id);
    }
    const settled = await store.settleReferral(ana.code, 3);
    expect(settled?.outcome).toBe("free_ticket");
    expect(settled?.entry?.kind).toBe("free");
    expect(settled?.entry?.status).toBe("approved");
    expect(settled?.entry?.ticketCode).toMatch(/^GW-/);
    expect(settled?.entry?.receiptHash).toBeNull();
    expect((await store.settleReferral(ana.code, 3))?.outcome).toBeNull();
    const free = (await store.list()).filter((e) => e.kind === "free");
    expect(free).toHaveLength(1);
    expect(await store.receipt(free[0].id)).toBeNull();
    const [summary] = await store.listReferrers();
    expect(summary.count).toBe(3);
    expect(summary.rewardStatus).toBe("ticket_issued");
  });

  it("marks a refund as owed when the referrer already paid, until it is recorded", async () => {
    const ana = await store.upsertReferrer({ name: "Ana", email: "ana@example.com" });
    await store.create({ name: "Ana", email: "ana@example.com", receipt: { bytes: png(99), type: "image/png", name: "pix.png" } });
    for (let i = 0; i < 2; i++) {
      const entry = await referred(`Convidado ${i}`, `g${i}@example.com`, 20 + i, ana.code);
      await store.approve(entry.id);
    }
    expect((await store.settleReferral(ana.code, 2))?.outcome).toBe("refund_owed");
    const [summary] = await store.listReferrers();
    expect(summary.ownEntry).toBe("pending");
    expect((await store.markRefunded(ana.id))?.rewardStatus).toBe("refunded");
    expect(await store.markRefunded(ana.id)).toBeNull();
    expect((await store.settleReferral(ana.code, 2))?.outcome).toBeNull();
  });
});
