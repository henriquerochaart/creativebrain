import { withBase } from "@/lib/base-path";
import { cn } from "@/lib/utils";

/**
 * One of the app's 3D icons (public/icons/3d, from Thiings). Decorative: the label next to it says
 * what it is, so it stays out of the accessibility tree. Sized by the caller (h-*, w-*).
 */
export function Thing({ name, className }: { name: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={withBase(`/icons/3d/${name}.webp`)} alt="" aria-hidden width={256} height={256} decoding="async" draggable={false} className={cn("inline-block shrink-0 select-none object-contain", className)} />
  );
}
