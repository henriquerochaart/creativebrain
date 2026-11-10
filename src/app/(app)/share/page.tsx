import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { inputFromShare } from "@/server/share";
import { captureInput } from "@/server/references";
import { CaptureBox } from "@/components/capture-box";
import { dict } from "@/server/lang";
import { headers } from "next/headers";
import { readCaptureToken } from "@/lib/session";
import { userId } from "@/server/tenant";
import { LimitError } from "@/server/limits";
import type { Dict } from "@/lib/i18n";

/**
 * Share target. Android's share sheet (installed PWA) and the iOS Shortcut land here with
 * ?url= / ?text= / ?title=. We capture and jump to the reference while it is being understood.
 */
export default async function SharePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { d } = await dict();
  const sp = await searchParams;
  const parsed = inputFromShare({ url: sp.url, text: sp.text, title: sp.title });
  if (parsed) {
    // Another site can send a signed-in person here (a link, a hidden redirect): that must not save
    // anything, or spend the account's model calls, on its own. The share sheet, a typed or
    // bookmarked address and the app itself arrive with Sec-Fetch-Site none or same-origin; the
    // bookmarklet runs on someone else's page, so it carries the account's capture token instead.
    const site = (await headers()).get("sec-fetch-site");
    const fromSomewhereElse = site === "cross-site" || site === "same-site";
    const tokenOk = sp.token ? (await readCaptureToken(sp.token)) === (await userId()) : false;
    if (fromSomewhereElse && !tokenOk) return <ConfirmShare input={parsed.input} note={parsed.note ?? null} d={d} />;
    try {
      await captureAndOpen(parsed.input, parsed.note ?? undefined);
    } catch (err) {
      if (!(err instanceof LimitError)) throw err; // includes redirect(), which is how success leaves
      return (
        <div className="mx-auto max-w-2xl pt-8">
          <h1 className="large-title">{err.retryAfter <= 60 ? d.limits.burst : d.limits.capture}</h1>
        </div>
      );
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-8">
      <h1 className="large-title">{d.share.nothingArrived}</h1>
      <Suspense>
        <CaptureBox />
      </Suspense>
      <Link href="/settings#instalar" className="inline-block text-sm text-accent-ink hover:opacity-80">
        {d.share.setupLink}
      </Link>
    </div>
  );
}

async function captureAndOpen(input: string, note?: string): Promise<never> {
  const { reference, duplicate } = await captureInput(input, { note });
  // `redirect` from next/navigation already applies basePath — do not add it here.
  redirect(`/r/${reference.id}${duplicate ? "?dup=1" : "?shared=1"}`);
}

async function confirmShare(form: FormData) {
  "use server";
  const input = String(form.get("input") ?? "").slice(0, 10_000);
  const note = String(form.get("note") ?? "").slice(0, 5000) || undefined;
  if (!input.trim()) redirect("/");
  await captureAndOpen(input, note);
}

/** Arrived from another site: show what would be saved, and save it only on a tap. */
function ConfirmShare({ input, note, d }: { input: string; note: string | null; d: Dict }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-8">
      <h1 className="large-title">{d.share.confirmTitle}</h1>
      <p className="break-words rounded-[16px] bg-paper-2 p-4 text-[15px] text-ink">{input}</p>
      <form action={confirmShare}>
        <input type="hidden" name="input" value={input} />
        {note && <input type="hidden" name="note" value={note} />}
        <button type="submit" className="btn-filled h-11 px-6 text-[17px] lg:h-9">
          {d.share.confirm}
        </button>
      </form>
    </div>
  );
}
