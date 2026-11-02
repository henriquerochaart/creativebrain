"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Mascot } from "./mascot";
import { BrainThink } from "./brain-think";

/** Content offset at which letting go refreshes, and where it rests while it does. */
const THRESHOLD = 64;
const HOLD = 56;
/** Apple's rubber band: the further you pull, the less it follows (c = 0.55 over a 400 px span). */
export function rubberBand(distance: number, span = 400, c = 0.55): number {
  if (distance <= 0) return 0;
  return (1 - 1 / ((distance * c) / span + 1)) * span;
}

/**
 * Pull to refresh, the iOS way: at the top of a page, dragging down stretches the content on a
 * rubber band with Brain appearing above it; past the threshold, letting go refreshes the page
 * (router.refresh, so only the server data reloads, not the app) while Brain thinks, then the
 * content springs back. Touch only. Native overscroll is off on touch screens (globals.css) so the
 * browser's own bounce and pull-to-refresh do not fight this one. Ignores horizontal swipes and
 * anything inside `[data-no-pull]` (sheets, carousels that scroll on their own).
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, start] = useTransition();
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const startedAt = useRef(0);

  useEffect(() => {
    let y0: number | null = null;
    let x0 = 0;
    let axis: "x" | "y" | null = null;
    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };
    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1 || window.scrollY > 0) return;
      if ((e.target as Element | null)?.closest?.("[data-no-pull], [role=dialog]")) return;
      y0 = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      axis = null;
    };
    const onMove = (e: TouchEvent) => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0;
      const dx = e.touches[0].clientX - x0;
      if (axis === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      }
      if (axis !== "y" || dy <= 0 || window.scrollY > 0) {
        if (pullRef.current) set(0);
        return;
      }
      e.preventDefault();
      setDragging(true);
      set(rubberBand(dy));
    };
    const onEnd = () => {
      if (y0 === null) return;
      y0 = null;
      setDragging(false);
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        startedAt.current = Date.now();
        setRefreshing(true);
        set(HOLD);
        start(() => router.refresh());
      } else set(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  // Done: let Brain be seen thinking for a beat (a refresh can finish in a few milliseconds), then
  // spring the content back. Never longer than 4 s: another refresh (LiveRefresh polling a reference
  // being understood) can supersede this one and leave its transition pending.
  useEffect(() => {
    if (!refreshing) return;
    const settle = () => {
      refreshingRef.current = false;
      setRefreshing(false);
      pullRef.current = 0;
      setPull(0);
    };
    const elapsed = Date.now() - startedAt.current;
    const t = setTimeout(settle, pending ? Math.max(0, 4000 - elapsed) : Math.max(0, 600 - elapsed));
    return () => clearTimeout(t);
  }, [refreshing, pending]);

  const progress = Math.min(1, pull / THRESHOLD);
  const spring = dragging ? "none" : "transform 560ms cubic-bezier(0.2, 1.3, 0.4, 1)";
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-visible" style={{ height: pull, transition: dragging ? "none" : "height 560ms cubic-bezier(0.2, 1.3, 0.4, 1)" }}>
        <span className={cn("mt-auto mb-2 grid h-9 w-9 place-items-center", !pull && !refreshing && "invisible")} style={{ opacity: refreshing ? 1 : progress, transform: `scale(${0.5 + progress * 0.5}) rotate(${(1 - progress) * -40}deg)` }}>
          {refreshing ? <BrainThink className="h-9 w-9" /> : <Mascot pose="pensando" className="h-9 w-9" />}
        </span>
      </div>
      <div style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: spring }}>{children}</div>
    </div>
  );
}
