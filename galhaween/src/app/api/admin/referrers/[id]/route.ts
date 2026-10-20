import { z } from "zod";
import { denyUnlessAdmin, fail, json, siteUrl } from "@/server/http";
import { mailConfigured, sendTicketEmail } from "@/server/mail";
import { getStore } from "@/server/store";

export const runtime = "nodejs";

const actionSchema = z.object({ action: z.enum(["issue_free", "mark_refunded"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Ação inválida.");
  const store = await getStore();

  if (parsed.data.action === "mark_refunded") {
    const referrer = await store.markRefunded(id);
    return referrer ? json({ ok: true, message: "Devolução registrada." }) : fail("Já resolvido ou não encontrado.", 409);
  }

  const entry = await store.issueFreeTicket(id);
  if (!entry) return fail("Já resolvido ou não encontrado.", 409);
  if (!mailConfigured()) return json({ ok: true, message: "Entrada grátis emitida. E-mail não configurado: mande o link." });
  const result = await sendTicketEmail(entry, siteUrl(request));
  await store.recordEmail(entry.id, result);
  return json({ ok: true, message: result.ok ? "Entrada grátis emitida e enviada por e-mail." : `Entrada emitida, mas o e-mail falhou (${result.error}).` });
}
