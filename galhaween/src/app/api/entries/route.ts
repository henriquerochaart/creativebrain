import { entrySchema, MAX_RECEIPT_BYTES, sniffReceiptType } from "@/lib/validation";
import { fail, json } from "@/server/http";
import { REFERRAL_COOKIE } from "@/lib/referral";
import { dbConfigured } from "@/server/db";
import { getStore } from "@/server/store";

export const runtime = "nodejs";

function readCookie(request: Request, name: string): string | null {
  const match = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(request: Request) {
  if (!dbConfigured()) return fail("Os pedidos de entrada abrem em breve.", 503);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_RECEIPT_BYTES + 64 * 1024) {
    return fail("O arquivo passou de 4 MB. Mande um print da tela do comprovante.", 413);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Não consegui ler o envio. Tente de novo.");
  }
  // Honeypot filled: answer like a success so the bot moves on, store nothing.
  if (String(form.get("website") ?? "").trim()) return json({ ok: true });

  const parsed = entrySchema.safeParse({ name: form.get("name"), email: form.get("email") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const file = form.get("receipt");
  if (!(file instanceof File) || file.size === 0) return fail("Anexe o comprovante do Pix.");
  if (file.size > MAX_RECEIPT_BYTES) return fail("O arquivo passou de 4 MB. Mande um print da tela do comprovante.", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffReceiptType(bytes);
  if (!type) return fail("Esse arquivo não parece uma imagem ou um PDF. Mande um print ou o PDF do comprovante.");

  const store = await getStore();
  const referredBy = readCookie(request, REFERRAL_COOKIE);
  const { entry } = await store.create({
    ...parsed.data,
    receipt: { bytes, type, name: file.name || "comprovante" },
    referredBy,
  });
  // Every guest gets their own invite link on the confirmation screen.
  const referrer = await store.upsertReferrer(parsed.data);
  return json({ ok: true, email: entry.email, referralCode: referrer.code });
}
