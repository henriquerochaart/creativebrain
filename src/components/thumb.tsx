import { cn } from "@/lib/utils";
import { SmartImage } from "./smart-image";
import type { Lang } from "@/lib/i18n";
import type { PublicReference } from "@/server/references";

const PLACEHOLDER_TONES: Record<string, string> = {
  instagram: "from-pink-200 to-orange-100 dark:from-pink-900/40 dark:to-orange-900/30",
  tiktok: "from-zinc-200 to-cyan-100 dark:from-zinc-800 dark:to-cyan-900/30",
  youtube: "from-red-100 to-zinc-100 dark:from-red-900/30 dark:to-zinc-800",
  pdf: "from-amber-100 to-zinc-100 dark:from-amber-900/30 dark:to-zinc-800",
  text: "from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900",
  website: "from-sky-100 to-zinc-100 dark:from-sky-900/30 dark:to-zinc-800",
};

type ThumbRef = Pick<PublicReference, "thumbnailUrl" | "title" | "sourcePlatform" | "mediaType" | "content" | "ai">;

export function Thumb({ reference, className, sizes, lang = "pt" }: { reference: ThumbRef; className?: string; sizes?: string; lang?: Lang }) {
  const placeholder = <Placeholder reference={reference} className={className} lang={lang} />;
  if (reference.thumbnailUrl) {
    return <SmartImage src={reference.thumbnailUrl} alt={reference.title ?? ""} sizes={sizes} className={cn("block h-auto w-full object-cover", className)} fallback={placeholder} />;
  }
  return placeholder;
}

function Placeholder({ reference, className }: { reference: ThumbRef; className?: string; lang: Lang }) {
  const tone = PLACEHOLDER_TONES[reference.sourcePlatform] ?? "from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900";
  const excerpt = reference.mediaType === "text" ? reference.content?.pageText ?? reference.ai?.summary : reference.ai?.summary;
  // No platform label here: the card's own badge sits in this corner, and the meta line under the
  // card already names the platform. Two labels in one corner just collided.
  return (
    <div className={cn("flex aspect-[4/3] w-full flex-col justify-end bg-gradient-to-br p-4", tone, className)}>
      <p className="line-clamp-4 text-sm leading-snug text-ink-2">{excerpt ?? reference.title}</p>
    </div>
  );
}
