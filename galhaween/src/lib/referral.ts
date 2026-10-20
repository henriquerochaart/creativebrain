/** Set from ?i=<code> on any page, read when the guest submits their receipt. */
export const REFERRAL_COOKIE = "gw_ref";
export const REFERRAL_PARAM = "i";
export const REFERRAL_DAYS = 30;

export function referralUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/?${REFERRAL_PARAM}=${code}`;
}

export function whatsappShare(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
