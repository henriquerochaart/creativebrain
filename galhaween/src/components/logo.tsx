import Image from "next/image";
import logo from "../../public/logo.png";

/**
 * The logo cut from the party poster: transparent PNG (black turned into alpha), so it sits on any
 * dark ground. next/image serves it as WebP/AVIF at the width each screen needs. It does not read
 * config/event.ts on purpose: client components render it, and that file holds the unrevealed drinks.
 */
export function Logo({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <Image
      src={logo}
      alt="Galhaween"
      sizes={size === "sm" ? "120px" : "280px"}
      className={`${size === "sm" ? "h-9 w-auto" : "h-auto w-64"} ${className ?? ""}`}
    />
  );
}
