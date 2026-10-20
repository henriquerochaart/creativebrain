import { z } from "zod";
import { event } from "@/config/event";
import { firstName } from "@/lib/format";
import { entrySchema } from "@/lib/validation";
import { denyUnlessAdmin, fail, json, siteUrl } from "@/server/http";
import { mailConfigured, sendRejectionEmail, sendTicketEmail, type MailResult } from "@/server/mail";
import { getStore, type Entry, type Store } from "@/server/store";

export const runtime = "nodejs";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), note: z.string().trim().max(300).nullable().optional(), notify: z.boolean().optional() }),
  z.object({ action: z.literal("resend") }),
  z.object({ action: z.literal("email"), email: entrySchema.shape.email }),
]);

export type MailOutcome = "sent" | "failed" | "not_configured" | "skipped";

async function deliver(store: Store, entry: Entry, send: () => Promise<MailResult>): Promise<{ mail: MailOutcome; mailError?: string }> {
  if (!mailConfigured()) return { mail: "not_configured" };
  const result = await send();
  await store.recordEmail(entry.id, result);
  return result.ok ? { mail: "sent" } : { mail: "failed", mailError: result.error };
}

/**
 * A confirmed guest may complete their referrer's goal: a referrer who has not paid gets the free
 * ticket e-mailed now; one who has paid shows up in the panel as owed a refund.
 */
async function settleReward(store: Store, entry: Entry, base: string): Promise<string | null> {
  if (!entry.referredBy) return null;
  const settled = await store.settleReferral(entry.referredBy, event.referralGoal);
  if (!settled?.outcome) return null;
  const who = firstName(settled.referrer.name);
  if (settled.outcome === "refund_owed") return `${who} completou ${event.referralGoal} indicações e já tinha pago: devolva o Pix (aba Indicações).`;
  if (settled.entry && mailConfigured()) await deliver(store, settled.entry, () => sendTicketEmail(settled.entry!, base));
  return `${who} completou ${event.referralGoal} indicações: entrada grátis emitida.`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ação inválida.");
  const store = await getStore();
  const body = parsed.data;
  const base = siteUrl(request);

  switch (body.action) {
    case "approve": {
      const result = await store.approve(id);
      if (!result) return fail("Entrada não encontrada.", 404);
      // Only the call that issued the ticket e-mails it, so a double click sends one e-mail.
      if (!result.issued) return json({ ok: true, mail: "skipped" satisfies MailOutcome });
      const code = (await store.upsertReferrer({ name: result.entry.name, email: result.entry.email })).code;
      const delivery = await deliver(store, result.entry, () => sendTicketEmail(result.entry, base, code));
      return json({ ok: true, ...delivery, reward: await settleReward(store, result.entry, base) });
    }
    case "reject": {
      const entry = await store.reject(id, body.note || null);
      if (!entry) return fail("Entrada não encontrada.", 404);
      if (!body.notify) return json({ ok: true, mail: "skipped" satisfies MailOutcome });
      return json({ ok: true, ...(await deliver(store, entry, () => sendRejectionEmail(entry, base))) });
    }
    case "resend": {
      const entry = await store.get(id);
      if (!entry) return fail("Entrada não encontrada.", 404);
      if (entry.status !== "approved") return fail("Só dá para reenviar uma entrada aprovada.", 409);
      const code = (await store.upsertReferrer({ name: entry.name, email: entry.email })).code;
      return json({ ok: true, ...(await deliver(store, entry, () => sendTicketEmail(entry, base, code))) });
    }
    case "email": {
      const entry = await store.updateEmail(id, body.email);
      if (!entry) return fail("Entrada não encontrada.", 404);
      // A corrected address on an approved entry is almost always "send it again, to the right place".
      if (entry.status !== "approved") return json({ ok: true, mail: "skipped" satisfies MailOutcome });
      return json({ ok: true, ...(await deliver(store, entry, () => sendTicketEmail(entry, base))) });
    }
  }
}
