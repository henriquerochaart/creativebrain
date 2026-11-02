"use client";

import { cn } from "@/lib/utils";
import { useT } from "./lang-provider";

/**
 * Skeleton screens: while a page renders on the server, the tab shows its real title and the shape
 * of what is coming (cards, rows, pills) in fill, with a light sweep (`.skeleton` in globals.css).
 * Each tab's `loading.tsx` uses one, so a tap answers at once; Next prefetches them with the tab
 * bar's links. Screens without one fall back to Brain in love (`app/loading.tsx`).
 */
function Bone({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[10px]", className)} />;
}

function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  const d = useT();
  return (
    <div role="status" aria-busy aria-label={d.app.loading} className={className}>
      {children}
    </div>
  );
}

/** Varied heights, so the masonry reads as pictures rather than a table. */
const SHAPES = ["aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[9/16]", "aspect-[4/3]", "aspect-[3/4]", "aspect-square", "aspect-[4/5]"];

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="masonry">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mb-6 break-inside-avoid">
          <Bone className={cn("w-full rounded-[22px]", SHAPES[i % SHAPES.length])} />
          <Bone className="mt-2.5 h-3 w-16" />
          <Bone className="mt-1.5 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  const d = useT();
  return (
    <Screen className="space-y-9">
      <h1 className="large-title mb-5">{d.app.short}</h1>
      <div className="hidden h-[120px] lg:block">
        <Bone className="h-full rounded-[22px]" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {["w-28", "w-32", "w-24", "w-32", "w-28"].map((w, i) => (
          <Bone key={i} className={cn("h-11 shrink-0 rounded-full", w)} />
        ))}
      </div>
      <Bone className="h-16 rounded-[20px]" />
      <section>
        <h2 className="title-2">{d.home.recent}</h2>
        <div className="mt-3 flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="w-[150px] shrink-0 sm:w-[172px]">
              <Bone className="aspect-[3/4] w-full rounded-[20px]" />
              <Bone className="mt-2.5 h-3 w-14" />
              <Bone className="mt-1.5 h-4 w-28" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="title-2">{d.home.categories}</h2>
        <div className="mt-3 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex w-[80px] shrink-0 flex-col items-center gap-2">
              <Bone className="h-[76px] w-[76px] rounded-full" />
              <Bone className="h-3 w-12" />
            </div>
          ))}
        </div>
      </section>
    </Screen>
  );
}

export function SearchSkeleton() {
  const d = useT();
  return (
    <Screen className="space-y-8">
      <header>
        <h1 className="large-title">{d.tabs.search}</h1>
        <Bone className="mt-3 h-11 w-full lg:h-10 lg:max-w-xl" />
      </header>
      <GridSkeleton />
    </Screen>
  );
}

export function CollectionsSkeleton() {
  const d = useT();
  return (
    <Screen className="space-y-8">
      <h1 className="large-title">{d.collections.title}</h1>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <Bone className="aspect-square w-full rounded-[22px]" />
            <Bone className="mx-1 mt-2.5 h-4 w-3/5" />
            <Bone className="mx-1 mt-1.5 h-3 w-2/5" />
          </div>
        ))}
      </div>
    </Screen>
  );
}

export function SettingsSkeleton() {
  const d = useT();
  return (
    <Screen className="mx-auto max-w-2xl space-y-4">
      <h1 className="large-title mb-6">{d.settings.title}</h1>
      <div className="overflow-hidden rounded-[22px] bg-paper-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 pl-4">
            <Bone className="h-9 w-9 rounded-[10px]" />
            <span className={cn("flex min-h-14 flex-1 items-center pr-4", i > 0 && "border-t border-line")}>
              <Bone className="h-4" />
            </span>
          </div>
        ))}
      </div>
      <Bone className="h-[76px] rounded-[22px]" />
      <Bone className="h-40 rounded-[22px]" />
    </Screen>
  );
}

/** A titled masonry: Recentes, Salvos, or a collection whose name is not known yet (a bone). */
export function GallerySkeleton({ title }: { title?: "recent" | "saved" }) {
  const d = useT();
  return (
    <Screen className="space-y-6">
      {title ? <h1 className="large-title">{title === "recent" ? d.home.recent : d.saved.title}</h1> : <Bone className="h-10 w-56" />}
      <GridSkeleton count={12} />
    </Screen>
  );
}

export function ReferenceSkeleton() {
  return (
    <Screen className="mx-auto max-w-5xl space-y-8">
      <Bone className="aspect-[4/3] w-full rounded-[22px] sm:aspect-video" />
      <div className="space-y-3">
        <Bone className="h-3 w-24" />
        <Bone className="h-8 w-4/5" />
        <div className="flex gap-2 pt-2">
          <Bone className="h-11 w-28 rounded-full lg:h-9" />
          <Bone className="h-11 w-24 rounded-full lg:h-9" />
          <Bone className="h-11 w-24 rounded-full lg:h-9" />
        </div>
      </div>
      <div className="space-y-2.5">
        <Bone className="h-3 w-20" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-11/12" />
        <Bone className="h-4 w-3/4" />
      </div>
    </Screen>
  );
}
