"use client";

import { withBase } from "@/lib/base-path";
import { useT } from "./lang-provider";

/**
 * The loading screen, shown while a page renders on the server (`app/loading.tsx`): Brain in
 * love, lying down, with the heart from his pose leaving his head and fading. Two layers cut from
 * the same render (public/mascot/apaixonado-corpo.webp and coracao.webp), so the heart is the one
 * that was drawn, only animated (`.heart-rise` in globals.css). Reduce Motion leaves it in place.
 */
export function BrainLoading() {
  const d = useT();
  return (
    <div role="status" aria-label={d.app.loading} className="loading-in grid min-h-[60vh] place-items-center">
      <span className="relative block h-40 w-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={withBase("/mascot/apaixonado-corpo.webp")} alt="" aria-hidden width={512} height={512} draggable={false} className="absolute inset-0 h-full w-full select-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={withBase("/mascot/coracao.webp")} alt="" aria-hidden width={512} height={512} draggable={false} className="heart-rise absolute inset-0 h-full w-full select-none" />
      </span>
    </div>
  );
}
