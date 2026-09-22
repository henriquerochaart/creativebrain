"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Whether the mobile off-canvas sidebar is open. The header's HB button and the drawer live in
 * different branches of the layout, so a small context is the plainest way to connect them.
 * Desktop ignores this entirely — the sidebar is always visible there, in normal flow.
 */
type SidebarState = { open: boolean; toggle: () => void; close: () => void };

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SidebarContext.Provider value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarState {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
