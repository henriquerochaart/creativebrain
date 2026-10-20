import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Db } from "./db";
import { newTicketCode, newTicketToken } from "./ticket";

export type EntryStatus = "pending" | "approved" | "rejected";
/** paid: came with a Pix receipt. free: earned by bringing REFERRAL_GOAL paying guests. */
export type EntryKind = "paid" | "free";

export interface Entry {
  id: string;
  name: string;
  email: string;
  status: EntryStatus;
  createdAt: string;
  kind: EntryKind;
  /** Free entries carry no receipt. */
  receiptName: string | null;
  receiptType: string | null;
  receiptSize: number | null;
  receiptHash: string | null;
  /** Referral code of whoever invited this guest. */
  referredBy: string | null;
  reviewedAt: string | null;
  note: string | null;
  ticketCode: string | null;
  ticketToken: string | null;
  emailSentAt: string | null;
  emailError: string | null;
  checkedInAt: string | null;
}

export interface Receipt {
  bytes: Buffer;
  type: string;
  name: string;
}

export type CheckInResult = "checked_in" | "already_checked_in" | "not_valid";

export type RewardStatus = "none" | "ticket_issued" | "refunded";

export interface Referrer {
  id: string;
  code: string;
  name: string;
  email: string;
  createdAt: string;
  rewardStatus: RewardStatus;
  rewardAt: string | null;
}

export interface ReferrerSummary extends Referrer {
  /** Distinct paying guests this person brought whose Pix was confirmed. */
  count: number;
  /** The referrer's own paid entry, if any: decides between a free ticket and a refund. */
  ownEntry: "approved" | "pending" | null;
}

export type ReferralOutcome = "free_ticket" | "refund_owed" | null;

// Every query but the receipt one leaves the bytes out.
const COLUMNS =
  "id, name, email, status, kind, created_at, receipt_name, receipt_type, receipt_size, receipt_hash, referred_by, reviewed_at, note, ticket_code, ticket_token, email_sent_at, email_error, checked_in_at";
const REFERRER_COLUMNS = "id, code, name, email, created_at, reward_status, reward_at";
const REFERRAL_CODE = /^[a-z]{1,10}-[a-z2-9]{4}$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return (value instanceof Date ? value : new Date(String(value))).toISOString();
}

function toEntry(row: Row): Entry {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    status: row.status as EntryStatus,
    kind: (row.kind as EntryKind) ?? "paid",
    createdAt: iso(row.created_at)!,
    receiptName: (row.receipt_name as string | null) ?? null,
    receiptType: (row.receipt_type as string | null) ?? null,
    receiptSize: row.receipt_size === null || row.receipt_size === undefined ? null : Number(row.receipt_size),
    receiptHash: (row.receipt_hash as string | null) ?? null,
    referredBy: (row.referred_by as string | null) ?? null,
    reviewedAt: iso(row.reviewed_at),
    note: (row.note as string | null) ?? null,
    ticketCode: (row.ticket_code as string | null) ?? null,
    ticketToken: (row.ticket_token as string | null) ?? null,
    emailSentAt: iso(row.email_sent_at),
    emailError: (row.email_error as string | null) ?? null,
    checkedInAt: iso(row.checked_in_at),
  };
}

function toReferrer(row: Row): Referrer {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    email: String(row.email),
    createdAt: iso(row.created_at)!,
    rewardStatus: row.reward_status as RewardStatus,
    rewardAt: iso(row.reward_at),
  };
}

// Lowercase, no 0/o, 1/l/i: a code read off a phone screen is unambiguous.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** "Ana Beatriz" → "ana-k7pq": the guest's first name, so a shared link says whose invite it is. */
export function newReferralCode(name: string): string {
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-z]/g, "")
      .slice(0, 10) || "morcego";
  const suffix = Array.from(randomBytes(4), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${slug}-${suffix}`;
}

export function isReferralCode(code: string): boolean {
  return REFERRAL_CODE.test(code);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}

export function receiptHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createStore(db: Db) {
  async function one(sql: string, params: unknown[]): Promise<Entry | null> {
    const { rows } = await db.query<Row>(sql, params);
    return rows[0] ? toEntry(rows[0]) : null;
  }

  async function get(id: string): Promise<Entry | null> {
    if (!UUID.test(id)) return null;
    return one(`select ${COLUMNS} from entries where id = $1`, [id]);
  }

  async function byToken(token: string): Promise<Entry | null> {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
    return one(`select ${COLUMNS} from entries where ticket_token = $1`, [token]);
  }

  async function oneReferrer(sql: string, params: unknown[]): Promise<Referrer | null> {
    const { rows } = await db.query<Row>(sql, params);
    return rows[0] ? toReferrer(rows[0]) : null;
  }

  async function referrerByCode(code: string): Promise<Referrer | null> {
    if (!isReferralCode(code)) return null;
    return oneReferrer(`select ${REFERRER_COLUMNS} from referrers where code = $1`, [code]);
  }

  /** Distinct guests with a confirmed Pix who came through this code, not counting its owner. */
  async function referralCount(code: string): Promise<number> {
    const { rows } = await db.query<{ n: number }>(
      `select count(distinct e.email)::int as n from entries e join referrers r on r.code = e.referred_by
       where e.referred_by = $1 and e.status = 'approved' and e.kind = 'paid' and e.email <> r.email`,
      [code],
    );
    return Number(rows[0]?.n ?? 0);
  }

  async function issueFreeTicket(referrerId: string): Promise<Entry | null> {
    if (!UUID.test(referrerId)) return null;
    // Claim the reward first, so two approvals landing together cannot issue two tickets.
    const claimed = await oneReferrer(
      `update referrers set reward_status = 'ticket_issued', reward_at = now() where id = $1 and reward_status = 'none' returning ${REFERRER_COLUMNS}`,
      [referrerId],
    );
    if (!claimed) return null;
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          return await one(
            `insert into entries (id, name, email, status, kind, reviewed_at, ticket_code, ticket_token, note)
             values ($1, $2, $3, 'approved', 'free', now(), $4, $5, $6) returning ${COLUMNS}`,
            [randomUUID(), claimed.name, claimed.email, newTicketCode(), newTicketToken(), "Entrada grátis por indicação"],
          );
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }
      throw new Error("Could not generate a unique ticket code");
    } catch (error) {
      await db.query(`update referrers set reward_status = 'none', reward_at = null where id = $1`, [referrerId]);
      throw error;
    }
  }

  /** "GW-7K3Q9X", typed at the door when a QR Code will not scan. */
  async function byTicketCode(code: string): Promise<Entry | null> {
    const normalized = code.trim().toUpperCase().replace(/^GW-?/, "GW-");
    if (!/^GW-[A-Z2-9]{6}$/.test(normalized)) return null;
    return one(`select ${COLUMNS} from entries where ticket_code = $1`, [normalized]);
  }

  return {
    get,
    byToken,
    byTicketCode,
    referrerByCode,
    referralCount,
    issueFreeTicket,

    /** One referral code per e-mail: asking again returns the same code. */
    async upsertReferrer(input: { name: string; email: string }): Promise<Referrer> {
      const existing = await oneReferrer(`select ${REFERRER_COLUMNS} from referrers where email = $1`, [input.email]);
      if (existing) return existing;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const created = await oneReferrer(
            `insert into referrers (id, code, name, email) values ($1, $2, $3, $4)
             on conflict (email) do nothing returning ${REFERRER_COLUMNS}`,
            [randomUUID(), newReferralCode(input.name), input.name, input.email],
          );
          if (created) return created;
          // Lost a race with a concurrent request for the same e-mail.
          const raced = await oneReferrer(`select ${REFERRER_COLUMNS} from referrers where email = $1`, [input.email]);
          if (raced) return raced;
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }
      throw new Error("Could not generate a unique referral code");
    },

    async listReferrers(): Promise<ReferrerSummary[]> {
      const { rows } = await db.query<Row>(
        `select ${REFERRER_COLUMNS.split(", ").map((c) => "r." + c).join(", ")},
           coalesce(c.n, 0)::int as n,
           (select case when bool_or(o.status = 'approved') then 'approved' when bool_or(o.status = 'pending') then 'pending' end
              from entries o where o.email = r.email and o.kind = 'paid') as own
         from referrers r
         left join (
           select e.referred_by, count(distinct e.email)::int as n
           from entries e join referrers x on x.code = e.referred_by
           where e.status = 'approved' and e.kind = 'paid' and e.email <> x.email
           group by e.referred_by
         ) c on c.referred_by = r.code
         order by n desc, r.created_at`,
      );
      return rows.map((row) => ({
        ...toReferrer(row),
        count: Number(row.n),
        ownEntry: (row.own as "approved" | "pending" | null) ?? null,
      }));
    },

    /**
     * Run after a referred entry is approved. Reaching the goal with no paid entry of one's own
     * issues the free ticket right away; someone who already paid is owed the R$ back instead,
     * which the panel shows until it is marked as refunded.
     */
    async settleReferral(code: string, goal: number): Promise<{ referrer: Referrer; count: number; outcome: ReferralOutcome; entry?: Entry } | null> {
      const referrer = await referrerByCode(code);
      if (!referrer) return null;
      const count = await referralCount(code);
      if (count < goal || referrer.rewardStatus !== "none") return { referrer, count, outcome: null };
      const { rows } = await db.query<Row>(
        `select 1 from entries where email = $1 and kind = 'paid' and status <> 'rejected' limit 1`,
        [referrer.email],
      );
      if (rows.length > 0) return { referrer, count, outcome: "refund_owed" };
      const entry = await issueFreeTicket(referrer.id);
      return entry ? { referrer, count, outcome: "free_ticket", entry } : { referrer, count, outcome: null };
    },

    async markRefunded(referrerId: string): Promise<Referrer | null> {
      if (!UUID.test(referrerId)) return null;
      return oneReferrer(
        `update referrers set reward_status = 'refunded', reward_at = now() where id = $1 and reward_status = 'none' returning ${REFERRER_COLUMNS}`,
        [referrerId],
      );
    },

    /**
     * A second submission of the same file from the same e-mail (a double tap, a retry after a bad
     * connection) returns the first one instead of queueing a duplicate for review.
     */
    async create(input: {
      name: string;
      email: string;
      receipt: { bytes: Uint8Array; type: string; name: string };
      /** Referral code from the invite link; ignored when unknown or when it is the guest's own. */
      referredBy?: string | null;
    }): Promise<{ entry: Entry; repeated: boolean }> {
      const hash = receiptHash(input.receipt.bytes);
      const existing = await one(
        `select ${COLUMNS} from entries where email = $1 and receipt_hash = $2 and status <> 'rejected' limit 1`,
        [input.email, hash],
      );
      if (existing) return { entry: existing, repeated: true };
      let referredBy: string | null = null;
      if (input.referredBy && isReferralCode(input.referredBy)) {
        const referrer = await referrerByCode(input.referredBy);
        if (referrer && referrer.email !== input.email) referredBy = referrer.code;
      }
      const entry = await one(
        `insert into entries (id, name, email, receipt_name, receipt_type, receipt_size, receipt_hash, receipt, referred_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning ${COLUMNS}`,
        [
          randomUUID(),
          input.name,
          input.email,
          input.receipt.name.slice(0, 200),
          input.receipt.type,
          input.receipt.bytes.byteLength,
          hash,
          Buffer.from(input.receipt.bytes),
          referredBy,
        ],
      );
      return { entry: entry!, repeated: false };
    },

    async list(): Promise<Entry[]> {
      const { rows } = await db.query<Row>(`select ${COLUMNS} from entries order by created_at desc`);
      return rows.map(toEntry);
    },

    async receipt(id: string): Promise<Receipt | null> {
      if (!UUID.test(id)) return null;
      const { rows } = await db.query<Row>(
        "select receipt, receipt_type, receipt_name from entries where id = $1",
        [id],
      );
      const row = rows[0];
      if (!row || row.receipt === null || row.receipt === undefined) return null;
      return {
        bytes: Buffer.from(row.receipt as Uint8Array),
        type: String(row.receipt_type),
        name: String(row.receipt_name),
      };
    },

    /**
     * Issues the ticket once. Approving an already approved entry changes nothing and reports
     * issued=false, so a double click never sends two e-mails or two codes. Re-approving a rejected
     * entry keeps the code it had, if any, so a ticket already in someone's inbox stays the same.
     */
    async approve(id: string): Promise<{ entry: Entry; issued: boolean } | null> {
      if (!UUID.test(id)) return null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const entry = await one(
            `update entries set status = 'approved', reviewed_at = now(), note = null,
               ticket_code = coalesce(ticket_code, $2), ticket_token = coalesce(ticket_token, $3)
             where id = $1 and status <> 'approved' returning ${COLUMNS}`,
            [id, newTicketCode(), newTicketToken()],
          );
          if (entry) return { entry, issued: true };
          const current = await get(id);
          return current ? { entry: current, issued: false } : null;
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }
      throw new Error("Could not generate a unique ticket code");
    },

    /** Also how an issued ticket is cancelled: the door then reads it as not valid. */
    async reject(id: string, note: string | null): Promise<Entry | null> {
      if (!UUID.test(id)) return null;
      return one(
        `update entries set status = 'rejected', reviewed_at = now(), note = $2 where id = $1 returning ${COLUMNS}`,
        [id, note],
      );
    },

    async updateEmail(id: string, email: string): Promise<Entry | null> {
      if (!UUID.test(id)) return null;
      return one(
        `update entries set email = $2, email_sent_at = null, email_error = null where id = $1 returning ${COLUMNS}`,
        [id, email],
      );
    },

    async recordEmail(id: string, result: { ok: true } | { ok: false; error: string }): Promise<Entry | null> {
      return result.ok
        ? one(`update entries set email_sent_at = now(), email_error = null where id = $1 returning ${COLUMNS}`, [id])
        : one(`update entries set email_error = $2 where id = $1 returning ${COLUMNS}`, [id, result.error.slice(0, 500)]);
    },

    /**
     * Atomic, so two phones scanning the same QR Code at the door cannot both let it in.
     */
    async checkIn(token: string): Promise<{ entry: Entry; result: CheckInResult } | null> {
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
      const entry = await one(
        `update entries set checked_in_at = now()
         where ticket_token = $1 and status = 'approved' and checked_in_at is null returning ${COLUMNS}`,
        [token],
      );
      if (entry) return { entry, result: "checked_in" };
      const current = await byToken(token);
      if (!current) return null;
      return {
        entry: current,
        result: current.status === "approved" && current.checkedInAt ? "already_checked_in" : "not_valid",
      };
    },

    async undoCheckIn(token: string): Promise<Entry | null> {
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
      return one(`update entries set checked_in_at = null where ticket_token = $1 returning ${COLUMNS}`, [token]);
    },
  };
}

export type Store = ReturnType<typeof createStore>;

export async function getStore(): Promise<Store> {
  const { getDb } = await import("./db");
  return createStore(await getDb());
}

/** How many other entries share each receipt file, and each e-mail: the two cheap fraud signals. */
export function duplicateSignals(entries: Entry[]) {
  const byHash = new Map<string, Entry[]>();
  const byEmail = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (entry.receiptHash) byHash.set(entry.receiptHash, [...(byHash.get(entry.receiptHash) ?? []), entry]);
    byEmail.set(entry.email, [...(byEmail.get(entry.email) ?? []), entry]);
  }
  return (entry: Entry) => ({
    sameReceipt: entry.receiptHash ? (byHash.get(entry.receiptHash) ?? []).filter((other) => other.id !== entry.id) : [],
    sameEmail: (byEmail.get(entry.email) ?? []).filter((other) => other.id !== entry.id),
  });
}
