import { event } from "@/config/event";
import { buildPixPayload, formatPixKey, pixKeyKind } from "@/lib/pix";

export interface PixDetails {
  payload: string;
  key: string;
  keyDisplay: string;
  keyKind: string;
  name: string;
}

/**
 * The receiving account comes from the environment, all three values or none: the city is a
 * required BR Code field and nothing here guesses one.
 */
export function pixDetails(): PixDetails | null {
  const key = process.env.PIX_KEY?.trim();
  const name = process.env.PIX_NAME?.trim();
  const city = process.env.PIX_CITY?.trim();
  if (!key || !name || !city) return null;
  return {
    payload: buildPixPayload({ key, name, city, amount: event.price }),
    key,
    keyDisplay: formatPixKey(key),
    keyKind: pixKeyKind(key),
    name,
  };
}
