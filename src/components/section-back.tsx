"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { parentOf } from "@/lib/sections";
import { useT } from "./lang-provider";

/**
 * The iOS back button for screens reached from a tab (Recentes from Início, Inbox from Settings,
 * Saved from Collections). A phone has no header and no drawer, so without it the only way back
 * would be the tab bar. Hidden at lg, where the sidebar is always there.
 */
export function SectionBack() {
  const pathname = usePathname();
  const d = useT();
  const parent = parentOf(pathname);
  if (!parent) return null;
  return (
    <Link href={parent} className="-ml-1.5 mb-1 inline-flex min-h-11 items-center gap-0.5 text-[17px] text-accent-ink hover:opacity-70 lg:hidden">
      <ChevronLeft className="h-6 w-6" strokeWidth={2.25} /> {parent === "/" ? d.tabs.home : parent === "/settings" ? d.nav.settings : d.nav.collections}
    </Link>
  );
}
