"use client";

import { useEffect, useRef } from "react";

/**
 * The poster's animated collage, looping and muted, playing on its own.
 *
 * The <video> is written as raw HTML on purpose: React does not put `muted` in server-rendered
 * markup, and Safari only autoplays a video whose HTML already says muted and playsinline. Where
 * autoplay is still refused (iOS Low Power Mode, some in-app browsers) it starts on the first touch.
 * With Reduce Motion on it stays on its first frame.
 */
export function PosterVideo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = wrap.current?.querySelector("video");
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const play = () => {
      if (!reduced.matches && video.paused) void video.play().catch(() => undefined);
    };
    const apply = () => (reduced.matches ? video.pause() : play());
    apply();
    reduced.addEventListener("change", apply);
    window.addEventListener("pointerdown", play);
    window.addEventListener("touchstart", play, { passive: true });
    const onVisible = () => !document.hidden && play();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      reduced.removeEventListener("change", apply);
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("touchstart", play);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <div
      ref={wrap}
      className={className}
      style={style}
      aria-hidden
      dangerouslySetInnerHTML={{
        __html:
          '<video class="poster-video h-full w-full" muted autoplay loop playsinline webkit-playsinline preload="auto" poster="/cartaz.jpg">' +
          '<source src="/cartaz.mp4" type="video/mp4"><source src="/cartaz.webm" type="video/webm"></video>',
      }}
    />
  );
}
