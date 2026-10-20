import Image from "next/image";
import { images, type ImageKey } from "@/config/images";

/** One collage block from the poster's world: a red halftone image in a thin red frame. */
export function Tile({ name, className, sizes = "(max-width: 640px) 100vw, 400px", drift = false }: { name: ImageKey; className?: string; sizes?: string; drift?: boolean }) {
  const image = images[name];
  return (
    <figure className={`tile ${className ?? ""}`}>
      <Image src={image.src} alt={image.alt} sizes={sizes} placeholder="blur" className={`h-full w-full object-cover ${drift ? "drift" : ""}`} />
    </figure>
  );
}
