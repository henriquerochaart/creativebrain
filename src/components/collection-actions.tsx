"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useT } from "./lang-provider";

export function NewCollection() {
  const router = useRouter();
  const d = useT();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        await api("/api/collections", { method: "POST", body: JSON.stringify({ name, emoji: emoji || null }) });
        setName("");
        setEmoji("");
        router.refresh();
      }}
    >
      <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🔥" aria-label="Emoji" className="h-11 w-12 rounded-[10px] bg-fill text-center text-[17px] outline-none focus:ring-2 focus:ring-accent/40 lg:h-10 lg:text-sm" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={d.collections.namePlaceholder} aria-label={d.collections.namePlaceholder} className="h-11 w-56 rounded-[10px] bg-fill px-3.5 text-[15px] outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent/40 lg:h-10 lg:text-sm" />
      <button type="submit" className="btn-filled h-11 px-4 text-[15px] lg:h-10 lg:text-sm">
        {d.collections.create}
      </button>
    </form>
  );
}

export function DeleteCollection({ id }: { id: string }) {
  const router = useRouter();
  const d = useT();
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      onBlur={() => setConfirm(false)}
      onClick={async () => {
        if (!confirm) return setConfirm(true);
        await api(`/api/collections/${id}`, { method: "DELETE" });
        router.push("/collections");
        router.refresh();
      }}
      className={confirm ? "text-[13px] text-danger" : "text-[13px] text-ink-3 hover:text-ink"}
    >
      {confirm ? d.collections.confirmDelete : d.collections.delete}
    </button>
  );
}
