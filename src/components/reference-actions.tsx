"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, RefreshCw, Trash2, Plus, Check } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "./lang-provider";
import { usePopover } from "./use-popover";
import { Emoji } from "./emoji";

/** A failed action, said next to the button that tried it. */
function Failure({ text }: { text: string }) {
  return (
    <span role="alert" className="self-center text-[13px] text-danger">
      {text}
    </span>
  );
}

export function SaveToggle({ id, saved }: { id: string; saved: boolean }) {
  const router = useRouter();
  const d = useT();
  const [on, setOn] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        onClick={async () => {
          const next = !on;
          setOn(next);
          setError(null);
          try {
            await api(`/api/references/${id}`, { method: "PATCH", body: JSON.stringify({ saved: next }) });
            router.refresh();
          } catch (err) {
            setOn(!next); // the star goes back: it was not saved
            setError(err instanceof Error ? err.message : String(err));
          }
        }}
        className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]"
      >
        <Star className={cn("h-3.5 w-3.5", on && "fill-warning text-warning")} /> {on ? d.reference.saved : d.reference.save}
      </button>
      {error && <Failure text={error} />}
    </>
  );
}

export function ReprocessButton({ id }: { id: string }) {
  const router = useRouter();
  const d = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            // Caught here: an error thrown inside a transition would replace the whole screen.
            try {
              await api(`/api/references/${id}/reprocess`, { method: "POST" });
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          })
        }
        className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} /> {d.reference.reUnderstand}
      </button>
      {error && <Failure text={error} />}
    </>
  );
}

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const d = useT();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (!confirm) return setConfirm(true);
          setError(null);
          try {
            await api(`/api/references/${id}`, { method: "DELETE" });
            router.push("/");
            router.refresh();
          } catch (err) {
            setConfirm(false);
            setError(err instanceof Error ? err.message : String(err));
          }
        }}
        onBlur={() => setConfirm(false)}
        // Destructive: systemRed label from the start; the confirm step fills it so the second tap is unmistakable.
        className={cn(confirm ? "btn-filled bg-danger! text-white!" : "btn-gray text-danger!", "h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]")}
      >
        <Trash2 className="h-3.5 w-3.5" /> {confirm ? d.reference.confirmDelete : d.reference.delete}
      </button>
      {error && <Failure text={error} />}
    </>
  );
}

type Col = { id: string; name: string; emoji: string | null; slug: string };

export function CollectionPicker({ referenceId, all, member }: { referenceId: string; all: Col[]; member: Col[] }) {
  const router = useRouter();
  const d = useT();
  const { open, wrapper, trigger, toggle: toggleMenu } = usePopover();
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
    <div ref={wrapper} className="relative">
      <button ref={trigger} type="button" onClick={toggleMenu} aria-expanded={open} aria-haspopup="true" className="btn-gray h-11 px-3.5 text-[15px] lg:h-9 lg:text-[13px]">
        <Plus className="h-3.5 w-3.5" /> {member.length ? d.reference.collections(member.length) : d.reference.addToCollection}
      </button>
      {open && (
        <div className="material fixed inset-x-4 bottom-28 z-50 rounded-[20px] p-2 shadow-[0_10px_40px_rgba(0,0,0,0.22)] ring-1 ring-black/5 lg:absolute lg:inset-x-auto lg:bottom-auto lg:left-0 lg:mt-2 lg:w-64 lg:rounded-[14px] lg:p-1.5 dark:ring-white/10">
          <ul className="max-h-64 overflow-y-auto">
            {all.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => void toggle(c)} className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[15px] hover:bg-paper-2 focus-visible:bg-paper-2 lg:min-h-0 lg:text-[13px]">
                  <span className="truncate">
                    {c.emoji ? <Emoji char={c.emoji} className="mr-1.5" /> : null}
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
            <input value={creating} onChange={(e) => setCreating(e.target.value)} placeholder={d.reference.newCollection} aria-label={d.reference.newCollection} className="h-11 w-full rounded-lg bg-paper-2 px-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent-ink/40 lg:h-8 lg:text-[13px]" />
            <button type="submit" className="btn-filled h-11 shrink-0 px-3 text-[15px] lg:h-8 lg:text-[12px]">
              {d.reference.add}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
