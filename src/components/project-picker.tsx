"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Check } from "lucide-react";
import { api } from "@/lib/api";

type P = { id: string; name: string };

export function ProjectPicker({ referenceId, projects, member }: { referenceId: string; projects: P[]; member: P[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const memberIds = new Set(member.map((m) => m.id));
  async function toggle(p: P) {
    if (memberIds.has(p.id)) await api(`/api/projects/${p.id}/references?referenceId=${referenceId}`, { method: "DELETE" });
    else await api(`/api/projects/${p.id}/references`, { method: "POST", body: JSON.stringify({ referenceId }) });
    router.refresh();
  }
  async function create() {
    if (!name.trim()) return;
    const res = await api<{ project: P }>("/api/projects", { method: "POST", body: JSON.stringify({ name }) });
    await api(`/api/projects/${res.project.id}/references`, { method: "POST", body: JSON.stringify({ referenceId }) });
    setName("");
    router.refresh();
  }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:bg-paper-2">
        <FolderPlus className="h-3.5 w-3.5" /> {member.length ? `${member.length} project${member.length > 1 ? "s" : ""}` : "Add to project"}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-line bg-paper p-2 shadow-lg">
          <ul className="max-h-64 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => void toggle(p)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-paper-2">
                  <span className="truncate">{p.name}</span>
                  {memberIds.has(p.id) && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
            {!projects.length && <li className="px-2 py-1.5 text-[13px] text-ink-3">No open projects.</li>}
          </ul>
          <form
            className="mt-1 flex gap-1 border-t border-line pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project…" className="h-8 w-full rounded-lg bg-paper-2 px-2 text-[13px] outline-none" />
            <button type="submit" className="h-8 rounded-lg bg-ink px-2 text-[12px] text-paper">
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
