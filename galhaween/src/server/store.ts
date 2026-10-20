import { createHash, randomUUID } from "node:crypto";
import type { Db } from "./db";
import { newTicketCode, newTicketToken } from "./ticket";

export type EntryStatus = "pending" | "approved" | "rejected";

export interface Entry {
  id: string;
  name: string;
  email: string;
  status: EntryStatus;
  createdAt: string;
  receiptName: string;
  receiptType: string;
  receiptSize: number;
  receiptHash: string;
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

// Every query but the receipt one leaves the bytes out.
const COLUMNS =
  "id, name, email, status, created_at, receipt_name, receipt_type, receipt_size, receipt_hash, reviewed_at, note, ticket_code, ticket_token, email_sent_at, email_error, checked_in_at";

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
    createdAt: iso(row.created_at)!,
    receiptName: String(row.receipt_name),
    receiptType: String(row.receipt_type),
    receiptSize: Number(row.receipt_size),
    receiptHash: String(row.receipt_hash),
    reviewedAt: iso(row.reviewed_at),
    note: (row.note as string | null) ?? null,
    ticketCode: (row.ticket_code as string | null) ?? null,
    ticketToken: (row.ticket_token as string | null) ?? null,
    emailSentAt: iso(row.email_sent_at),
    emailError: (row.email_error as string | null) ?? null,
    checkedInAt: iso(row.checked_in_at),
  };
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

  return {
    get,
    byToken,

    /**
     * A second submission of the same file from the same e-mail (a double tap, a retry after a bad
     * connection) returns the first one instead of queueing a duplicate for review.
     */
    async create(input: {
      name: string;
      email: string;
      receipt: { bytes: Uint8Array; type: string; name: string };
    }): Promise<{ entry: Entry; repeated: boolean }> {
      const hash = receiptHash(input.receipt.bytes);
      const existing = await one(
        `select ${COLUMNS} from entries where email = $1 and receipt_hash = $2 and status <> 'rejected' limit 1`,
        [input.email, hash],
      );
      if (existing) return { entry: existing, repeated: true };
      const entry = await one(
        `insert into entries (id, name, email, receipt_name, receipt_type, receipt_size, receipt_hash, receipt)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning ${COLUMNS}`,
        [
          randomUUID(),
          input.name,
          input.email,
          input.receipt.name.slice(0, 200),
          input.receipt.type,
          input.receipt.bytes.byteLength,
          hash,
          Buffer.from(input.receipt.bytes),
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
      if (!row) return null;
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
    byHash.set(entry.receiptHash, [...(byHash.get(entry.receiptHash) ?? []), entry]);
    byEmail.set(entry.email, [...(byEmail.get(entry.email) ?? []), entry]);
  }
  return (entry: Entry) => ({
    sameReceipt: (byHash.get(entry.receiptHash) ?? []).filter((other) => other.id !== entry.id),
    sameEmail: (byEmail.get(entry.email) ?? []).filter((other) => other.id !== entry.id),
  });
}
