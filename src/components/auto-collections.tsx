"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Thumb } from "./thumb";
import type { PublicReference } from "@/server/references";

type Proposal = { name: string; emoji: string; rationale: string; referenceIds: string[]; existing: boolean };
type Res = { proposals: Proposal[]; sample: number; references: Record<string, PublicReference> };

/** The Brain notices patterns and proposes collections; you accept the ones that ring true. */
export function AutoCollections() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  async function propose() {
    setBusy(true);
    setError(null);
    try {
      setRes(await api<Res>("/api/collections/propose", { method: "POST" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }
  async function accept(p: Proposal) {
    await api("/api/collections/accept", { method: "POST", body: JSON.stringify(p) });
    setAccepted(new Set([...accepted, p.name]));
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="eyebrow">Auto collections</h2>
          <p className="mt-1 text-sm text-ink-2">Let the Brain read the whole repertoire and propose shelves you have not named yet.</p>
        </div>
        <button type="button" onClick={() => void propose()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-paper-2 disabled:opacity-50">
          <Sparkles className="h-4 w-4" /> {busy ? "Reading…" : res ? "Propose again" : "Propose collections"}
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {res && (
        <ul className="mt-6 grid gap-5 md:grid-cols-2">
          {res.proposals.map((p) => (
            <li key={p.name} className="rounded-2xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium tracking-tight">
                    {p.emoji} {p.name}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-2">{p.rationale}</p>
                </div>
                {accepted.has(p.name) ? (
                  <Link href="/collections" className="shrink-0 text-[13px] text-emerald-600">
                    Created ✓
                  </Link>
                ) : (
                  <button type="button" onClick={() => void accept(p)} disabled={p.existing} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[12px] text-paper disabled:opacity-40">
                    {p.existing ? "Exists" : `Create · ${p.referenceIds.length}`}
                  </button>
                )}
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {p.referenceIds.slice(0, 8).map((id) => res.references[id]).filter(Boolean).map((r) => (
                  <Link key={r.id} href={`/r/${r.id}`} className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-paper-2" title={r.title ?? ""}>
                    <Thumb reference={r} className="h-full w-full object-cover" />
                  </Link>
                ))}
              </div>
            </li>
          ))}
          {!res.proposals.length && <li className="text-sm text-ink-3">Nothing to propose yet ({res.sample} references read).</li>}
        </ul>
      )}
    </section>
  );
}
