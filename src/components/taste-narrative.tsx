"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";

type Narrative = { headline: string; observations: string[]; blindSpots: string[]; provocation: string };

export function TasteNarrative() {
  const [busy, setBusy] = useState(false);
  const [n, setN] = useState<Narrative | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="rounded-3xl border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">Read by the Brain</h2>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              setN(await api<Narrative>("/api/patterns/narrative", { method: "POST" }));
            } catch (err) {
              setError(err instanceof Error ? err.message : "failed");
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3 text-[13px] hover:bg-paper-2 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" /> {busy ? "Reading…" : n ? "Read again" : "What do I seem to like?"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {n && (
        <div className="mt-5 space-y-5">
          <p className="text-xl font-medium tracking-tight">{n.headline}</p>
          <ul className="space-y-2 text-[15px]">{n.observations.map((o) => <li key={o}>→ {o}</li>)}</ul>
          {n.blindSpots.length > 0 && (
            <div>
              <p className="eyebrow mb-1">Blind spots</p>
              <ul className="space-y-1 text-[15px] text-ink-2">{n.blindSpots.map((b) => <li key={b}>→ {b}</li>)}</ul>
            </div>
          )}
          <p className="border-t border-line pt-4 text-[15px] italic text-ink-2">{n.provocation}</p>
        </div>
      )}
    </section>
  );
}
