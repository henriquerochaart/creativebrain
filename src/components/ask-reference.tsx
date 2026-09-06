"use client";

import { useState } from "react";
import { apiStream } from "@/lib/api";
import { Textarea } from "./ui/input";

const SUGGESTIONS = ["Why does this work?", "How could I adapt this mechanism to another category?", "Which brands could do something like this?", "Create 5 ideas using this mechanism."];

type Turn = { role: "user" | "assistant"; content: string };

export function AskReference({ id }: { id: string }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ("");
    const history = turns;
    setTurns([...history, { role: "user", content: question }, { role: "assistant", content: "" }]);
    try {
      await apiStream(`/api/references/${id}/ask`, { question, history }, (full) => {
        setTurns([...history, { role: "user", content: question }, { role: "assistant", content: full }]);
      });
    } catch (err) {
      setTurns([...history, { role: "user", content: question }, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "failed"}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line p-6">
      <h2 className="eyebrow mb-4">Ask this reference</h2>
      {turns.length > 0 && (
        <div className="mb-5 space-y-4">
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "text-sm font-medium" : "prose-brain whitespace-pre-wrap text-sm text-ink-2"}>
              {t.role === "user" ? `› ${t.content}` : t.content || <span className="pulse-soft">Thinking…</span>}
            </div>
          ))}
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => void ask(s)} disabled={busy} className="rounded-full border border-line px-3 py-1 text-[12px] text-ink-2 hover:bg-paper-2 disabled:opacity-40">
            {s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
        className="flex gap-2"
      >
        <Textarea rows={1} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about this reference…" onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void ask(q))} />
        <button type="submit" disabled={busy || !q.trim()} className="h-11 shrink-0 rounded-full bg-ink px-4 text-sm text-paper disabled:opacity-30">
          Ask
        </button>
      </form>
    </section>
  );
}
