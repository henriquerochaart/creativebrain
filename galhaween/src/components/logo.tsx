import Image from "next/image";
import { event } from "@/config/event";
import logo from "../../public/logo.png";

/**
 * The logo cut from the party poster: transparent PNG (black turned into alpha), so it sits on any
 * dark ground. next/image serves it as WebP/AVIF at the width each screen needs.
 */
export function Logo({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <Image
      src={logo}
      alt={event.name}
      sizes={size === "sm" ? "120px" : "280px"}
      className={`${size === "sm" ? "h-9 w-auto" : "h-auto w-64"} ${className ?? ""}`}
    />
  );
}
