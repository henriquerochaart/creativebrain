"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { reprocessThrottled } from "@/lib/reprocess";
import { cn } from "@/lib/utils";

/** Shared shell for a throttled bulk reprocess: a button, live "N of M" progress, an error line. */
export function BulkReprocess({
  label,
  resolveIds,
  progress,
  done,
}: {
  label: string;
  resolveIds: () => Promise<string[]> | string[];
  progress: (done: number, total: number) => string;
  done: (n: number) => string;
}) {
  const router = useRouter();
  const [state, setState] = useState<{ running: boolean; done: number; total: number; error?: string }>({ running: false, done: 0, total: 0 });

  async function run() {
    setState({ running: true, done: 0, total: 0 });
    try {
      const ids = await resolveIds();
      setState({ running: true, done: 0, total: ids.length });
      await reprocessThrottled(ids, (d, total) => setState({ running: true, done: d, total }));
      setState({ running: false, done: ids.length, total: ids.length });
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
        className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", state.running && "animate-spin")} /> {label}
      </button>
      {state.running && <span className="text-[12px] text-ink-3">{progress(state.done, state.total)}</span>}
      {!state.running && state.done > 0 && <span className="text-[12px] text-ink-3">{done(state.done)}</span>}
      {state.error && <span className="text-[12px] text-danger">{state.error}</span>}
    </div>
  );
}
