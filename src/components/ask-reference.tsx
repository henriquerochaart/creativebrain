"use client";

import { useState } from "react";
import { apiStream } from "@/lib/api";
import { Textarea } from "./ui/input";
import { useT } from "./lang-provider";

type Turn = { role: "user" | "assistant"; content: string };

export function AskReference({ id }: { id: string }) {
  const d = useT();
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
      setTurns([...history, { role: "user", content: question }, { role: "assistant", content: `${err instanceof Error ? err.message : "failed"}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line p-6">
      <h2 className="eyebrow mb-4">{d.reference.ask.title}</h2>
      {turns.length > 0 && (
        <div className="mb-5 space-y-4">
          {turns.map((turn, i) => (
            <div key={i} className={turn.role === "user" ? "text-sm font-medium" : "prose-brain whitespace-pre-wrap text-sm text-ink-2"}>
              {turn.role === "user" ? `› ${turn.content}` : turn.content || <span className="pulse-soft">{d.reference.ask.thinking}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        {d.reference.ask.suggestions.map((s) => (
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
        <Textarea rows={1} value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.reference.ask.placeholder} aria-label={d.reference.ask.placeholder} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void ask(q))} />
        <button type="submit" disabled={busy || !q.trim()} className="h-11 shrink-0 rounded-full bg-ink px-4 text-sm text-paper disabled:opacity-30">
          {d.reference.ask.send}
        </button>
      </form>
    </section>
  );
}
