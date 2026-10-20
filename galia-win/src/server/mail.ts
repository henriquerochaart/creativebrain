import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { event } from "@/config/event";
import { firstName } from "@/lib/format";
import type { Entry } from "./store";
import { qrPng, ticketUrl } from "./ticket";

/**
 * Plain SMTP, so it works with a Gmail app password (no domain to verify) as well as Resend,
 * Brevo or any provider. Without SMTP settings nothing is sent and the admin panel says so and
 * offers the ticket link to forward by hand.
 */
export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: Transporter | null = null;

function transport(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export type MailResult = { ok: true } | { ok: false; error: string };

async function send(message: SendMailOptions): Promise<MailResult> {
  if (!mailConfigured()) return { ok: false, error: "SMTP não configurado" };
  try {
    await transport().sendMail({
      from: process.env.SMTP_FROM || `${event.name} <${process.env.SMTP_USER}>`,
      ...message,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const COLORS = { night: "#050505", ash: "#121010", bone: "#efe6dc", muted: "#a89c90", blood: "#c1121f" };
const SERIF = "Georgia, 'Times New Roman', serif";

function layout(body: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:${COLORS.night};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.night};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${COLORS.ash};border-top:3px solid ${COLORS.blood};font-family:${SERIF};color:${COLORS.bone};">
<tr><td style="padding:36px 32px 8px;text-align:center;font-size:30px;letter-spacing:6px;color:${COLORS.bone};">${escape(event.name.toUpperCase())}</td></tr>
${body}
<tr><td style="padding:24px 32px 32px;text-align:center;font-size:13px;color:${COLORS.muted};font-style:italic;">Até lá. Se tiver coragem.</td></tr>
</table></td></tr></table></body></html>`;
}

function eventLines(): string[] {
  return [event.date, event.time, event.venue, event.address].filter((line): line is string => Boolean(line));
}

export async function sendTicketEmail(entry: Entry, siteUrl: string): Promise<MailResult> {
  if (!entry.ticketToken || !entry.ticketCode) return { ok: false, error: "Entrada sem código" };
  const url = ticketUrl(siteUrl, entry.ticketToken);
  const qr = await qrPng(url, 520);
  const details = eventLines();
  const html = layout(`
<tr><td style="padding:8px 32px 0;text-align:center;font-size:18px;line-height:1.6;">
  ${escape(firstName(entry.name))}, seu Pix foi confirmado.<br>Esta é a sua entrada.
</td></tr>
<tr><td align="center" style="padding:28px 32px 8px;">
  <img src="cid:ticket-qr" width="240" height="240" alt="QR Code da entrada ${escape(entry.ticketCode)}" style="display:block;width:240px;height:240px;border:6px solid ${COLORS.bone};">
</td></tr>
<tr><td style="padding:12px 32px 0;text-align:center;font-size:26px;letter-spacing:4px;color:${COLORS.blood};font-weight:bold;">${escape(entry.ticketCode)}</td></tr>
<tr><td style="padding:4px 32px 0;text-align:center;font-size:16px;">${escape(entry.name)}</td></tr>
<tr><td style="padding:24px 32px 0;text-align:center;font-size:15px;line-height:1.6;color:${COLORS.muted};">
  Mostre o QR Code na porta. Ele vale para uma pessoa e é lido uma vez só.
  ${details.length ? `<br><br>${details.map(escape).join("<br>")}` : ""}
</td></tr>
<tr><td align="center" style="padding:28px 32px 0;">
  <a href="${escape(url)}" style="display:inline-block;background:${COLORS.blood};color:#ffffff;text-decoration:none;font-size:16px;padding:14px 28px;border-radius:999px;">Abrir minha entrada</a>
</td></tr>`);
  const text = [
    `${firstName(entry.name)}, seu Pix foi confirmado. Esta é a sua entrada para a ${event.name}.`,
    "",
    `Código: ${entry.ticketCode}`,
    `Nome: ${entry.name}`,
    "",
    "Mostre o QR Code na porta. Ele vale para uma pessoa e é lido uma vez só.",
    `Sua entrada: ${url}`,
    ...(details.length ? ["", ...details] : []),
  ].join("\n");
  return send({
    to: entry.email,
    subject: `Sua entrada para a ${event.name} 🎃`,
    html,
    text,
    attachments: [{ filename: `entrada-${entry.ticketCode}.png`, content: qr, cid: "ticket-qr" }],
  });
}

export async function sendRejectionEmail(entry: Entry): Promise<MailResult> {
  const reason = entry.note ? `Motivo: ${entry.note}` : "";
  const html = layout(`
<tr><td style="padding:8px 32px 0;text-align:center;font-size:18px;line-height:1.6;">
  ${escape(firstName(entry.name))}, não conseguimos confirmar o seu Pix.
</td></tr>
<tr><td style="padding:20px 32px 0;text-align:center;font-size:15px;line-height:1.6;color:${COLORS.muted};">
  ${reason ? `${escape(reason)}<br><br>` : ""}Se você pagou, responda este e-mail com o comprovante que a gente confere de novo.
</td></tr>`);
  const text = [
    `${firstName(entry.name)}, não conseguimos confirmar o seu Pix para a ${event.name}.`,
    ...(reason ? ["", reason] : []),
    "",
    "Se você pagou, responda este e-mail com o comprovante que a gente confere de novo.",
  ].join("\n");
  return send({ to: entry.email, subject: `Sobre a sua entrada para a ${event.name}`, html, text });
}
