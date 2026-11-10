"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { captureFiles, captureText, CAPTURE_ACCEPT } from "@/lib/capture";
import { cn } from "@/lib/utils";
import { BrainThink } from "./brain-think";
import { useT } from "./lang-provider";

export type Toast = { kind: "ok" | "err" | "dup"; text: string };

/**
 * The single point of capture. Paste a link, drop a file, or write an idea. Enter. Done.
 * The system starts understanding in the background; the card appears in Inbox.
 * With `onDone`, the result goes to the caller (the Add sheet closes and toasts it) instead of a
 * toast under the field.
 */
export function CaptureBox({
  collectionId,
  compact,
  onDone,
  inputRef,
  autoFocus,
  noUpload,
}: {
  collectionId?: string;
  compact?: boolean;
  onDone?: (toast: Toast) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  autoFocus?: boolean;
  /** Where something else already offers upload (the Add sheet's tile), skip the link in the field. */
  noUpload?: boolean;
}) {
  const router = useRouter();
  const d = useT();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [local, setLocal] = useState<Toast | null>(null);
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? ownRef;
  const fileRef = useRef<HTMLInputElement>(null);
  const setToast = (toast: Toast) => (onDone ? onDone(toast) : setLocal(toast));
  const toast = local;

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, ref]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setLocal(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function submitText() {
    const input = value.trim();
    if (!input || busy) return;
    setBusy(true);
    try {
      const res = await captureText(input, collectionId);
      setValue("");
      setToast(res.duplicate ? { kind: "dup", text: d.capture.duplicate } : { kind: "ok", text: d.capture.captured });
      router.refresh();
    } catch (err) {
      setToast({ kind: "err", text: err instanceof Error ? err.message : d.capture.failed });
    } finally {
      setBusy(false);
    }
  }

  async function submitFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length || busy) return;
    setBusy(true);
    const { ok, errors } = await captureFiles(list, collectionId);
    // Some files failing is not a success: say how many did not make it, and why for the first.
    if (ok && errors.length) setToast({ kind: "err", text: d.capture.filesPartial(ok, errors.length, errors[0]) });
    else if (ok) setToast({ kind: "ok", text: d.capture.filesCaptured(ok) });
    else if (errors.length) setToast({ kind: "err", text: errors[0] });
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
      {/* A filled text field, not an outlined box; dropping a file tints it with the accent. */}
      <div className={cn("rounded-[22px] bg-paper-2 transition-[background-color,box-shadow] focus-within:ring-2 focus-within:ring-accent-ink/40", drag && "bg-accent/10 ring-2 ring-accent-ink")}>
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
          placeholder={d.capture.placeholder}
          aria-label={d.capture.placeholder}
          className={cn("w-full resize-none bg-transparent px-5 outline-none placeholder:text-ink-3", compact ? "py-3 text-[15px]" : "py-4 text-[17px] leading-[22px]")}
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-1 text-[13px] text-ink-3">
            {!noUpload && (
              <button type="button" onClick={() => fileRef.current?.click()} className="-ml-1 min-h-11 rounded-full px-3 font-medium text-accent-ink hover:bg-fill lg:min-h-8">
                {d.capture.upload}
              </button>
            )}
            <input ref={fileRef} type="file" multiple accept={CAPTURE_ACCEPT} className="hidden" onChange={(e) => e.target.files && void submitFiles(e.target.files)} />
          </div>
          <button
            type="button"
            onClick={() => void submitText()}
            disabled={busy || !value.trim()}
            className="btn-filled h-11 px-4 text-[15px] lg:h-9"
          >
            {busy ? "…" : d.capture.enter}
          </button>
        </div>
      </div>
      {toast && (
        <div
          className={cn(
            "absolute left-1/2 top-full mt-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] shadow",
            toast.kind === "ok" && "bg-ink text-paper",
            toast.kind === "dup" && "bg-paper-2 text-ink",
            toast.kind === "err" && "bg-danger text-white",
          )}
        >
          {/* Understanding just started in the background; this is the only feedback someone gets
              on mobile without scrolling down to the card, so the brain thinks right here too. */}
          {toast.kind === "ok" && <BrainThink className="text-base" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
