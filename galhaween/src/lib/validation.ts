import { z } from "zod";

/** Vercel caps a request body at 4.5 MB; the form compresses large photos below this first. */
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

export const entrySchema = z.object({
  name: z.string().trim().min(2, "Escreva seu nome completo.").max(80, "Nome longo demais."),
  email: z.string().trim().toLowerCase().pipe(z.email("Esse e-mail não parece certo.")),
});

const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif", "application/pdf"] as const;
export type ReceiptType = (typeof RECEIPT_TYPES)[number];

/**
 * Reads the type from the file's first bytes instead of trusting the browser's label, so nothing
 * but an image or a PDF is ever stored or served back to the admin (no SVG, no HTML).
 */
export function sniffReceiptType(bytes: Uint8Array): ReceiptType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
}

export function isReceiptType(type: string): type is ReceiptType {
  return (RECEIPT_TYPES as readonly string[]).includes(type);
}

const COMMON_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "hotmail.com.br",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "yahoo.com.br",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "ig.com.br",
];

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * "fulano@gmial.com" → "fulano@gmail.com". A typo here means a paid ticket that never arrives, so
 * the form offers the fix; it never applies it on its own.
 */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || COMMON_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of COMMON_DOMAINS) {
    const d = distance(domain, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best ? `${email.slice(0, at).trim()}@${best}` : null;
}
