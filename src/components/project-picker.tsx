"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useT } from "./lang-provider";

type P = { id: string; name: string };

export function ProjectPicker({ referenceId, projects, member }: { referenceId: string; projects: P[]; member: P[] }) {
  const router = useRouter();
  const d = useT();
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
      <button type="button" onClick={() => setOpen(!open)} className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]">
        <FolderPlus className="h-3.5 w-3.5" /> {member.length ? d.reference.projects(member.length) : d.reference.addToProject}
      </button>
      {open && (
        <div className="material absolute right-0 z-20 mt-2 w-64 rounded-[14px] p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/5 dark:ring-white/10">
          <ul className="max-h-64 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => void toggle(p)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-paper-2">
                  <span className="truncate">{p.name}</span>
                  {memberIds.has(p.id) && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
            {!projects.length && <li className="px-2 py-1.5 text-[13px] text-ink-3">{d.reference.noOpenProjects}</li>}
          </ul>
          <form
            className="mt-1 flex gap-1 border-t border-line pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={d.reference.newProject} className="h-8 w-full rounded-lg bg-paper-2 px-2 text-[13px] outline-none" />
            <button type="submit" className="btn-filled h-8 px-3 text-[12px]">
              {d.reference.add}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
