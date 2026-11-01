import { NextRequest } from "next/server";
import { withAuth, bad } from "@/server/http";
import { inputFromShare, payloadFromFields, payloadFromText, captureReply, referenceLink, type SharePayload } from "@/server/share";
import { captureInput, toPublic } from "@/server/references";
import { getLang } from "@/server/lang";
import { isLang } from "@/lib/i18n";
import { withBase } from "@/lib/base-path";

export const runtime = "nodejs";
// Inline processing runs in `after()`, past the response; the function must live long enough for it.
export const maxDuration = 300;

/**
 * POST /api/capture — the background capture an iOS Shortcut calls from the share sheet, Back Tap
 * or the Action button. Body: JSON or form with `url` / `text` / `title` (or `input`, as the
 * Shortcut Input arrives), or plain text. A link buried in shared text is found the same way the
 * share sheet does it. The response returns as soon as the row exists; understanding continues
 * after it. With `?reply=text` the answer is one plain line for "Show Notification"; with
 * `?reply=link` it is the reference's page as an absolute URL, for "Open URLs" after a menu.
 *
 * GET /api/capture?url=&text=&title= — the same for tools that can only issue a GET.
 * `&redirect=1` jumps to the reference instead.
 */
export const POST = withAuth(async (req: NextRequest) => capture(req, await readPayload(req)));

export const GET = withAuth(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  return capture(req, { url: p.get("url"), text: p.get("text"), title: p.get("title") });
});

async function capture(req: NextRequest, payload: SharePayload): Promise<Response> {
  const p = req.nextUrl.searchParams;
  const reply = p.get("reply");
  // Both plain replies go to a Shortcut, which shows a failure line better than a JSON error.
  const asText = reply === "text" || reply === "link";
  // A Shortcut sends no language cookie, so its reply language rides on the URL it was given.
  const asked = p.get("lang");
  const lang = isLang(asked) ? asked : await getLang();
  const parsed = inputFromShare(payload);
  if (!parsed) return asText ? plain(captureReply(lang, null), 400) : bad("Nothing to capture: pass `url`, `text` or `title`");
  const { reference, duplicate } = await captureInput(parsed.input, { note: parsed.note ?? undefined });
  const status = duplicate ? 200 : 201;
  if (p.get("redirect") === "1") return Response.redirect(new URL(withBase(`/r/${reference.id}`), req.nextUrl.origin), 303);
  if (reply === "link") return plain(referenceLink(req.nextUrl.origin, reference.id), status);
  if (asText) return plain(captureReply(lang, { reference, duplicate }), status);
  return Response.json({ reference: toPublic(reference), duplicate }, { status });
}

async function readPayload(req: NextRequest): Promise<SharePayload> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const fields: Record<string, string[]> = {};
    form.forEach((value, key) => {
      if (typeof value === "string") (fields[key] ??= []).push(value);
    });
    return payloadFromFields(fields);
  }
  // JSON, plain text or no type at all: payloadFromText parses an object body and otherwise keeps
  // the text, so even a malformed JSON body still yields the link inside it.
  return payloadFromText(await req.text());
}

function plain(text: string, status: number): Response {
  return new Response(text, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
