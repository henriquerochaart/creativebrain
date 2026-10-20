import { denyUnlessAdmin, fail, json } from "@/server/http";
import { getStore } from "@/server/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { token } = await params;
  const body = (await request.json().catch(() => null)) as { undo?: boolean } | null;
  const store = await getStore();
  if (body?.undo) {
    const entry = await store.undoCheckIn(token);
    return entry ? json({ ok: true, result: "undone" }) : fail("Entrada não encontrada.", 404);
  }
  const outcome = await store.checkIn(token);
  if (!outcome) return fail("Entrada não encontrada.", 404);
  return json({ ok: true, result: outcome.result, checkedInAt: outcome.entry.checkedInAt });
}
