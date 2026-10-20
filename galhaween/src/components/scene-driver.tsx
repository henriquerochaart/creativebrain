"use client";

import { useEffect } from "react";

/**
 * Turns scenes on for wide screens without Reduce Motion (html[data-scenes="on"]) and keeps each
 * scene's --p in step with the scroll: 0 when it pins, 1 when it lets go, and negative while it is
 * still sliding up into view, so a scene's opening lines can surface before it pins instead of
 * arriving as an empty screen. One rAF per frame at most.
 */
export function SceneDriver() {
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scenes: HTMLElement[] = [];
    let frame = 0;

    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      for (const scene of scenes) {
        const box = scene.getBoundingClientRect();
        const travel = box.height - viewport;
        const p = travel > 0 ? Math.min(1, Math.max(-1, -box.top / travel)) : box.top < 0 ? 1 : 0;
        scene.style.setProperty("--p", p.toFixed(4));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const apply = () => {
      const on = wide.matches && !reduced.matches;
      document.documentElement.dataset.scenes = on ? "on" : "off";
      scenes = on ? Array.from(document.querySelectorAll<HTMLElement>("[data-scene]")) : [];
      if (on) update();
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    wide.addEventListener("change", apply);
    reduced.addEventListener("change", apply);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      wide.removeEventListener("change", apply);
      reduced.removeEventListener("change", apply);
      delete document.documentElement.dataset.scenes;
    };
  }, []);
  return null;
}
