import { t, type Lang } from "@/lib/i18n";

/**
 * "Share to Brain": turns whatever a share sheet hands us (Android Web Share Target, iOS Shortcut,
 * a bookmarklet) into a capture. Pure parsing lives here so it can be unit tested.
 */
export type SharePayload = { url?: string | null; text?: string | null; title?: string | null };

const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

/** Picks the reference to capture: an explicit url, else the first URL inside text/title, else the text itself as an idea. */
export function inputFromShare(p: SharePayload): { input: string; note: string | null } | null {
  const url = (p.url || "").trim();
  if (/^https?:\/\//i.test(url)) return { input: url, note: noteAround(p.text, p.title, url) };
  for (const field of [p.text, p.title, p.url]) {
    const m = URL_RE.exec(field || "");
    if (m) return { input: m[0].replace(/[.,;:!?]+$/, ""), note: noteAround(p.text, p.title, m[0]) };
  }
  const idea = [p.title, p.text].filter((s) => s && s.trim()).join("\n").trim();
  return idea ? { input: idea, note: null } : null;
}

/** Whatever surrounded the link (Instagram puts the caption in `text`) becomes the user note. */
function noteAround(text: string | null | undefined, title: string | null | undefined, url: string): string | null {
  const rest = [title, text]
    .filter((s): s is string => Boolean(s))
    .map((s) => s.replace(url, "").replace(/\s+/g, " ").trim())
    .filter((s) => s && s.length > 2);
  const note = [...new Set(rest)].join(" — ");
  return note ? note.slice(0, 1000) : null;
}

/**
 * Reads the fields a capture request carried — a JSON body, a form, or query params — into a
 * SharePayload. `input` is accepted as an alias of `text`, since an iOS Shortcut hands over its
 * Shortcut Input as is: a bare URL, or an app's "look at this https://…" text. A field can arrive as
 * a list (a Shortcut Input with several items becomes a JSON array); its strings are joined.
 */
export function payloadFromFields(fields: unknown): SharePayload {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  const f = fields as Record<string, unknown>;
  const str = (v: unknown): string | null => {
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string").join("\n") || null;
    return null;
  };
  const text = [str(f.text), str(f.input)].filter(Boolean).join("\n") || null;
  return { url: str(f.url), text, title: str(f.title) };
}

/** A body sent as plain text (or with no content type at all): JSON if it parses as an object, else the text itself. */
export function payloadFromText(raw: string): SharePayload {
  const body = raw.trim();
  if (body.startsWith("{")) {
    try {
      return payloadFromFields(JSON.parse(body));
    } catch {
      /* not JSON after all: fall through to plain text */
    }
  }
  return { text: body || null };
}

type Captured = { reference: { originalUrl: string | null; title: string | null }; duplicate: boolean };

/**
 * The one line an iOS Shortcut shows as its notification after a background capture, so the
 * person knows it landed without opening anything. `null` means nothing usable arrived.
 */
export function captureReply(lang: Lang, result: Captured | null): string {
  const r = t(lang).share.reply;
  if (!result) return r.nothing;
  const { reference, duplicate } = result;
  const url = reference.originalUrl;
  if (!url) return duplicate ? r.duplicate(clip(reference.title ?? "")) : r.savedIdea;
  const host = hostOf(url);
  // A link not yet understood carries its own URL as title; the host reads better than that.
  const name = reference.title && reference.title !== url ? clip(reference.title) : host;
  return duplicate ? r.duplicate(name) : r.saved(host);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return clip(url);
  }
}

function clip(s: string, max = 60): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}
