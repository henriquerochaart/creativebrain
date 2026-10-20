import { z } from "zod";
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
      return json({ ok: true, ...(await deliver(store, result.entry, () => sendTicketEmail(result.entry, base))) });
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
      return json({ ok: true, ...(await deliver(store, entry, () => sendTicketEmail(entry, base))) });
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
