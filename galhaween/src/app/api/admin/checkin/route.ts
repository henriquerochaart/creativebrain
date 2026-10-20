import { denyUnlessAdmin, fail, json } from "@/server/http";
import { getStore } from "@/server/store";

export const runtime = "nodejs";

/** Check-in by the printed code (GW-XXXXXX), for a QR Code that will not scan. */
export async function POST(request: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const store = await getStore();
  const entry = typeof body?.code === "string" ? await store.byTicketCode(body.code) : null;
  if (!entry?.ticketToken) return fail("Código não encontrado.", 404);
  const outcome = await store.checkIn(entry.ticketToken);
  if (!outcome) return fail("Código não encontrado.", 404);
  return json({
    ok: true,
    result: outcome.result,
    checkedInAt: outcome.entry.checkedInAt,
    name: outcome.entry.name,
    token: entry.ticketToken,
    kind: outcome.entry.kind,
  });
}
