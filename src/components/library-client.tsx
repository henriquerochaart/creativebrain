"use client";

import { Plus } from "lucide-react";
import { useAdd } from "./add-sheet";
import { useT } from "./lang-provider";
import { cn } from "@/lib/utils";

/** The dashed "+" at the end of Recently saved: another way into the Add sheet. */
export function AddCard() {
  const { open } = useAdd();
  const d = useT();
  return (
    <button
      type="button"
      onClick={open}
      aria-label={d.tabs.add}
      className="grid aspect-[3/4] w-full place-items-center rounded-[20px] border-2 border-dashed border-line text-ink-3 transition-colors hover:border-ink-3 hover:text-ink-2"
    >
      <Plus className="h-9 w-9" strokeWidth={2} />
    </button>
  );
}

export function AddButton({ className }: { className?: string }) {
  const { open } = useAdd();
  const d = useT();
  return (
    <button type="button" onClick={open} className={cn("btn-filled h-11 px-5 text-[15px]", className)}>
      <Plus className="h-4 w-4" strokeWidth={2.5} /> {d.header.add}
    </button>
  );
}
