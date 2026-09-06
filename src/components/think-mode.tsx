"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Thumb } from "./thumb";
import type { PublicReference } from "@/server/references";

type Think = {
  intro: string;
  clusters: { title: string; rationale: string; referenceIds: string[] }[];
  strongest: string[];
  patterns: string[];
  gaps: string[];
  nextQuestions: string[];
};
type Res = { query: string; found: number; degraded?: string; analysis: Think; references: Record<string, PublicReference> };
type Turn = { role: "user" | "assistant"; content: string };

export function ThinkMode() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);

  async function think(query: string) {
    if (!query.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<Res>("/api/think", { method: "POST", body: JSON.stringify({ query, history }) });
      setRes(r);
      setHistory((h) => [...h, { role: "user", content: query }, { role: "assistant", content: `${r.analysis.intro} ${r.analysis.clusters.map((c) => c.title).join("; ")}. Patterns: ${r.analysis.patterns.join("; ")}` }]);
      setQ("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const refOf = (id: string) => res?.references[id];

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void think(q);
        }}
        className="rounded-3xl border border-line bg-paper p-2 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
      >
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void think(q))}
          rows={2}
          placeholder="referências para uma campanha de lançamento de IA que pareça culturalmente relevante…"
          className="w-full resize-none bg-transparent px-4 py-3 text-lg outline-none placeholder:text-ink-3"
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[12px] text-ink-3">{history.length ? `${history.length / 2} turn${history.length > 2 ? "s" : ""} in this conversation` : "Retrieves your repertoire, clusters it, names the patterns."}</span>
          <button type="submit" disabled={busy || !q.trim()} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper disabled:opacity-30">
            {busy ? "Thinking…" : "Think"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {busy && !res && <p className="pulse-soft text-center text-sm text-ink-3">Reading the repertoire…</p>}

      {res && (
        <div className={busy ? "opacity-50 transition-opacity" : "transition-opacity"}>
          <p className="text-2xl font-medium tracking-tight">{res.analysis.intro}</p>
          {res.degraded && <p className="mt-1 text-[12px] text-ink-3">{res.degraded}</p>}

          <ol className="mt-6 space-y-6">
            {res.analysis.clusters.map((c, i) => (
              <li key={c.title} className="grid gap-4 md:grid-cols-[48px_1fr]">
                <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-1 text-sm text-ink-2">{c.rationale}</p>
                  <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                    {c.referenceIds.map(refOf).filter(Boolean).map((r) => (
                      <Link key={r!.id} href={`/r/${r!.id}`} className="w-36 shrink-0">
                        <div className="overflow-hidden rounded-xl border border-line bg-paper-2">
                          <Thumb reference={r!} className="aspect-[4/3] object-cover" />
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-ink-2">{r!.title}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {res.analysis.strongest.length > 0 && (
            <section className="mt-10">
              <h2 className="eyebrow mb-3">Strongest references</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {res.analysis.strongest.map(refOf).filter(Boolean).map((r) => (
                  <Link key={r!.id} href={`/r/${r!.id}`} className="group">
                    <div className="overflow-hidden rounded-2xl border border-line bg-paper-2">
                      <Thumb reference={r!} className="aspect-[4/3] object-cover transition-transform group-hover:scale-[1.02]" />
                    </div>
                    <p className="mt-2 text-sm font-medium leading-snug">{r!.title}</p>
                    <p className="text-[12px] text-ink-3">{r!.ai.creativeMechanism}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="eyebrow mb-3">Patterns I found</h2>
              <ul className="space-y-2 text-[15px]">{res.analysis.patterns.map((p) => <li key={p}>→ {p}</li>)}</ul>
            </div>
            {res.analysis.gaps.length > 0 && (
              <div>
                <h2 className="eyebrow mb-3">What your repertoire lacks</h2>
                <ul className="space-y-2 text-[15px] text-ink-2">{res.analysis.gaps.map((g) => <li key={g}>→ {g}</li>)}</ul>
              </div>
            )}
          </section>

          {res.analysis.nextQuestions.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {res.analysis.nextQuestions.map((n) => (
                <button key={n} type="button" onClick={() => void think(n)} className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:bg-paper-2">
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
