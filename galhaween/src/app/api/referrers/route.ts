import { entrySchema } from "@/lib/validation";
import { fail, json } from "@/server/http";
import { dbConfigured } from "@/server/db";
import { getStore } from "@/server/store";

export const runtime = "nodejs";

/** Anyone can ask for an invite link, paid or not: the reward only counts confirmed Pix. */
export async function POST(request: Request) {
  if (!dbConfigured()) return fail("Os pedidos de entrada abrem em breve.", 503);
  const body = (await request.json().catch(() => null)) as { name?: unknown; email?: unknown; website?: unknown } | null;
  if (typeof body?.website === "string" && body.website.trim()) return json({ ok: true, code: null });
  const parsed = entrySchema.safeParse({ name: body?.name, email: body?.email });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const referrer = await (await getStore()).upsertReferrer(parsed.data);
  return json({ ok: true, code: referrer.code });
}
