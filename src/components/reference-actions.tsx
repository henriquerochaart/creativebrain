"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, RefreshCw, Trash2, Plus, Check } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "./lang-provider";

export function SaveToggle({ id, saved }: { id: string; saved: boolean }) {
  const router = useRouter();
  const d = useT();
  const [on, setOn] = useState(saved);
  return (
    <button
      type="button"
      onClick={async () => {
        setOn(!on);
        await api(`/api/references/${id}`, { method: "PATCH", body: JSON.stringify({ saved: !on }) });
        router.refresh();
      }}
      className={cn(on ? "btn-filled" : "btn-gray", "h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]")}
    >
      <Star className={cn("h-3.5 w-3.5", on && "fill-current")} /> {on ? d.reference.saved : d.reference.save}
    </button>
  );
}

export function ReprocessButton({ id }: { id: string }) {
  const router = useRouter();
  const d = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await api(`/api/references/${id}/reprocess`, { method: "POST" });
          router.refresh();
        })
      }
      className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} /> {d.reference.reUnderstand}
    </button>
  );
}

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const d = useT();
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm) return setConfirm(true);
        await api(`/api/references/${id}`, { method: "DELETE" });
        router.push("/");
        router.refresh();
      }}
      onBlur={() => setConfirm(false)}
      // Destructive: systemRed label from the start; the confirm step fills it so the second tap is unmistakable.
      className={cn(confirm ? "btn-filled bg-danger!" : "btn-gray text-danger!", "h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]")}
    >
      <Trash2 className="h-3.5 w-3.5" /> {confirm ? d.reference.confirmDelete : d.reference.delete}
    </button>
  );
}

type Col = { id: string; name: string; emoji: string | null; slug: string };

export function CollectionPicker({ referenceId, all, member }: { referenceId: string; all: Col[]; member: Col[] }) {
  const router = useRouter();
  const d = useT();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState("");
  const memberIds = new Set(member.map((m) => m.id));
  async function toggle(c: Col) {
    if (memberIds.has(c.id)) await api(`/api/collections/${c.id}/items?referenceId=${referenceId}`, { method: "DELETE" });
    else await api(`/api/collections/${c.id}/items`, { method: "POST", body: JSON.stringify({ referenceId }) });
    router.refresh();
  }
  async function create() {
    const name = creating.trim();
    if (!name) return;
    const res = await api<{ collection: Col }>("/api/collections", { method: "POST", body: JSON.stringify({ name }) });
    await api(`/api/collections/${res.collection.id}/items`, { method: "POST", body: JSON.stringify({ referenceId }) });
    setCreating("");
    router.refresh();
  }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]">
        <Plus className="h-3.5 w-3.5" /> {member.length ? d.reference.collections(member.length) : d.reference.addToCollection}
      </button>
      {open && (
        <div className="material absolute right-0 z-20 mt-2 w-64 rounded-[14px] p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/5 dark:ring-white/10">
          <ul className="max-h-64 overflow-y-auto">
            {all.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => void toggle(c)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-paper-2">
                  <span className="truncate">
                    {c.emoji ? `${c.emoji} ` : ""}
                    {c.name}
                  </span>
                  {memberIds.has(c.id) && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-1 flex gap-1 border-t border-line pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <input value={creating} onChange={(e) => setCreating(e.target.value)} placeholder={d.reference.newCollection} className="h-8 w-full rounded-lg bg-paper-2 px-2 text-[13px] outline-none" />
            <button type="submit" className="btn-filled h-8 px-3 text-[12px]">
              {d.reference.add}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
