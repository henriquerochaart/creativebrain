"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Toast = { kind: "ok" | "err" | "dup"; text: string };

/**
 * The single point of capture. Paste a link, drop a file, or write an idea. Enter. Done.
 * The system starts understanding in the background; the card appears in Inbox.
 */
export function CaptureBox({ collectionId, compact }: { collectionId?: string; compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get("add")) ref.current?.focus();
  }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function submitText() {
    const input = value.trim();
    if (!input || busy) return;
    setBusy(true);
    try {
      const res = await api<{ reference: { id: string }; duplicate: boolean }>("/api/references", { method: "POST", body: JSON.stringify({ input, collectionId }) });
      setValue("");
      setToast(res.duplicate ? { kind: "dup", text: "Already in the Brain." } : { kind: "ok", text: "Captured. Understanding…" });
      router.refresh();
    } catch (err) {
      setToast({ kind: "err", text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  async function submitFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length || busy) return;
    setBusy(true);
    let ok = 0;
    for (const file of list) {
      const form = new FormData();
      form.append("file", file);
      if (collectionId) form.append("collectionId", collectionId);
      try {
        await api("/api/upload", { method: "POST", body: form });
        ok++;
      } catch (err) {
        setToast({ kind: "err", text: `${file.name}: ${err instanceof Error ? err.message : "failed"}` });
      }
    }
    if (ok) setToast({ kind: "ok", text: `${ok} file${ok > 1 ? "s" : ""} captured. Understanding…` });
    setBusy(false);
    router.refresh();
  }

  return (
    <div
      className={cn("relative", compact ? "" : "mx-auto max-w-3xl")}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files?.length) void submitFiles(e.dataTransfer.files);
        else {
          const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
          if (text) setValue(text);
        }
      }}
    >
      <div className={cn("rounded-3xl border bg-paper transition-colors", drag ? "border-accent bg-accent/5" : "border-line", compact ? "" : "shadow-[0_2px_20px_rgba(0,0,0,0.04)]")}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files?.length) {
              e.preventDefault();
              void submitFiles(e.clipboardData.files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitText();
            }
          }}
          rows={compact ? 1 : 2}
          placeholder="Paste a link, drop a file, or write an idea…"
          className={cn("w-full resize-none bg-transparent px-6 outline-none placeholder:text-ink-3", compact ? "py-3 text-sm" : "py-5 text-lg")}
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-1 text-[12px] text-ink-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full px-3 py-1 hover:bg-paper-2 hover:text-ink">
              Upload image · video · PDF
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*,application/pdf,text/plain,text/markdown,audio/*" className="hidden" onChange={(e) => e.target.files && void submitFiles(e.target.files)} />
            <span className="hidden sm:inline">Instagram · TikTok · YouTube · Behance · any site</span>
          </div>
          <button
            type="button"
            onClick={() => void submitText()}
            disabled={busy || !value.trim()}
            className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-paper disabled:opacity-30"
          >
            {busy ? "…" : "Enter ↵"}
          </button>
        </div>
      </div>
      {toast && (
        <div
          className={cn(
            "absolute left-1/2 top-full mt-3 -translate-x-1/2 rounded-full px-4 py-1.5 text-[13px] shadow",
            toast.kind === "ok" && "bg-ink text-paper",
            toast.kind === "dup" && "bg-paper-2 text-ink",
            toast.kind === "err" && "bg-red-600 text-white",
          )}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
