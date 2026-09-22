"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";
import { useT } from "./lang-provider";

/**
 * Wraps the server-rendered Sidebar. Below lg it is an off-canvas drawer opened from the header's
 * HB button — closes on navigation, Escape, or tapping the backdrop. At lg and up it is the plain
 * sticky sidebar this always was, in normal flow; the mobile-only classes below simply don't apply.
 */
export function SidebarDrawer({ children }: { children: React.ReactNode }) {
  const { open, close } = useSidebar();
  const pathname = usePathname();
  const d = useT();

  // Picking a nav item is a full navigation; the drawer would otherwise still read "open" for it.
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <div
        role="presentation"
        onClick={close}
        className={cn("fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 -translate-x-full overflow-y-auto bg-paper shadow-2xl transition-transform duration-200 ease-out",
          "lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] lg:w-56 lg:shrink-0 lg:translate-x-0 lg:border-r lg:border-line lg:bg-transparent lg:shadow-none lg:transition-none",
          open && "translate-x-0",
        )}
      >
        <button type="button" onClick={close} aria-label={d.header.close} className="absolute right-3 top-3 rounded-full p-1.5 text-ink-2 hover:bg-paper-2 lg:hidden">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </>
  );
}
