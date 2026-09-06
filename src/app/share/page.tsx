import { redirect } from "next/navigation";
import { Suspense } from "react";
import { inputFromShare } from "@/server/share";
import { captureInput } from "@/server/references";
import { CaptureBox } from "@/components/capture-box";

/**
 * Share target. Android's share sheet (installed PWA) and the iOS Shortcut land here with
 * ?url= / ?text= / ?title=. We capture and jump to the reference while it is being understood.
 */
export default async function SharePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const parsed = inputFromShare({ url: sp.url, text: sp.text, title: sp.title });
  if (parsed) {
    const { reference, duplicate } = await captureInput(parsed.input, { note: parsed.note ?? undefined });
    redirect(`/r/${reference.id}${duplicate ? "?dup=1" : "?shared=1"}`);
  }
  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-8 text-center">
      <p className="eyebrow">Share to Brain</p>
      <h1 className="text-2xl font-semibold tracking-tight">Nothing arrived with the share.</h1>
      <p className="text-sm text-ink-2">Paste it here instead, or set up one-tap sharing from your phone.</p>
      <Suspense>
        <CaptureBox />
      </Suspense>
      <a href="/share/setup" className="inline-block text-sm text-ink-2 underline-offset-4 hover:underline">
        Set up “Share to Brain” on iPhone and Android →
      </a>
    </div>
  );
}
