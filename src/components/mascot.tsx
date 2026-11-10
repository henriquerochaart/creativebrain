import { withBase } from "@/lib/base-path";
import { cn } from "@/lib/utils";

/**
 * Brain, the app's mascot, in one of its ten poses (public/mascot, 512px transparent WebP), each
 * tied to a moment: thinking while it understands, surprised when it already was saved, skeptical
 * when something failed, asleep on an empty list. Generated from the
 * mascot render so every pose is the same character; add poses the same way, never by drawing a
 * look-alike. Decorative: the text beside it carries the meaning.
 */
export type MascotPose =
  | "desconfiado"
  | "andando"
  | "pensando"
  | "feliz"
  | "apontando"
  | "notebook"
  | "apaixonado"
  | "oculos"
  | "surpreso"
  | "dormindo";

export function Mascot({ pose, className }: { pose: MascotPose; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={withBase(`/mascot/${pose}.webp`)} alt="" aria-hidden width={512} height={512} decoding="async" draggable={false} className={cn("mascot-art inline-block shrink-0 select-none object-contain", className)} />
  );
}
