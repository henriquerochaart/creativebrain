"use client";

import { useEffect, useState } from "react";
import { withBase } from "@/lib/base-path";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Registers the service worker and offers the browser's install prompt when it is available. */
export function InstallButton() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(withBase("/sw.js"), { scope: withBase("/") }).catch(() => undefined);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (installed) return <span className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm text-ink-2">Installed ✓ — look for Brain in the share sheet</span>;
  return (
    <button
      type="button"
      disabled={!evt}
      title={evt ? "" : "Open this page in Chrome on Android to install"}
      onClick={async () => { if (!evt) return; await evt.prompt(); const c = await evt.userChoice; if (c.outcome === "accepted") setInstalled(true); }}
      className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-40"
    >
      Install Brain
    </button>
  );
}

export function CopyField({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="mt-1 flex items-center gap-2">
      <code className="rounded-lg bg-paper-2 px-2 py-1 font-mono text-[12.5px] text-ink">{value}</code>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }} className="text-[12px] text-ink-2 hover:text-ink">
        {done ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
