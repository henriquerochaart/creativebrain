"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useT } from "./lang-provider";
import { usePopover } from "./use-popover";

type P = { id: string; name: string };

export function ProjectPicker({ referenceId, projects, member }: { referenceId: string; projects: P[]; member: P[] }) {
  const router = useRouter();
  const d = useT();
  const { open, wrapper, trigger, toggle: toggleMenu } = usePopover();
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
    <div ref={wrapper} className="relative">
      <button ref={trigger} type="button" onClick={toggleMenu} aria-expanded={open} aria-haspopup="true" className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]">
        <FolderPlus className="h-3.5 w-3.5" /> {member.length ? d.reference.projects(member.length) : d.reference.addToProject}
      </button>
      {open && (
        <div className="material fixed inset-x-4 bottom-28 z-50 rounded-[20px] p-2 shadow-[0_10px_40px_rgba(0,0,0,0.22)] ring-1 ring-black/5 lg:absolute lg:inset-x-auto lg:bottom-auto lg:left-0 lg:mt-2 lg:w-64 lg:rounded-[14px] lg:p-1.5 dark:ring-white/10">
          <ul className="max-h-64 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => void toggle(p)} className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[15px] hover:bg-paper-2 focus-visible:bg-paper-2 lg:min-h-0 lg:text-[13px]">
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
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={d.reference.newProject} aria-label={d.reference.newProject} className="h-11 w-full rounded-lg bg-paper-2 px-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent-ink/40 lg:h-8 lg:text-[13px]" />
            <button type="submit" className="btn-filled h-11 shrink-0 px-3 text-[15px] lg:h-8 lg:text-[12px]">
              {d.reference.add}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
