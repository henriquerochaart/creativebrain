"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { CaptureBox, type Toast } from "./capture-box";
import { BrainThink } from "./brain-think";
import { useT } from "./lang-provider";
import { captureFiles, captureText, CAPTURE_ACCEPT } from "@/lib/capture";
import { cn } from "@/lib/utils";
import { Thing } from "./thing";

/**
 * "Add anything": the one place capture starts from, opened by the tab bar's +, the toolbar's
 * Add button and the library's empty + card. A bottom sheet on a phone, a centered sheet on a wide
 * screen. Results surface as a toast that outlives the sheet, so closing it never hides the answer.
 */
type AddState = { open: () => void; close: () => void; notify: (toast: Toast) => void };

const AddContext = createContext<AddState | null>(null);

export function useAdd(): AddState {
  const ctx = useContext(AddContext);
  if (!ctx) throw new Error("useAdd must be used within AddProvider");
  return ctx;
}

export function AddProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const notify = useCallback((next: Toast) => setToast(next), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <AddContext.Provider value={{ open, close, notify }}>
      {children}
      {isOpen && <AddSheet onClose={close} notify={notify} />}
      {toast && <GlobalToast toast={toast} />}
    </AddContext.Provider>
  );
}

/** `?add=1` (older links and bookmarks) opens the sheet, then drops the param so a refresh doesn't reopen it. */
export function AddFromQuery() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useAdd();
  useEffect(() => {
    if (!params.get("add")) return;
    open();
    router.replace(pathname, { scroll: false });
  }, [params, pathname, router, open]);
  return null;
}

function AddSheet({ onClose, notify }: { onClose: () => void; notify: (toast: Toast) => void }) {
  const d = useT();
  const router = useRouter();
  const pathname = usePathname();
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedOn = useRef(pathname);

  // Escape closes, the page behind stops scrolling, and on a wide screen the field takes focus.
  // Not on a phone: the keyboard would rise over the tiles before anyone chose one.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (window.matchMedia("(min-width: 1024px)").matches) ideaRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Following the "other apps" tile navigates; the sheet should not ride along to the next page.
  useEffect(() => {
    if (pathname !== openedOn.current) onClose();
  }, [pathname, onClose]);

  const finish = (toast: Toast) => {
    notify(toast);
    if (toast.kind === "err") return;
    onClose();
    router.refresh();
  };

  async function pasteClipboard() {
    setError(null);
    let text = "";
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      setError(d.add.clipboardDenied);
      return;
    }
    if (!text) {
      setError(d.add.clipboardEmpty);
      return;
    }
    setBusy(true);
    try {
      const res = await captureText(text);
      finish(res.duplicate ? { kind: "dup", text: d.capture.duplicate } : { kind: "ok", text: d.capture.captured });
    } catch (err) {
      setError(err instanceof Error ? err.message : d.capture.failed);
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: FileList) {
    setError(null);
    setBusy(true);
    const { ok, errors } = await captureFiles(files);
    setBusy(false);
    if (ok) finish({ kind: "ok", text: d.capture.filesCaptured(ok) });
    else if (errors.length) setError(errors[0]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <div className="fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="sheet-up relative max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-paper px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2.5 shadow-2xl lg:max-w-xl lg:rounded-[28px] lg:px-7 lg:pb-7 lg:pt-6">
        {/* The grabber: says "this is a sheet" on a phone. */}
        <div className="mx-auto mb-4 h-[5px] w-9 rounded-full bg-fill-2 lg:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4">
          <h2 id="add-title" className="title-2">
            {d.add.title}
          </h2>
          <button type="button" onClick={onClose} aria-label={d.header.close} className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-fill text-ink-2">
              <X className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </button>
        </div>

        <div className="mt-5">
          <CaptureBox noUpload onDone={finish} inputRef={ideaRef} />
        </div>

        <div className={cn("mt-3 grid grid-cols-3 gap-3", busy && "pointer-events-none opacity-60")}>
          <Tile icon="clipboard" title={d.add.paste} onClick={() => void pasteClipboard()} />
          <Tile icon="picture-frame" title={d.add.file} onClick={() => fileRef.current?.click()} />
          <Tile icon="smartphone" title={d.add.apps} href="/settings#instalar" />
        </div>
        {busy && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-ink-2" role="status">
            <BrainThink /> {d.capture.captured}
          </p>
        )}
        {error && <p className="mt-4 text-center text-[13px] text-danger">{error}</p>}
        <input ref={fileRef} type="file" multiple accept={CAPTURE_ACCEPT} className="hidden" onChange={(e) => e.target.files?.length && void upload(e.target.files)} />
      </div>
    </div>
  );
}

function Tile({ icon, title, onClick, href }: { icon: string; title: string; onClick?: () => void; href?: string }) {
  const body = (
    <>
      <Thing name={icon} className="h-12 w-12" />
      <span className="mt-2 block text-[14px] font-semibold leading-[18px] text-ink">{title}</span>
    </>
  );
  const className = "flex min-h-[112px] flex-col items-center justify-center rounded-[22px] bg-paper-2 p-3 text-center transition-[transform,background-color] duration-150 hover:bg-fill active:scale-[0.97]";
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

function GlobalToast({ toast }: { toast: Toast }) {
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4 lg:bottom-8">
      <div
        className={cn(
          "fade-in flex max-w-md items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-medium shadow-lg",
          toast.kind === "ok" && "bg-ink text-paper",
          toast.kind === "dup" && "material text-ink",
          toast.kind === "err" && "bg-danger text-white",
        )}
      >
        {toast.kind === "ok" && <BrainThink className="text-base" />}
        {toast.text}
      </div>
    </div>
  );
}
