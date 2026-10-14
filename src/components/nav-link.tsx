"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * A sidebar row as iPadOS/macOS draws it: a tinted symbol, the label in label color, a count
 * trailing in secondary. The current page gets a filled selection. 44pt tall in the touch drawer,
 * denser at lg where a pointer is the norm.
 */
export function NavLink({ href, label, icon, count, accent }: { href: string; label: string; icon?: React.ReactNode; count?: number; accent?: boolean }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2.5 rounded-[10px] px-2.5 text-[15px] transition-colors lg:min-h-8 lg:text-[13px]",
        active ? "bg-fill-2 font-semibold text-ink" : "text-ink hover:bg-fill",
      )}
    >
      {icon && <span className="grid w-5 shrink-0 place-items-center text-accent [&_svg]:h-[18px] [&_svg]:w-[18px] lg:[&_svg]:h-4 lg:[&_svg]:w-4">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && <span className={cn("shrink-0 tabular-nums", accent ? "font-semibold text-accent" : "text-ink-3")}>{count}</span>}
    </Link>
  );
}
