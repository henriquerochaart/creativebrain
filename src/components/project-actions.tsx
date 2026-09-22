"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Sparkles, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { withBase } from "@/lib/base-path";
import { Thumb } from "./thumb";
import { useLang, useT } from "./lang-provider";
import type { PublicReference } from "@/server/references";

export function NewProject() {
  const router = useRouter();
  const d = useT();
  const [name, setName] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const res = await api<{ project: { id: string } }>("/api/projects", { method: "POST", body: JSON.stringify({ name }) });
        router.push(`/projects/${res.project.id}`);
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={d.projects.namePlaceholder} aria-label={d.projects.namePlaceholder} className="h-10 w-56 rounded-full border border-line bg-paper px-4 text-sm outline-none placeholder:text-ink-3" />
      <button type="submit" className="h-10 rounded-full bg-ink px-4 text-sm text-paper">
        {d.projects.newProject}
      </button>
    </form>
  );
}

export function ProjectBrief({ id, name, brief }: { id: string; name: string; brief: string | null }) {
  const router = useRouter();
  const d = useT();
  const [n, setN] = useState(name);
  const [b, setB] = useState(brief ?? "");
  async function save() {
    await api(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name: n, brief: b || null }) });
    router.refresh();
  }
  return (
    <div className="space-y-2">
      <input value={n} onChange={(e) => setN(e.target.value)} onBlur={() => void save()} aria-label={d.projects.namePlaceholder} className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none" />
      <textarea value={b} onChange={(e) => setB(e.target.value)} onBlur={() => void save()} rows={2} placeholder={d.projects.briefPlaceholder} aria-label={d.projects.briefPlaceholder} className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink-2 outline-none placeholder:text-ink-3" />
    </div>
  );
}

/** Search the Brain from inside the project and add references with one click. */
export function ProjectPickerInline({ projectId, memberIds }: { projectId: string; memberIds: string[] }) {
  const router = useRouter();
  const d = useT();
  const lang = useLang();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PublicReference[]>([]);
  const [busy, setBusy] = useState(false);
  const members = new Set(memberIds);
  async function run() {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ hits: { reference: PublicReference }[] }>(`/api/search?q=${encodeURIComponent(q)}&limit=24`);
      setHits(res.hits.map((h) => h.reference));
    } finally {
      setBusy(false);
    }
  }
  async function add(id: string) {
    await api(`/api/projects/${projectId}/references`, { method: "POST", body: JSON.stringify({ referenceId: id }) });
    members.add(id);
    router.refresh();
  }
  return (
    <section className="rounded-3xl border border-line p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="flex items-center gap-2 rounded-full border border-line px-4"
      >
        <Search className="h-4 w-4 text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.projects.searchPlaceholder} aria-label={d.projects.searchPlaceholder} className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-3" />
        <button type="submit" disabled={busy} className="text-[13px] text-ink-2">
          {busy ? "…" : d.projects.search}
        </button>
      </form>
      {hits.length > 0 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {hits.map((r) => (
            <div key={r.id} className="w-36 shrink-0">
              <div className="overflow-hidden rounded-xl border border-line bg-paper-2">
                <Thumb reference={r} lang={lang} className="aspect-[4/3] object-cover" />
              </div>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug">{r.title}</p>
              <button type="button" disabled={members.has(r.id)} onClick={() => void add(r.id)} className="mt-1 text-[12px] text-accent disabled:text-ink-3">
                {members.has(r.id) ? d.projects.inProject : d.projects.add}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function RemoveFromProject({ projectId, referenceId }: { projectId: string; referenceId: string }) {
  const router = useRouter();
  const d = useT();
  return (
    <button
      type="button"
      onClick={async () => {
        await api(`/api/projects/${projectId}/references?referenceId=${referenceId}`, { method: "DELETE" });
        router.refresh();
      }}
      className="absolute right-2 top-2 rounded-full bg-paper/90 p-1 text-ink-2 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 hover:text-ink"
      title={d.projects.remove}
      aria-label={d.projects.remove}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

export function AnalyzeProject({ id, analyzed, count }: { id: string; analyzed: boolean; count: number }) {
  const router = useRouter();
  const d = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-[13px] text-red-600">{error}</span>}
      <button
        type="button"
        disabled={busy || count === 0}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await api(`/api/projects/${id}/analyze`, { method: "POST" });
            router.refresh();
          } catch (err) {
            setError(`${d.projects.analysisFailed} ${err instanceof Error ? err.message : "failed"}`);
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-40"
      >
        <Sparkles className="h-4 w-4" /> {busy ? d.projects.analysing : analyzed ? d.projects.analyseAgain : d.projects.analyse}
      </button>
    </div>
  );
}

export function CopyOutput({ id }: { id: string }) {
  const d = useT();
  const [state, setState] = useState<"idle" | "done" | "blocked">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        const res = await fetch(withBase(`/api/projects/${id}/output`), { headers: { "x-brain-ui": "1" } });
        try {
          await navigator.clipboard.writeText(await res.text());
          setState("done");
        } catch {
          setState("blocked");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:bg-paper-2"
    >
      <Copy className="h-3.5 w-3.5" /> {state === "done" ? d.projects.copied : state === "blocked" ? d.projects.clipboardBlocked : d.projects.copyOutput}
    </button>
  );
}

export function DeleteProject({ id }: { id: string }) {
  const router = useRouter();
  const d = useT();
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      onBlur={() => setConfirm(false)}
      onClick={async () => {
        if (!confirm) return setConfirm(true);
        await api(`/api/projects/${id}`, { method: "DELETE" });
        router.push("/projects");
        router.refresh();
      }}
      className={confirm ? "text-[13px] text-red-600" : "text-[13px] text-ink-3 hover:text-ink"}
    >
      {confirm ? d.projects.confirmDelete : d.projects.delete}
    </button>
  );
}

export function ProjectsLink() {
  const d = useT();
  return (
    <Link href="/projects" className="text-sm text-ink-2 hover:text-ink">
      ← {d.projects.backToProjects}
    </Link>
  );
}
