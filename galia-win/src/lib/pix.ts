/**
 * Static Pix "BR Code" (the copia-e-cola string behind a Pix QR Code), per the Banco Central
 * "Manual de Padrões para Iniciação do Pix": EMV QRCPS-MPM fields, each written as a two-digit id,
 * a two-digit length and the value, closed by a CRC16-CCITT-FALSE over the whole payload.
 */

export interface PixInput {
  /** Pix key exactly as registered: +5511999999999 for a phone, an e-mail, a CPF/CNPJ or a random key. */
  key: string;
  /** Recipient name, shown by some banks before the payer confirms. Max 25 ASCII characters. */
  name: string;
  /** Recipient city. Max 15 ASCII characters. */
  city: string;
  /** Amount in reais. Omit to let the payer type it. */
  amount?: number;
  /** Transaction id, alphanumeric, max 25. "***" means none, which is what a static code usually carries. */
  txid?: string;
}

function field(id: string, value: string): string {
  if (value.length > 99) throw new Error(`Pix field ${id} is longer than 99 characters`);
  return id + String(value.length).padStart(2, "0") + value;
}

/** BR Code fields must be plain ASCII; banks reject accented names. */
export function toPixText(value: string, max: number): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .trim()
    .slice(0, max)
    .trim();
}

/**
 * Turns a phone typed in any common Brazilian format into the +55 form Pix registers phone keys
 * under. Anything that is not clearly a phone (e-mail, CPF, CNPJ, random key) is returned as is:
 * an 11-digit number could be a CPF, so it only counts as a phone when it carries a +.
 */
export function normalizePixKey(key: string): string {
  const trimmed = key.trim();
  if (/^\+[\d\s().-]+$/.test(trimmed)) return "+" + trimmed.replace(/\D/g, "");
  return trimmed;
}

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(input: PixInput): string {
  const key = normalizePixKey(input.key);
  if (!key) throw new Error("Pix key is empty");
  const name = toPixText(input.name, 25);
  const city = toPixText(input.city, 15);
  if (!name || !city) throw new Error("Pix recipient name and city are required");
  const txid = (input.txid ?? "***").replace(/[^A-Za-z0-9*]/g, "").slice(0, 25) || "***";

  let payload =
    field("00", "01") +
    field("26", field("00", "br.gov.bcb.pix") + field("01", key)) +
    field("52", "0000") +
    field("53", "986");
  if (input.amount !== undefined) {
    if (!(input.amount > 0)) throw new Error("Pix amount must be positive");
    payload += field("54", input.amount.toFixed(2));
  }
  payload += field("58", "BR") + field("59", name) + field("60", city) + field("62", field("05", txid));
  payload += "6304";
  return payload + crc16(payload);
}

/** "+5511987654321" → "(11) 98765-4321"; anything else is shown as typed. */
export function formatPixKey(key: string): string {
  const normalized = normalizePixKey(key);
  const phone = normalized.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  if (phone) return `(${phone[1]}) ${phone[2]}-${phone[3]}`;
  return normalized;
}

export function pixKeyKind(key: string): "telefone" | "e-mail" | "CPF/CNPJ" | "chave aleatória" {
  const normalized = normalizePixKey(key);
  if (normalized.startsWith("+")) return "telefone";
  if (normalized.includes("@")) return "e-mail";
  if (/^[\d.\-/]+$/.test(normalized)) return "CPF/CNPJ";
  return "chave aleatória";
}
