"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Open/close state for a small menu anchored to a button: Escape closes it and hands focus back to
 * the button, and a press anywhere outside the wrapper closes it, as menus do on every platform.
 */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return { open, setOpen, wrapper, trigger, toggle: () => setOpen((o) => !o) };
}
