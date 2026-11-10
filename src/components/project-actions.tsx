"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Sparkles, Copy } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { withBase } from "@/lib/base-path";
import { Thumb } from "./thumb";
import { useLang, useT } from "./lang-provider";
import type { PublicReference } from "@/server/references";

export function NewProject() {
  const router = useRouter();
  const d = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        try {
          const res = await api<{ project: { id: string } }>("/api/projects", { method: "POST", body: JSON.stringify({ name }) });
          router.push(`/projects/${res.project.id}`);
        } catch {
          setBusy(false);
        }
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={d.projects.namePlaceholder} aria-label={d.projects.namePlaceholder} className="h-11 w-56 rounded-[10px] bg-fill px-3.5 text-[15px] outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent-ink/40 lg:h-10 lg:text-sm" />
      <button type="submit" disabled={busy} className="btn-filled h-11 px-4 text-[15px] lg:h-10 lg:text-sm">
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
    // A project keeps a name: an emptied title goes back to the last one.
    const nextName = n.trim() || name;
    if (nextName !== n) setN(nextName);
    if (nextName === name && (b || null) === (brief ?? null)) return;
    await api(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name: nextName, brief: b || null }) });
    router.refresh();
  }
  return (
    <div className="space-y-2">
      <input value={n} onChange={(e) => setN(e.target.value)} onBlur={() => void save()} aria-label={d.projects.namePlaceholder} className="large-title w-full rounded-[10px] bg-transparent outline-none focus-visible:bg-fill" />
      <textarea value={b} onChange={(e) => setB(e.target.value)} onBlur={() => void save()} rows={2} placeholder={d.projects.briefPlaceholder} aria-label={d.projects.briefPlaceholder} className="w-full resize-none rounded-[10px] bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-3 focus-visible:bg-fill" />
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
    <section className="rounded-[20px] bg-paper-2 p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="flex items-center gap-2 rounded-[10px] bg-fill px-3.5 focus-within:ring-2 focus-within:ring-accent-ink/40"
      >
        <Search className="h-4 w-4 text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.projects.searchPlaceholder} aria-label={d.projects.searchPlaceholder} className="h-11 w-full rounded-[10px] bg-transparent text-sm outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-accent-ink/40 lg:h-10" />
        <button type="submit" disabled={busy} className="text-[13px] text-ink-2">
          {busy ? "…" : d.projects.search}
        </button>
      </form>
      {hits.length > 0 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {hits.map((r) => (
            <div key={r.id} className="w-36 shrink-0">
              <div className="overflow-hidden rounded-[14px] bg-paper-2">
                <Thumb reference={r} lang={lang} className="aspect-[4/3] object-cover" />
              </div>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug">{r.title}</p>
              <button type="button" disabled={members.has(r.id)} onClick={() => void add(r.id)} className="mt-1 text-[12px] text-accent-ink disabled:text-ink-3">
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
      // Visible on touch screens and to the keyboard; only a pointer can hover to find it.
      className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-paper/90 text-ink-2 backdrop-blur transition-opacity hover:text-ink focus-visible:opacity-100 lg:h-7 lg:w-7 lg:opacity-0 lg:group-hover:opacity-100"
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
      {error && <span role="alert" className="text-[13px] text-danger">{error}</span>}
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
            setError(`${d.projects.analysisFailed} ${errorText(err)}`);
          } finally {
            setBusy(false);
          }
        }}
        className="btn-filled h-11 gap-2 px-4 text-[15px] lg:h-10 lg:text-sm"
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
        try {
          const res = await fetch(withBase(`/api/projects/${id}/output`), { headers: { "x-brain-ui": "1" } });
          if (!res.ok) throw new Error(String(res.status));
          await navigator.clipboard.writeText(await res.text());
          setState("done");
        } catch {
          setState("blocked");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
      className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]"
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
      className={confirm ? "text-[13px] text-danger" : "text-[13px] text-ink-3 hover:text-ink"}
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
