"use client";

import { useEffect, useRef, useState } from "react";

/** <img> that swaps to its fallback when the source fails (expired CDN thumbnails, blocked hosts). */
export function SmartImage({ src, alt, className, sizes, fallback }: { src: string; alt: string; className?: string; sizes?: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // The <img> is in the server HTML, so it can fail before React hydrates and attaches onError;
  // that error is never replayed. Check once on mount whether it already finished with nothing.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} loading="lazy" sizes={sizes} className={className} onError={() => setFailed(true)} />;
}
