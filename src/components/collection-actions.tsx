"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function NewCollection() {
  const router = useRouter();
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
      <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🔥" className="h-10 w-12 rounded-full border border-line bg-paper text-center text-sm outline-none" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Things I want to steal" className="h-10 w-56 rounded-full border border-line bg-paper px-4 text-sm outline-none placeholder:text-ink-3" />
      <button type="submit" className="h-10 rounded-full bg-ink px-4 text-sm text-paper">
        Create
      </button>
    </form>
  );
}

export function DeleteCollection({ id }: { id: string }) {
  const router = useRouter();
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
      className={confirm ? "text-[13px] text-red-600" : "text-[13px] text-ink-3 hover:text-ink"}
    >
      {confirm ? "Confirm delete collection" : "Delete collection"}
    </button>
  );
}
