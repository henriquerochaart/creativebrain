import { randomBytes } from "node:crypto";
import QRCode from "qrcode";

// No 0/O or 1/I, so a code read aloud at the door is unambiguous. 32 symbols divide 256 evenly,
// so taking a byte modulo 32 has no bias.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short code a person can read: GW-7K3Q9X. */
export function newTicketCode(): string {
  return "GW-" + Array.from(randomBytes(6), (byte) => ALPHABET[byte % 32]).join("");
}

/** Unguessable id for the ticket URL the QR Code points to (144 bits). */
export function newTicketToken(): string {
  return randomBytes(18).toString("base64url");
}

export function ticketUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/entrada/${token}`;
}

// Dark modules on a light ground: bank and camera scanners do not all read inverted codes.
const QR_COLORS = { dark: "#0a0a0a", light: "#f4ede4" };

export function qrPng(text: string, width = 480): Promise<Buffer> {
  return QRCode.toBuffer(text, { margin: 2, width, color: QR_COLORS, errorCorrectionLevel: "M" });
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 2, color: QR_COLORS, errorCorrectionLevel: "M" });
}
