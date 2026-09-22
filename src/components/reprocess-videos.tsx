"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "./lang-provider";

type Listed = { references: { id: string }[] };

/**
 * Re-understands every video, one request at a time.
 *
 * What the model wrote is stored at capture time, so a reference keeps the language it was first
 * understood in until it is read again. Sequential on purpose: understanding a video costs a
 * transcription and a vision pass, and firing a hundred of those into one serverless function times
 * it out. One reference per request stays inside maxDuration, and the count below is real progress
 * rather than a spinner. Safe to stop and run again — each pass re-queues what it touches.
 */
export function ReprocessVideos() {
  const router = useRouter();
  const d = useT();
  const [state, setState] = useState<{ running: boolean; done: number; total: number; error?: string }>({ running: false, done: 0, total: 0 });

  async function run() {
    setState({ running: true, done: 0, total: 0 });
    try {
      const { references } = await api<Listed>("/api/references?mediaType=video&status=understood&limit=200");
      setState({ running: true, done: 0, total: references.length });
      for (const [i, r] of references.entries()) {
        await api(`/api/references/${r.id}/reprocess`, { method: "POST" }).catch(() => null);
        setState({ running: true, done: i + 1, total: references.length });
      }
      setState({ running: false, done: references.length, total: references.length });
      router.refresh();
    } catch (err) {
      setState({ running: false, done: 0, total: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={state.running}
        onClick={run}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:bg-paper-2 disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", state.running && "animate-spin")} /> {d.inbox.reprocessVideos}
      </button>
      {state.running && <span className="text-[12px] text-ink-3">{d.inbox.reprocessProgress(state.done, state.total)}</span>}
      {!state.running && state.total > 0 && <span className="text-[12px] text-ink-3">{d.inbox.reprocessDone(state.total)}</span>}
      {state.error && <span className="text-[12px] text-red-600">{state.error}</span>}
    </div>
  );
}
