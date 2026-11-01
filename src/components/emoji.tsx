"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { emojiCandidates } from "@/lib/emoji";

/**
 * An emoji drawn as Apple's artwork on every platform, so Android and Windows readers see the same
 * pictures an iPhone does. Images come from the emoji-datasource-apple package on jsDelivr, pinned.
 * Its file names are the fully-qualified code points (🖼️ is 1f5bc-fe0f), while a typed emoji may
 * lack the FE0F selector, so a missing file retries with and without it before falling back to the
 * plain character.
 *
 * Apple's emoji artwork is copyright Apple and not licensed for commercial use outside Apple
 * platforms; this app is a personal, non-commercial tool. Do not reuse this in client work.
 */
export function Emoji({ char, className, label }: { char: string; className?: string; label?: string }) {
  const candidates = emojiCandidates(char);
  const [i, setI] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  // Server-rendered, the <img> can fail before hydration attaches onError; check once on mount.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setI((n) => n + 1);
  }, [i]);
  if (!candidates.length) return null;
  if (i >= candidates.length) return <span className={className}>{char}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={candidates[i]}
      alt={label ?? char}
      aria-hidden={label ? undefined : true}
      draggable={false}
      decoding="async"
      onError={() => setI((n) => n + 1)}
      className={cn("inline-block h-[1.15em] w-[1.15em] shrink-0 select-none align-[-0.2em]", className)}
    />
  );
}
