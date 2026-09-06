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
