import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Badge({ className, children, href, tone = "neutral" }: { className?: string; children: React.ReactNode; href?: string; tone?: "neutral" | "accent" | "outline" }) {
  const cls = cn(
    // Chips as fills, never outlines: gray for facets, tinted for the brand.
    "inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium leading-5 whitespace-nowrap",
    tone === "neutral" && "bg-fill text-ink",
    tone === "accent" && "bg-accent/12 text-accent",
    tone === "outline" && "bg-fill text-ink-2",
    href && "hover:bg-fill-2 transition-colors",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}
