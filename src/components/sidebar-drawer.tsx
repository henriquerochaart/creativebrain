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
          "fixed inset-y-0 left-0 z-50 w-[300px] -translate-x-full overflow-y-auto bg-paper-2 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          // Mac sidebar: a gray column beside white content, separated by a hairline.
          "lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] lg:w-60 lg:shrink-0 lg:translate-x-0 lg:border-r lg:border-line lg:bg-paper-2/60 lg:shadow-none lg:transition-none",
          // The shadow only when open: translated off-screen it still bled 25px into the left edge.
          open && "translate-x-0 shadow-2xl",
        )}
      >
        {/* The iOS close button: an xmark in a gray circle, inside a 44pt target. */}
        <button type="button" onClick={close} aria-label={d.header.close} className="absolute right-2 top-2 grid h-11 w-11 place-items-center lg:hidden">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-fill text-ink-2">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </span>
        </button>
        {children}
      </div>
    </>
  );
}
