"use client";

import { useEffect, useRef } from "react";

/**
 * The poster's animated collage, looping and muted. With Reduce Motion on it stays on its first
 * frame; iOS Low Power Mode blocks autoplay on its own and shows the same still.
 */
export function PosterVideo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (query.matches) video.pause();
      else void video.play().catch(() => undefined);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return (
    <video
      ref={ref}
      className={className}
      style={style}
      poster="/cartaz.jpg"
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      aria-hidden
    >
      {/* H.264 plays everywhere that matters; VP9 covers Chromium builds without proprietary codecs. */}
      <source src="/cartaz.mp4" type="video/mp4" />
      <source src="/cartaz.webm" type="video/webm" />
    </video>
  );
}
