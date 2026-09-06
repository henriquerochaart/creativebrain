import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Badge({ className, children, href, tone = "neutral" }: { className?: string; children: React.ReactNode; href?: string; tone?: "neutral" | "accent" | "outline" }) {
  const cls = cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-5 whitespace-nowrap",
    tone === "neutral" && "bg-paper-2 text-ink-2",
    tone === "accent" && "bg-accent/10 text-accent",
    tone === "outline" && "border border-line text-ink-2",
    href && "hover:bg-line transition-colors",
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
