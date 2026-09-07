"use client";

import { useState } from "react";
import Link from "next/link";
import { Markdown } from "./markdown";
import { Thumb } from "./thumb";
import { api } from "@/lib/api";
import { withBase } from "@/lib/base-path";
import type { PublicReference } from "@/server/references";

type Turn = { role: "user" | "assistant"; content: string };

export function AssistMode() {
  const [idea, setIdea] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState<PublicReference[]>([]);
  const [degraded, setDegraded] = useState<string | null>(null);

  async function run(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setIdea("");
    const history = turns;
    setTurns([...history, { role: "user", content: text }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(withBase("/api/assist"), { method: "POST", headers: { "content-type": "application/json", "x-brain-ui": "1" }, body: JSON.stringify({ idea: text, history }) });
      if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `${res.status}`);
      setDegraded(res.headers.get("x-degraded"));
      const ids = (res.headers.get("x-references") ?? "").split(",").filter(Boolean);
      void Promise.all(ids.slice(0, 12).map((id) => api<{ reference: PublicReference }>(`/api/references/${id}`).then((r) => r.reference).catch(() => null))).then((rs) => setUsed(rs.filter((r): r is PublicReference => Boolean(r))));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setTurns([...history, { role: "user", content: text }, { role: "assistant", content: full }]);
      }
    } catch (err) {
      setTurns([...history, { role: "user", content: text }, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "failed"}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_260px]">
      <div className="space-y-8">
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p key={i} className="text-xl font-medium tracking-tight">› {t.content}</p>
          ) : (
            <div key={i}>{t.content ? <Markdown text={t.content} /> : <p className="pulse-soft text-sm text-ink-3">Reading your repertoire…</p>}</div>
          ),
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(idea);
          }}
          className="rounded-3xl border border-line bg-paper p-2 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
        >
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void run(idea))}
            rows={3}
            placeholder={turns.length ? "Continue…" : "Use meu repertório para desenvolver esta ideia: um lançamento de app de finanças que pareça um evento cultural…"}
            className="w-full resize-none bg-transparent px-4 py-3 text-lg outline-none placeholder:text-ink-3"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[12px] text-ink-3">{degraded ?? "Develops your idea using only your own references."}</span>
            <button type="submit" disabled={busy || !idea.trim()} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper disabled:opacity-30">
              {busy ? "Working…" : "Develop"}
            </button>
          </div>
        </form>
      </div>
      <aside>
        <h2 className="eyebrow mb-3">Repertoire in play</h2>
        {used.length ? (
          <ul className="space-y-3">
            {used.map((r) => (
              <li key={r.id}>
                <Link href={`/r/${r.id}`} className="flex gap-3">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-2">
                    <Thumb reference={r} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{r.title}</p>
                    <p className="truncate text-[11px] text-ink-3">{r.ai.creativeMechanism}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-3">The references retrieved for your idea appear here.</p>
        )}
      </aside>
    </div>
  );
}
