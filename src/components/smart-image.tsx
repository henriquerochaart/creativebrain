"use client";

import { useState } from "react";

/** <img> that swaps to its fallback when the source fails (expired CDN thumbnails, blocked hosts). */
export function SmartImage({ src, alt, className, sizes, fallback }: { src: string; alt: string; className?: string; sizes?: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" sizes={sizes} className={className} onError={() => setFailed(true)} />;
}
