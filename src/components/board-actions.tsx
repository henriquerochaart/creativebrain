"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function DeleteBoard({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      onBlur={() => setConfirm(false)}
      onClick={async () => {
        if (!confirm) return setConfirm(true);
        await api(`/api/moodboards/${id}`, { method: "DELETE" });
        router.push("/moodboards");
        router.refresh();
      }}
      className={confirm ? "text-[13px] text-red-600" : "text-[13px] text-ink-3 hover:text-ink"}
    >
      {confirm ? "Confirm delete" : "Delete board"}
    </button>
  );
}
