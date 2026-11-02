import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { inputFromShare } from "@/server/share";
import { captureInput } from "@/server/references";
import { CaptureBox } from "@/components/capture-box";
import { dict } from "@/server/lang";

/**
 * Share target. Android's share sheet (installed PWA) and the iOS Shortcut land here with
 * ?url= / ?text= / ?title=. We capture and jump to the reference while it is being understood.
 */
export default async function SharePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { d } = await dict();
  const sp = await searchParams;
  const parsed = inputFromShare({ url: sp.url, text: sp.text, title: sp.title });
  if (parsed) {
    const { reference, duplicate } = await captureInput(parsed.input, { note: parsed.note ?? undefined });
    // `redirect` from next/navigation already applies basePath — do not add it here.
    redirect(`/r/${reference.id}${duplicate ? "?dup=1" : "?shared=1"}`);
  }
  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-8 text-center">
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
