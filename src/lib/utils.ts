import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Dict } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function yearOf(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function truncate(s: string | null | undefined, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function timeAgo(date: Date | string, d: Dict, locale?: string): string {
  const dt = typeof date === "string" ? new Date(date) : date;
  const diff = Math.max(0, Date.now() - dt.getTime()) / 1000;
  if (diff < 60) return d.time.justNow;
  if (diff < 3600) return d.time.minutes(Math.floor(diff / 60));
  if (diff < 86400) return d.time.hours(Math.floor(diff / 3600));
  if (diff < 86400 * 30) return d.time.days(Math.floor(diff / 86400));
  return dt.toLocaleDateString(locale);
}

/** BCP 47 tag for Intl and the html lang attribute. */
export function localeOf(lang: "pt" | "en"): string {
  return lang === "pt" ? "pt-BR" : "en";
}
