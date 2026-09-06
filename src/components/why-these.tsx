"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Why = { headline: string; mechanisms: { name: string; explanation: string; referenceIds: string[] }[]; direction: string };

/** Turns a result set into creative direction: shared mechanisms, and why. */
export function WhyThese({ query, ids, titles }: { query: string; ids: string[]; titles: Record<string, string> }) {
  const [why, setWhy] = useState<Why | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!ids.length) return;
    let cancelled = false;
    setWhy(null);
    api<Why>("/api/search/explain", { method: "POST", body: JSON.stringify({ query, ids }) })
      .then((w) => !cancelled && setWhy(w))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "failed"));
    return () => {
      cancelled = true;
    };
  }, [query, ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ids.length) return null;
  return (
    <section className="rounded-3xl border border-line p-6">
      <h2 className="eyebrow mb-3">Why these references?</h2>
      {error && <p className="text-sm text-ink-3">Could not explain: {error}</p>}
      {!why && !error && <p className="pulse-soft text-sm text-ink-3">Reading the set…</p>}
      {why && (
        <div className="space-y-5">
          <p className="text-lg font-medium tracking-tight">{why.headline}</p>
          <ol className="grid gap-4 md:grid-cols-3">
            {why.mechanisms.map((m, i) => (
              <li key={m.name}>
                <p className="font-mono text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</p>
                <p className="font-semibold">{m.name}</p>
                <p className="mt-1 text-sm text-ink-2">{m.explanation}</p>
                <p className="mt-2 text-[12px] text-ink-3">
                  {m.referenceIds
                    .filter((id) => titles[id])
                    .slice(0, 4)
                    .map((id, j) => (
                      <span key={id}>
                        {j > 0 && " · "}
                        <Link href={`/r/${id}`} className="hover:text-ink">
                          {titles[id]}
                        </Link>
                      </span>
                    ))}
                </p>
              </li>
            ))}
          </ol>
          <p className="border-t border-line pt-4 text-sm text-ink-2">
            <span className="eyebrow mr-2">Direction</span>
            {why.direction}
          </p>
        </div>
      )}
    </section>
  );
}
