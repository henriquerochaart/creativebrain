import { cn, platformLabel } from "@/lib/utils";
import type { PublicReference } from "@/server/references";

const PLACEHOLDER_TONES: Record<string, string> = {
  instagram: "from-pink-200 to-orange-100 dark:from-pink-900/40 dark:to-orange-900/30",
  tiktok: "from-zinc-200 to-cyan-100 dark:from-zinc-800 dark:to-cyan-900/30",
  youtube: "from-red-100 to-zinc-100 dark:from-red-900/30 dark:to-zinc-800",
  pdf: "from-amber-100 to-zinc-100 dark:from-amber-900/30 dark:to-zinc-800",
  text: "from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900",
  website: "from-sky-100 to-zinc-100 dark:from-sky-900/30 dark:to-zinc-800",
};

export function Thumb({ reference, className, sizes }: { reference: Pick<PublicReference, "thumbnailUrl" | "title" | "sourcePlatform" | "mediaType" | "content" | "ai">; className?: string; sizes?: string }) {
  if (reference.thumbnailUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={reference.thumbnailUrl} alt={reference.title ?? ""} loading="lazy" sizes={sizes} className={cn("block h-auto w-full object-cover", className)} />;
  }
  const tone = PLACEHOLDER_TONES[reference.sourcePlatform] ?? "from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900";
  const excerpt = reference.mediaType === "text" ? reference.content?.pageText ?? reference.ai?.summary : reference.ai?.summary;
  return (
    <div className={cn("flex aspect-[4/3] w-full flex-col justify-between bg-gradient-to-br p-4", tone, className)}>
      <span className="eyebrow">{platformLabel(reference.sourcePlatform)}</span>
      <p className="line-clamp-4 text-sm leading-snug text-ink-2">{excerpt ?? reference.title}</p>
    </div>
  );
}
