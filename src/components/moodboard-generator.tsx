"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useT } from "./lang-provider";

export function MoodboardGenerator() {
  const router = useRouter();
  const d = useT();
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
      className="mx-auto max-w-3xl rounded-[22px] bg-paper-2 p-2 focus-within:ring-2 focus-within:ring-accent/40"
    >
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={2}
        placeholder={d.moodboards.placeholder}
        aria-label={d.moodboards.placeholder}
        className="w-full resize-none bg-transparent px-4 py-3 text-lg outline-none placeholder:text-ink-3"
      />
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[12px] text-ink-3">{error ?? d.moodboards.hint}</span>
        <button type="submit" disabled={busy || !brief.trim()} className="btn-filled h-11 px-5 text-[15px] lg:h-10 lg:text-sm">
          {busy ? d.moodboards.working : d.moodboards.submit}
        </button>
      </div>
    </form>
  );
}
