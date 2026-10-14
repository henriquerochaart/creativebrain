import { FileText, Globe, ImageIcon, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartImage } from "./smart-image";
import type { Lang } from "@/lib/i18n";
import type { PublicReference } from "@/server/references";

// The content type's symbol on a neutral fill, the way Files and Photos show something with no
// preview. Video has none on purpose: the card's "▶" badge and the page's play button already say
// it, and a third play glyph underneath would just stack. Text shows its own words instead.
const TYPE_SYMBOL: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  pdf: FileText,
  image: ImageIcon,
  website: Globe,
};

type ThumbRef = Pick<PublicReference, "thumbnailUrl" | "title" | "sourcePlatform" | "mediaType" | "content">;

export function Thumb({ reference, className, sizes, lang = "pt" }: { reference: ThumbRef; className?: string; sizes?: string; lang?: Lang }) {
  const placeholder = <Placeholder reference={reference} className={className} lang={lang} />;
  if (reference.thumbnailUrl) {
    return <SmartImage src={reference.thumbnailUrl} alt={reference.title ?? ""} sizes={sizes} className={cn("block h-auto w-full object-cover", className)} fallback={placeholder} />;
  }
  return placeholder;
}

function Placeholder({ reference, className }: { reference: ThumbRef; className?: string; lang: Lang }) {
  // A text idea has no image because its words are the material, so those words stand in for one.
  // Nothing else does: the model's summary is generated, and painting it over the frame turns a
  // reference into a caption. Every caller prints the title right below, so the rest stays quiet.
  const excerpt = reference.mediaType === "text" ? reference.content?.pageText : null;
  const Symbol = reference.mediaType === "video" || reference.mediaType === "text" ? null : TYPE_SYMBOL[reference.mediaType] ?? Link2;
  // No platform label here: the card's own badge sits in this corner, and the meta line under the
  // card already names the platform. Two labels in one corner just collided.
  return (
    <div className={cn("flex aspect-[4/3] w-full flex-col bg-fill p-5", excerpt ? "justify-end" : "items-center justify-center", className)}>
      {excerpt ? (
        <p className="line-clamp-5 text-[17px] leading-[22px] text-ink">{excerpt}</p>
      ) : Symbol ? (
        <Symbol className="h-10 w-10 text-ink-3" strokeWidth={1.5} />
      ) : null}
    </div>
  );
}
