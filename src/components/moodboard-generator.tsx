"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function MoodboardGenerator() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!brief.trim() || busy) return;
        setBusy(true);
        setError(null);
        try {
          const res = await api<{ board: { id: string } }>("/api/moodboards", { method: "POST", body: JSON.stringify({ brief }) });
          router.push(`/moodboards/${res.board.id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "failed");
          setBusy(false);
        }
      }}
      className="mx-auto max-w-3xl rounded-3xl border border-line bg-paper p-2 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
    >
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={2}
        placeholder="Monte um moodboard para uma campanha de moda futurista…"
        className="w-full resize-none bg-transparent px-4 py-3 text-lg outline-none placeholder:text-ink-3"
      />
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[12px] text-ink-3">{error ?? "Built only from your own references."}</span>
        <button type="submit" disabled={busy || !brief.trim()} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper disabled:opacity-30">
          {busy ? "Assembling…" : "Generate"}
        </button>
      </div>
    </form>
  );
}
