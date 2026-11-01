"use client";

import { useEffect, useState } from "react";
import { withBase } from "@/lib/base-path";
import { useT } from "./lang-provider";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Registers the service worker and offers the browser's install prompt when it is available. */
export function InstallButton() {
  const d = useT();
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
  if (installed) return <span className="btn-gray h-11 px-4 text-[15px] lg:h-10 lg:text-sm">{d.share.setup.installed}</span>;
  return (
    <button
      type="button"
      disabled={!evt}
      title={evt ? "" : d.share.setup.installHint}
      onClick={async () => { if (!evt) return; await evt.prompt(); const c = await evt.userChoice; if (c.outcome === "accepted") setInstalled(true); }}
      className="btn-filled h-11 px-4 text-[15px] lg:h-10 lg:text-sm"
    >
      {d.share.setup.install}
    </button>
  );
}

export function CopyField({ value }: { value: string }) {
  const d = useT();
  const [done, setDone] = useState(false);
  return (
    // Wraps on a phone: the URL breaks anywhere and the button drops below it rather than running off the edge.
    <span className="mt-1 flex flex-wrap items-center gap-x-3">
      <code className="min-w-0 break-all rounded-lg bg-fill px-2 py-1 font-mono text-[12.5px] text-ink">{value}</code>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }} className="min-h-11 text-[15px] text-accent lg:min-h-0 lg:text-[13px]">
        {done ? d.share.setup.copied : d.share.setup.copy}
      </button>
    </span>
  );
}
